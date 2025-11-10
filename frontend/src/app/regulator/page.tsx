'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShieldCheckIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  DocumentMagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { ComplianceStatus } from '@/lib/types'

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

type TabType = 'audit' | 'violations' | 'investigation' | 'compliance'

interface ControllerInfo {
  id: string
  name: string
  complianceScore: number
  totalConsents: number
  lastAudit: string
}

interface Violation {
  id: string
  controllerId: string
  controllerName: string
  articleViolated: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  detectedAt: string
  status: 'open' | 'investigating' | 'resolved'
}

export default function RegulatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('audit')
  const [controllers, setControllers] = useState<ControllerInfo[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [controllerHash, setControllerHash] = useState<string>('')
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null)
  const [report, setReport] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [isRegulator, setIsRegulator] = useState(false)

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (!token || !userStr) {
        setSignedIn(false)
        setIsRegulator(false)
        return
      }

      try {
        const user = JSON.parse(userStr)
        setSignedIn(true)
        setIsRegulator(user.role === 'regulator')

        if (user.role === 'regulator') {
          await loadAuditData()
          await loadViolations()
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
        setSignedIn(false)
        setIsRegulator(false)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    init()
  }, [])

  const loadAuditData = async () => {
    try {
      const response = await api.get('/controllers/all')
      setControllers(response.data.controllers || [])
    } catch (error) {
      console.error('Failed to load controllers:', error)
      setControllers([])
    }
  }

  const loadViolations = async () => {
    const mockViolations: Violation[] = [
      {
        id: 'v1',
        controllerId: 'ctrl_io_org_001',
        controllerName: 'Demo Organization IO',
        articleViolated: 'Article 7',
        severity: 'high',
        description: 'Consent obtained without clear affirmative action',
        detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'investigating'
      },
      {
        id: 'v2',
        controllerId: 'ctrl_de9a42acbfd5e5fba38627114e458bf3',
        controllerName: 'Demo Corporation',
        articleViolated: 'Article 17',
        severity: 'critical',
        description: 'Data erasure request not processed within 30 days',
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'open'
      },
      {
        id: 'v3',
        controllerId: 'ctrl_io_org_001',
        controllerName: 'Demo Organization IO',
        articleViolated: 'Article 13',
        severity: 'medium',
        description: 'Privacy notice not provided at data collection time',
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'resolved'
      }
    ]
    setViolations(mockViolations)
  }

  const loadCompliance = async () => {
    if (!controllerHash) return
    
    setLoading(true)
    try {
      const [statusRes, reportRes] = await Promise.all([
        api.get(`/compliance/status/${controllerHash}`),
        api.get(`/compliance/report/${controllerHash}`)
      ])
      setCompliance(statusRes.data)
      setReport(reportRes.data)
    } catch (error) {
      console.error('Failed to load compliance status:', error)
      alert('Failed to load compliance status')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleSignIn = () => {
    window.location.href = '/login'
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low': return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500/20 text-red-300'
      case 'investigating': return 'bg-yellow-500/20 text-yellow-300'
      case 'resolved': return 'bg-emerald-500/20 text-emerald-300'
      default: return 'bg-slate-500/20 text-slate-300'
    }
  }

  const tabs = [
    { id: 'audit' as TabType, name: 'Audit Overview', icon: ChartBarIcon },
    { id: 'violations' as TabType, name: 'Violation Tracking', icon: ExclamationTriangleIcon },
    { id: 'investigation' as TabType, name: 'Investigation Tools', icon: DocumentMagnifyingGlassIcon },
    { id: 'compliance' as TabType, name: 'Compliance Check', icon: ShieldCheckIcon }
  ]

  const filteredControllers = controllers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const criticalCount = violations.filter(v => v.severity === 'critical').length
  const openCount = violations.filter(v => v.status === 'open').length
  const avgCompliance = controllers.length > 0 
    ? Math.round(controllers.reduce((acc, c) => acc + c.complianceScore, 0) / controllers.length)
    : 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060A] text-slate-100">
      <BackgroundTexture />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060A]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/60 to-sky-500/60 shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
              <CheckBadgeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">consentire</p>
              <p className="text-lg font-semibold text-white">Regulator Oversight Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
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
            <p className="text-slate-300 mb-4">Sign in as a regulator to view oversight dashboard.</p>
            <button 
              onClick={handleSignIn} 
              className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
            >
              Sign in
            </button>
          </div>
        )}

        {signedIn && !isRegulator && (
          <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-8 text-center mb-6">
            <p className="text-slate-300">You must be a regulator to access this dashboard.</p>
          </div>
        )}

        {isRegulator && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-sky-500/40">
                    <ShieldCheckIcon className="h-6 w-6 text-violet-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Monitored Controllers</p>
                    <p className="text-2xl font-bold text-white">{controllers.length}</p>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/40 to-green-500/40">
                    <ChartBarIcon className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Avg Compliance</p>
                    <p className="text-2xl font-bold text-white">{avgCompliance}%</p>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/40 to-pink-500/40">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Open Violations</p>
                    <p className="text-2xl font-bold text-white">{openCount}</p>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/40 to-amber-500/40">
                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Critical Issues</p>
                    <p className="text-2xl font-bold text-white">{criticalCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
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
                {activeTab === 'audit' && (
                  <AuditOverviewTab controllers={filteredControllers} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                )}

                {activeTab === 'violations' && (
                  <ViolationTrackingTab violations={violations} />
                )}

                {activeTab === 'investigation' && (
                  <InvestigationTab controllers={controllers} />
                )}

                {activeTab === 'compliance' && (
                  <ComplianceCheckTab
                    controllerHash={controllerHash}
                    onHashChange={setControllerHash}
                    onCheck={loadCompliance}
                    loading={loading}
                    compliance={compliance}
                    report={report}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function AuditOverviewTab({ 
  controllers, 
  searchTerm, 
  onSearchChange 
}: { 
  controllers: ControllerInfo[], 
  searchTerm: string,
  onSearchChange: (value: string) => void
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Compliance Audit Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time monitoring of all registered data controllers</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search controllers by name or ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-white/10 bg-white/5 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Controllers Table */}
      <div className="border border-white/10 bg-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Controller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Compliance Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Active Consents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Last Audit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {controllers.map((controller) => (
              <tr key={controller.id} className="hover:bg-white/5 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white">{controller.name}</div>
                    <div className="text-sm text-slate-400">{controller.id}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-full bg-white/10 rounded-full h-2 w-20 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          controller.complianceScore >= 90 ? 'bg-emerald-500' :
                          controller.complianceScore >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${controller.complianceScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">{controller.complianceScore}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {controller.totalConsents.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {new Date(controller.lastAudit).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    controller.complianceScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 
                    controller.complianceScore >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {controller.complianceScore >= 80 ? 'Compliant' : 
                     controller.complianceScore >= 60 ? 'Under Review' : 'Non-Compliant'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ViolationTrackingTab({ violations }: { violations: Violation[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low': return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500/20 text-red-300'
      case 'investigating': return 'bg-yellow-500/20 text-yellow-300'
      case 'resolved': return 'bg-emerald-500/20 text-emerald-300'
      default: return 'bg-slate-500/20 text-slate-300'
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">GDPR Violation Tracking</h2>
        <p className="text-sm text-slate-400 mt-1">Monitor and investigate potential compliance violations</p>
      </div>

      {/* Violation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4">
          <p className="text-sm text-red-300 font-medium mb-1">Critical Violations</p>
          <p className="text-3xl font-bold text-red-200">
            {violations.filter(v => v.severity === 'critical').length}
          </p>
        </div>
        <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-xl p-4">
          <p className="text-sm text-yellow-300 font-medium mb-1">Under Investigation</p>
          <p className="text-3xl font-bold text-yellow-200">
            {violations.filter(v => v.status === 'investigating').length}
          </p>
        </div>
        <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-4">
          <p className="text-sm text-emerald-300 font-medium mb-1">Resolved This Month</p>
          <p className="text-3xl font-bold text-emerald-200">
            {violations.filter(v => v.status === 'resolved').length}
          </p>
        </div>
      </div>

      {/* Violations List */}
      <div className="space-y-4">
        {violations.map((violation) => (
          <div key={violation.id} className={`border-2 rounded-xl p-6 bg-white/5 ${getSeverityColor(violation.severity)}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getSeverityColor(violation.severity)}`}>
                    {violation.severity}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(violation.status)}`}>
                    {violation.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  GDPR {violation.articleViolated} Violation
                </h3>
                <p className="text-sm text-slate-300 mb-2">{violation.description}</p>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <span><strong className="text-slate-300">Controller:</strong> {violation.controllerName}</span>
                  <span><strong className="text-slate-300">Detected:</strong> {new Date(violation.detectedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
                Investigate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvestigationTab({ controllers }: { controllers: ControllerInfo[] }) {
  const [forensicSearch, setForensicSearch] = useState('')
  const [timelineDate, setTimelineDate] = useState('')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Investigation Tools</h2>
        <p className="text-sm text-slate-400 mt-1">Forensic search and timeline reconstruction for compliance investigations</p>
      </div>

      {/* Forensic Search */}
      <div className="border border-white/10 bg-white/5 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <MagnifyingGlassIcon className="h-6 w-6 text-violet-400" />
          <h3 className="text-lg font-semibold text-white">Forensic Search</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Search across all consent records, audit logs, and controller activities
        </p>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search by consent ID, user ID, controller hash, or transaction hash..."
            value={forensicSearch}
            onChange={(e) => setForensicSearch(e.target.value)}
            className="flex-1 px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <button className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
            Search
          </button>
        </div>
      </div>

      {/* Timeline Reconstruction */}
      <div className="border border-white/10 bg-white/5 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <ClockIcon className="h-6 w-6 text-sky-400" />
          <h3 className="text-lg font-semibold text-white">Timeline Reconstruction</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Reconstruct consent lifecycle events for specific controllers or users
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Controller
            </label>
            <select className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent">
              <option value="">Select a controller...</option>
              {controllers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Time Range
            </label>
            <input
              type="date"
              value={timelineDate}
              onChange={(e) => setTimelineDate(e.target.value)}
              className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        <button className="mt-4 w-full bg-gradient-to-r from-violet-500 to-sky-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
          Reconstruct Timeline
        </button>
      </div>

      {/* Export Tools */}
      <div className="border border-violet-500/30 bg-violet-500/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Investigation Export</h3>
        <p className="text-sm text-slate-400 mb-4">
          Export investigation data for legal proceedings or regulatory reports
        </p>
        <div className="flex space-x-4">
          <button className="flex-1 border border-white/20 bg-white/5 text-white px-4 py-2 rounded-xl font-semibold hover:bg-white/10 transition">
            Export as PDF Report
          </button>
          <button className="flex-1 border border-white/20 bg-white/5 text-white px-4 py-2 rounded-xl font-semibold hover:bg-white/10 transition">
            Export Raw Data (JSON)
          </button>
        </div>
      </div>
    </div>
  )
}

function ComplianceCheckTab({
  controllerHash,
  onHashChange,
  onCheck,
  loading,
  compliance,
  report
}: {
  controllerHash: string
  onHashChange: (value: string) => void
  onCheck: () => void
  loading: boolean
  compliance: ComplianceStatus | null
  report: any | null
}) {
  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Controller Compliance Check</h2>
        <p className="text-sm text-slate-400 mt-1">Verify GDPR compliance status for specific controllers</p>
      </div>

      {/* Compliance Search */}
      <div className="border border-white/10 bg-white/5 rounded-xl p-6 mb-6">
        <div className="flex space-x-4">
          <input
            type="text"
            value={controllerHash}
            onChange={(e) => onHashChange(e.target.value)}
            placeholder="Enter Controller Hash"
            className="flex-1 px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <button
            onClick={onCheck}
            disabled={loading || !controllerHash}
            className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-6 py-2 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)] disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Check Compliance'}
          </button>
        </div>
      </div>

      {/* Compliance Results */}
      {compliance && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="border border-white/10 bg-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Overall Compliance</h3>
              <span className={`text-3xl font-bold ${getComplianceColor(compliance.overallCompliance)}`}>
                {compliance.overallCompliance}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  compliance.overallCompliance >= 90 ? 'bg-emerald-500' :
                  compliance.overallCompliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${compliance.overallCompliance}%` }}
              />
            </div>
          </div>

          {/* GDPR Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { article: 'Article 7', title: 'Conditions for Consent', compliant: compliance.gdprArticle7 },
              { article: 'Article 12', title: 'Transparent Information', compliant: compliance.gdprArticle12 },
              { article: 'Article 13', title: 'Information Provided', compliant: compliance.gdprArticle13 },
              { article: 'Article 17', title: 'Right to Erasure', compliant: compliance.gdprArticle17 },
              { article: 'Article 20', title: 'Data Portability', compliant: compliance.gdprArticle20 },
              { article: 'Article 25', title: 'Privacy by Design', compliant: compliance.gdprArticle25 },
              { article: 'Article 30', title: 'Processing Records', compliant: compliance.gdprArticle30 }
            ].map((item) => (
              <div key={item.article} className="border border-white/10 bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-300">{item.article}</span>
                  {item.compliant ? (
                    <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <p className="text-sm text-white">{item.title}</p>
                <span className={`inline-flex mt-2 px-2 py-1 rounded text-xs font-semibold ${
                  item.compliant ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {item.compliant ? 'Compliant' : 'Non-Compliant'}
                </span>
              </div>
            ))}
          </div>

          {/* Report Details */}
          {report && (
            <div className="border border-white/10 bg-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Compliance Report</h3>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `compliance-report-${compliance.controllerHash.substring(0, 8)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="bg-gradient-to-r from-violet-500 to-sky-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-sky-600 transition shadow-[0_8px_30px_rgba(90,97,255,0.35)]"
                >
                  Download Report
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="border border-white/10 bg-white/5 p-4 rounded-xl">
                  <h4 className="font-semibold mb-2 text-white">Controller Information</h4>
                  <p className="text-slate-300"><strong className="text-slate-200">Organization:</strong> {report.controller.organizationName}</p>
                  <p className="text-slate-300"><strong className="text-slate-200">ID:</strong> {report.controller.organizationId}</p>
                </div>
                <div className="border border-white/10 bg-white/5 p-4 rounded-xl">
                  <h4 className="font-semibold mb-2 text-white">Consent Summary</h4>
                  <p className="text-slate-300"><strong className="text-slate-200">Total:</strong> {report.summary.totalConsents}</p>
                  <p className="text-slate-300"><strong className="text-slate-200">Active:</strong> {report.summary.activeConsents}</p>
                  <p className="text-slate-300"><strong className="text-slate-200">Revoked:</strong> {report.summary.revokedConsents}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
