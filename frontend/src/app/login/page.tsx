'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

// Background texture component matching homepage
function BackgroundTexture() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(56,189,248,0.08),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.08),_transparent_50%),radial-gradient(circle_at_50%_50%,_rgba(15,16,31,0.5),_rgba(5,6,10,1)_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
    </>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setErrors({})
    
    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      })

      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        const role = response.data.user.role
        if (role === 'regulator') {
          router.push('/regulator')
        } else if (role === 'controller') {
          router.push('/compliance')
        } else {
          router.push('/dashboard')
        }
      } else {
        setErrors({ general: response.data.message || 'Login failed' })
      }
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.response?.status === 401) {
        setErrors({ general: 'Invalid email or password' })
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message })
      } else {
        setErrors({ general: 'An error occurred. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = (email: string, password: string) => {
    setFormData({ email, password })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060A] text-slate-100">
      <BackgroundTexture />

      {/* Header matching homepage */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060A]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/60 to-sky-500/60 shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
              <CheckBadgeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">consentire</p>
              <p className="text-lg font-semibold text-white">GDPR consent, perfected.</p>
            </div>
          </Link>
          
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-violet-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-slate-400">
              Sign in to access your consent dashboard
            </p>
          </div>

          {/* Demo Accounts Card */}
          <div className="mb-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-5 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 mr-3">
                <svg className="h-4 w-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-violet-300">Demo Accounts for Judges</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => fillDemoCredentials('user@consentire.io', 'password123')}
                className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-200 group-hover:text-white">👥 User</span>
                  <span className="text-xs text-slate-400">user@consentire.io / password123</span>
                </div>
              </button>
              <button
                onClick={() => fillDemoCredentials('org@consentire.io', 'password123')}
                className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-200 group-hover:text-white">🏢 Controller</span>
                  <span className="text-xs text-slate-400">org@consentire.io / password123</span>
                </div>
              </button>
              <button
                onClick={() => fillDemoCredentials('regulator@consentire.io', 'password123')}
                className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-200 group-hover:text-white">🔬 Regulator</span>
                  <span className="text-xs text-slate-400">regulator@consentire.io / password123</span>
                </div>
              </button>
            </div>
          </div>

          {/* Login Form Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleLogin} className="space-y-5">
              {errors.general && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errors.general}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:bg-white/10 transition"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <KeyIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:bg-white/10 transition"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-500 to-sky-500 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-violet-600 hover:to-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_rgba(90,97,255,0.35)] hover:shadow-[0_8px_40px_rgba(90,97,255,0.45)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-violet-400 hover:text-violet-300 transition">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-violet-400 hover:text-violet-300 transition">Privacy Policy</Link>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              ConsenTide - GDPR Compliant Consent Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
