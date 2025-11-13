'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShieldCheckIcon, 
  XCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ArrowUpRightIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import {
  ConsentState,
  ConsentStatus,
  ConsentGrantRequest,
  LegalBasis
} from '@/lib/types'
import { DemoModeBanner } from '@/components/DemoModeBanner'
import {
  getPrivateKey,
  signMessage,
  createRevokeConsentMessage,
  hasSigningKeys
} from '@/lib/crypto'

type TabType = 'consents' | 'organizations' | 'settings' | 'export'

interface OrganizationData {
  id: string
  name: string
  controller_hash: string
  complianceScore: number
  totalConsents: number
  lastAudit: string
}

function BackgroundTexture() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-20 top-[-180px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.65)_0%,_rgba(5,6,10,0)_65%)] blur-3xl" />
      <div className="absolute right-[-120px] top-[-80px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.55)_0%,_rgba(5,6,10,0)_70%)] blur-3xl" />
      <div className="absolute inset-x-0 bottom-[-220px] h-[520px] bg-[radial-gradient(circle,_rgba(236,72,153,0.25)_0%,_rgba(5,6,10,0)_70%)] blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.1)_0%,_rgba(10,10,12,0)_55%)]" />
    </div>
  )
}

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('user')
  const [activeTab, setActiveTab] = useState<TabType>('consents')
  const [consents, setConsents] = useState<ConsentState[]>([])
  const [organizations, setOrganizations] = useState<OrganizationData[]>([])
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (!token || !userStr) {
        setSignedIn(false)
        return
      }

      try {
        const user = JSON.parse(userStr)
        setSignedIn(true)
        setUserId(user.id)
        setUserRole(user.role || 'user')
        
        await loadConsents()
        await loadOrganizations()
      } catch (error) {
        console.error('Failed to load user data:', error)
        setSignedIn(false)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    init()
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleEmailSignIn = () => {
    window.location.href = '/login'
  }

  const loadConsents = async () => {
    try {
      const response = await api.get(`/consent/user/me`)
      const rows = response.data.consents || []
      const mapped: ConsentState[] = rows.map((r: any) => ({
        consentId: r.consent_id,
        controllerHash: r.controller_hash,
        purposeHash: r.purpose_hash,
        status: r.status,
        grantedAt: new Date(r.granted_at).getTime(),
        expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : undefined,
        hgtpTxHash: r.hgtp_tx_hash || '',
        userId: r.user_id,
        anchoringTimestamp: r.anchoring_timestamp ? new Date(r.anchoring_timestamp).getTime() : undefined
      }))
      setConsents(mapped)
    } catch (error) {
      console.error('Failed to load consents:', error)
    }
  }

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/controllers/all')
      setOrganizations(response.data.controllers || [])
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  const handleGrantConsent = async (data: ConsentGrantRequest) => {
    setLoading(true)
    try {
      await api.post('/consent/grant', data)
      await loadConsents()
      await loadOrganizations()
      setShowGrantForm(false)
      alert('Consent granted successfully!')
    } catch (error: any) {
      alert(`Failed to grant consent: ${error.response?.data?.message || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeConsent = async (consentId: string) => {
    if (!confirm('Are you sure you want to revoke this consent?')) return
    
    setLoading(true)
    try {
      // Get private key from sessionStorage
      const privateKey = getPrivateKey()
      
      if (!privateKey || !userId) {
        alert('Cryptographic signing keys not found. Please log in again.')
        setLoading(false)
        return
      }

      // Create standardized message for signing
      const timestamp = Date.now()
      const message = createRevokeConsentMessage(consentId, userId, timestamp)

      // Sign message with Ed25519 private key
      const signatureResult = await signMessage(message, privateKey)

      // Send signed revoke request to backend
      // SECURITY: Public key is fetched from database, not sent from client
      await api.post(`/consent/revoke/${consentId}`, {
        userId,
        signature: signatureResult.signature,
        timestamp
      })
      
      await loadConsents()
      await loadOrganizations()
      alert('Consent revoked successfully! ✓ Signed with Ed25519 signature')
    } catch (error: any) {
      alert(`Failed to revoke consent: ${error.response?.data?.message || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = (format: 'json' | 'csv') => {
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      consents: consents.map(c => ({
        consentId: c.consentId,
        controllerHash: c.controllerHash,
        status: c.status,
        grantedAt: new Date(c.grantedAt).toISOString(),
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
        hgtpTxHash: c.hgtpTxHash
      })),
      organizations: organizations.map(o => ({
        id: o.id,
        name: o.name,
        complianceScore: o.complianceScore
      }))
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consentire-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const csv = [
        ['Consent ID', 'Controller Hash', 'Status', 'Granted At', 'Expires At', 'HGTP TX Hash'],
        ...consents.map(c => [
          c.consentId,
          c.controllerHash,
          c.status,
          new Date(c.grantedAt).toISOString(),
          c.expiresAt ? new Date(c.expiresAt).toISOString() : '',
          c.hgtpTxHash
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consentire-consents-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const tabs = [
    { id: 'consents' as TabType, name: 'My Consents', icon: ShieldCheckIcon },
    { id: 'organizations' as TabType, name: 'Organizations with My Data', icon: BuildingOfficeIcon },
    { id: 'settings' as TabType, name: 'Privacy Settings', icon: Cog6ToothIcon },
    { id: 'export' as TabType, name: 'Data Export', icon: ArrowDownTrayIcon }
  ]

  const userOrganizations = organizations.filter(org => 
    consents.some(c => c.controllerHash === org.controller_hash)
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060A] text-slate-100">
      <BackgroundTexture />

      <DemoModeBanner />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060A]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/60 to-sky-500/60 shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
              <CheckBadgeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">consentire</p>
              <p className="text-lg font-semibold text-white">Personal Privacy Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            {signedIn && (
              <div className="text-sm text-slate-400">
                {userId?.substring(0, 16)}...
              </div>
            )}
            {signedIn && (
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {!signedIn && (
          <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-8 text-center mb-6">
            <ShieldCheckIcon className="h-16 w-16 text-violet-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to ConsenTide</h2>
            <p className="text-slate-300 mb-6">Sign in to manage your GDPR consents with zero-knowledge privacy.</p>
            <div className="space-y-3">
              <button 
                onClick={handleEmailSignIn} 
                className="w-full bg-gradient-to-r from-violet-500 to-sky-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
              >
                Sign in to Continue
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              New user? <a href="/register" className="text-violet-400 hover:text-violet-300">Create an account</a>
            </p>
          </div>
        )}

        {signedIn && (
          <>
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] mb-6">
              <nav className="flex space-x-4 p-4 border-b border-white/10">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-violet-500/20 to-sky-500/20 text-white border border-white/10'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="p-6">
                {activeTab === 'consents' && (
                  <MyConsentsTab
                    consents={consents}
                    onRevoke={handleRevokeConsent}
                    onGrantNew={() => setShowGrantForm(true)}
                  />
                )}

                {activeTab === 'organizations' && (
                  <OrganizationsTab organizations={userOrganizations} />
                )}

                {activeTab === 'settings' && (
                  <PrivacySettingsTab />
                )}

                {activeTab === 'export' && (
                  <DataExportTab onExport={handleExportData} consents={consents} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-10 w-10 text-violet-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Active Consents</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {consents.filter(c => c.status === ConsentStatus.GRANTED).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-10 w-10 text-sky-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Organizations</p>
                    <p className="text-2xl font-bold text-slate-100">{userOrganizations.length}</p>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center">
                  <ChartBarIcon className="h-10 w-10 text-pink-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Privacy Score</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {consents.length > 0 ? Math.round((consents.filter(c => c.status === ConsentStatus.GRANTED).length / consents.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {signedIn && showGrantForm && (
          <GrantConsentForm
            userId={userId!}
            organizations={organizations}
            onSubmit={handleGrantConsent}
            onCancel={() => setShowGrantForm(false)}
            loading={loading}
          />
        )}
      </main>
    </div>
  )
}

function MyConsentsTab({ 
  consents, 
  onRevoke, 
  onGrantNew 
}: { 
  consents: ConsentState[], 
  onRevoke: (id: string) => void,
  onGrantNew: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">My Consent Permissions</h2>
          <p className="text-sm text-slate-400 mt-1">Control who has access to your personal data</p>
        </div>
        <button
          onClick={onGrantNew}
          className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-4 py-2 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition flex items-center space-x-2 shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Grant New Consent</span>
        </button>
      </div>

      {consents.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheckIcon className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">You haven't granted any consents yet.</p>
          <button
            onClick={onGrantNew}
            className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-4 py-2 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
          >
            Grant Your First Consent
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {consents.map((consent) => (
            <ConsentCard
              key={consent.consentId}
              consent={consent}
              onRevoke={onRevoke}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrganizationsTab({ organizations }: { organizations: OrganizationData[] }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Organizations with Your Data</h2>
        <p className="text-sm text-slate-400 mt-1">View all organizations that have been granted access to your personal information</p>
      </div>

      {organizations.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No organizations have access to your data yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {organizations.map((org) => (
            <div key={org.id} className="border border-white/10 bg-white/5 rounded-xl p-6 hover:bg-white/10 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">{org.name}</h3>
                  <div className="space-y-1 text-sm text-slate-400">
                    <p><strong className="text-slate-300">Organization ID:</strong> {org.id}</p>
                    <p><strong className="text-slate-300">Active Consents:</strong> {org.totalConsents}</p>
                    <p><strong className="text-slate-300">Last Audit:</strong> {new Date(org.lastAudit).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    org.complianceScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    org.complianceScore >= 70 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {org.complianceScore}% Compliant
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrivacySettingsTab() {
  const [autoRevoke, setAutoRevoke] = useState(() => {
    const saved = localStorage.getItem('privacy_auto_revoke')
    return saved ? JSON.parse(saved) : true
  })
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('privacy_notifications')
    return saved ? JSON.parse(saved) : true
  })
  const [dataRetention, setDataRetention] = useState(() => {
    const saved = localStorage.getItem('privacy_data_retention')
    return saved || '1year'
  })

  const saveSettings = () => {
    localStorage.setItem('privacy_auto_revoke', JSON.stringify(autoRevoke))
    localStorage.setItem('privacy_notifications', JSON.stringify(notifications))
    localStorage.setItem('privacy_data_retention', dataRetention)
    alert('Privacy settings saved successfully!')
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Privacy Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure your privacy preferences and data management options</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border border-white/10 bg-white/5 rounded-xl">
          <div>
            <h3 className="font-semibold text-slate-100">Auto-Revoke Expired Consents</h3>
            <p className="text-sm text-slate-400">Automatically revoke consents when they expire</p>
          </div>
          <button
            onClick={() => setAutoRevoke(!autoRevoke)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              autoRevoke ? 'bg-gradient-to-r from-violet-500 to-sky-500' : 'bg-white/10 border border-white/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                autoRevoke ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-white/10 bg-white/5 rounded-xl">
          <div>
            <h3 className="font-semibold text-slate-100">Consent Change Notifications</h3>
            <p className="text-sm text-slate-400">Receive alerts when organizations access your data</p>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              notifications ? 'bg-gradient-to-r from-violet-500 to-sky-500' : 'bg-white/10 border border-white/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="p-4 border border-white/10 bg-white/5 rounded-xl">
          <h3 className="font-semibold text-slate-100 mb-3">Default Data Retention Period</h3>
          <p className="text-sm text-slate-400 mb-4">Set how long organizations can keep your data by default</p>
          <select
            value={dataRetention}
            onChange={(e) => setDataRetention(e.target.value)}
            className="w-full px-4 py-2 border border-white/10 bg-white/5 text-slate-100 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 backdrop-blur"
          >
            <option value="3months">3 Months</option>
            <option value="6months">6 Months</option>
            <option value="1year">1 Year</option>
            <option value="2years">2 Years</option>
            <option value="indefinite">Indefinite (Until Revoked)</option>
          </select>
        </div>

        <div className="pt-4">
          <button 
            onClick={saveSettings}
            className="w-full bg-gradient-to-r from-violet-500 to-sky-500 text-white px-4 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
          >
            Save Privacy Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function DataExportTab({ 
  onExport, 
  consents 
}: { 
  onExport: (format: 'json' | 'csv') => void,
  consents: ConsentState[]
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Data Export Tools</h2>
        <p className="text-sm text-slate-400 mt-1">Download your consent records and exercise your GDPR data portability rights</p>
      </div>

      <div className="space-y-6">
        <div className="border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-transparent rounded-xl p-6 backdrop-blur">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-6 w-6 text-violet-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-violet-300 mb-2">GDPR Article 20: Right to Data Portability</h3>
              <p className="text-sm text-slate-300">
                You have the right to receive your personal data in a structured, commonly used, and machine-readable format.
                Export your consent records below to exercise this right.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onExport('json')}
            className="p-6 border border-white/10 bg-white/5 rounded-xl hover:border-violet-500/50 hover:bg-white/10 transition text-left backdrop-blur group"
          >
            <DocumentTextIcon className="h-10 w-10 text-violet-400 mb-3 group-hover:text-violet-300 transition" />
            <h3 className="font-semibold text-slate-100 mb-2">Export as JSON</h3>
            <p className="text-sm text-slate-400">Machine-readable format for developer integration</p>
            <div className="mt-4 flex items-center text-sm text-violet-400 font-medium">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Download JSON
            </div>
          </button>

          <button
            onClick={() => onExport('csv')}
            className="p-6 border border-white/10 bg-white/5 rounded-xl hover:border-sky-500/50 hover:bg-white/10 transition text-left backdrop-blur group"
          >
            <DocumentTextIcon className="h-10 w-10 text-sky-400 mb-3 group-hover:text-sky-300 transition" />
            <h3 className="font-semibold text-slate-100 mb-2">Export as CSV</h3>
            <p className="text-sm text-slate-400">Spreadsheet format for Excel and data analysis</p>
            <div className="mt-4 flex items-center text-sm text-sky-400 font-medium">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Download CSV
            </div>
          </button>
        </div>

        <div className="border border-white/10 bg-white/5 rounded-xl p-6 backdrop-blur">
          <h3 className="font-semibold text-slate-100 mb-4">Export Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Total Consents</p>
              <p className="text-2xl font-bold text-slate-100">{consents.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Active Consents</p>
              <p className="text-2xl font-bold text-emerald-400">
                {consents.filter(c => c.status === ConsentStatus.GRANTED).length}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Revoked Consents</p>
              <p className="text-2xl font-bold text-red-400">
                {consents.filter(c => c.status === ConsentStatus.REVOKED).length}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Expired Consents</p>
              <p className="text-2xl font-bold text-amber-400">
                {consents.filter(c => c.status === ConsentStatus.EXPIRED).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConsentCard({
  consent,
  onRevoke
}: {
  consent: ConsentState,
  onRevoke: (id: string) => void
}) {
  const getStatusIcon = (status: ConsentStatus) => {
    switch (status) {
      case ConsentStatus.GRANTED:
        return <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
      case ConsentStatus.REVOKED:
        return <XCircleIcon className="h-6 w-6 text-red-400" />
      case ConsentStatus.EXPIRED:
        return <ClockIcon className="h-6 w-6 text-amber-400" />
      default:
        return <ClockIcon className="h-6 w-6 text-slate-500" />
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="border border-white/10 bg-white/5 backdrop-blur rounded-xl p-6 hover:bg-white/10 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-3">
            {getStatusIcon(consent.status)}
            <span className="font-semibold text-slate-100 capitalize">{consent.status}</span>
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <p><strong className="text-slate-300">Consent ID:</strong> {consent.consentId?.substring(0, 16) || 'N/A'}...</p>
            <p><strong className="text-slate-300">Controller Hash:</strong> {consent.controllerHash?.substring(0, 16) || 'N/A'}...</p>
            <p><strong className="text-slate-300">Purpose Hash:</strong> {consent.purposeHash?.substring(0, 16) || 'N/A'}...</p>
            <p><strong className="text-slate-300">Granted:</strong> {formatDate(consent.grantedAt)}</p>
            {consent.expiresAt && (
              <p><strong className="text-slate-300">Expires:</strong> {formatDate(consent.expiresAt)}</p>
            )}
            {consent.hgtpTxHash && (
              <div className="flex items-center gap-2 mt-3 p-2 border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-transparent rounded-xl backdrop-blur">
                <DocumentTextIcon className="h-4 w-4 text-violet-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-violet-300 mb-0.5">Blockchain Anchored</p>
                  <a 
                    href={`https://digitalevidence.constellationnetwork.io/fingerprint/${consent.hgtpTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-mono truncate block flex items-center gap-1"
                    title={`View on Digital Evidence Explorer: ${consent.hgtpTxHash}`}
                  >
                    {consent.hgtpTxHash.substring(0, 20)}...
                    <ArrowUpRightIcon className="h-3 w-3 flex-shrink-0" />
                  </a>
                  {consent.anchoringTimestamp && (
                    <p className="text-xs text-slate-500 mt-1">
                      Anchored: {formatDate(consent.anchoringTimestamp)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {consent.status === ConsentStatus.GRANTED && (
          <button
            onClick={() => onRevoke(consent.consentId)}
            className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-red-600 hover:to-pink-600 transition shadow-[0_8px_30px_rgba(239,68,68,0.35)]"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  )
}

function GrantConsentForm({ 
  userId,
  organizations,
  onSubmit, 
  onCancel, 
  loading 
}: { 
  userId: string,
  organizations: OrganizationData[],
  onSubmit: (data: ConsentGrantRequest) => void,
  onCancel: () => void,
  loading: boolean
}) {
  const [formData, setFormData] = useState({
    controllerId: '',
    purpose: '',
    dataCategories: [] as string[],
    lawfulBasis: LegalBasis.CONSENT,
    expiresAt: ''
  })

  const availableCategories = [
    { id: 'email', label: 'Email Address', description: 'Your email for communications' },
    { id: 'name', label: 'Full Name', description: 'Your first and last name' },
    { id: 'phone', label: 'Phone Number', description: 'Contact phone number' },
    { id: 'address', label: 'Physical Address', description: 'Your mailing address' },
    { id: 'usage_data', label: 'Usage Data', description: 'How you use our services' },
    { id: 'device_info', label: 'Device Info', description: 'Browser and device details' },
    { id: 'location', label: 'Location Data', description: 'Geographic location' },
    { id: 'payment', label: 'Payment Info', description: 'Billing and payment details' }
  ]

  const toggleCategory = (categoryId: string) => {
    if (formData.dataCategories.includes(categoryId)) {
      setFormData({
        ...formData,
        dataCategories: formData.dataCategories.filter(id => id !== categoryId)
      })
    } else {
      setFormData({
        ...formData,
        dataCategories: [...formData.dataCategories, categoryId]
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.dataCategories.length === 0) {
      alert('Please select at least one data category')
      return
    }
    onSubmit({
      userId,
      controllerId: formData.controllerId,
      purpose: formData.purpose,
      dataCategories: formData.dataCategories,
      lawfulBasis: formData.lawfulBasis,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
      signature: `sig_${Date.now()}`
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border border-white/10 bg-[#05060A]/95 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Grant New Consent</h2>
        <p className="text-sm text-slate-400 mb-6">Select the organization and data you want to share</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Organization <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={formData.controllerId}
              onChange={(e) => setFormData({ ...formData, controllerId: e.target.value })}
              className="w-full px-3 py-2.5 border border-white/10 bg-white/5 text-slate-100 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 backdrop-blur"
            >
              <option value="">Select an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.controller_hash}>
                  {org.name} ({org.complianceScore}% compliant)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Choose the organization requesting your data</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Purpose <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-3 py-2.5 border border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 backdrop-blur"
              rows={3}
              placeholder="e.g., Product Analytics, Marketing Communications, Account Management"
            />
            <p className="text-xs text-slate-500 mt-1">Why is this data being collected?</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Data Categories <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableCategories.map((category) => (
                <label
                  key={category.id}
                  className={`flex items-start p-3 border rounded-xl cursor-pointer transition ${
                    formData.dataCategories.includes(category.id)
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.dataCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50 focus:ring-2"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-slate-200">{category.label}</div>
                    <div className="text-xs text-slate-500">{category.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Selected: {formData.dataCategories.length > 0 
                ? formData.dataCategories.join(', ') 
                : 'None'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Lawful Basis <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.lawfulBasis}
              onChange={(e) => setFormData({ ...formData, lawfulBasis: e.target.value as LegalBasis })}
              className="w-full px-3 py-2.5 border border-white/10 bg-white/5 text-slate-100 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 backdrop-blur"
            >
              <option value={LegalBasis.CONSENT}>Consent (I agree to share this data)</option>
              <option value={LegalBasis.LEGITIMATE_INTERESTS}>Legitimate Interest (Required for service)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Legal basis for data processing under GDPR</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Expiration Date <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-3 py-2.5 border border-white/10 bg-white/5 text-slate-100 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 backdrop-blur"
            />
            <p className="text-xs text-slate-500 mt-1">When should this consent automatically expire?</p>
          </div>

          <div className="flex space-x-4 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-violet-500 to-sky-500 text-white px-4 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition disabled:opacity-50 shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Granting Consent...
                </span>
              ) : '✓ Grant Consent'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-white/10 bg-white/5 text-slate-300 px-4 py-3 rounded-xl font-semibold hover:bg-white/10 hover:text-white transition backdrop-blur"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
