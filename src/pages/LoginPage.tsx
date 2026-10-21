import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PRODUCT_NAME, PRODUCT_SUBTITLE, PROTOTYPE_LABEL, ROLE_LABEL } from '../lib/constants'
import { getSnapshot } from '../demo/store'
import { inputClass } from '../components/ui'
import { GovernmentTopBar, OfficialAicteHeader } from '../components/AicteBrand'
import { ShieldCheck, Lock, User, KeyRound, Building, CheckCircle2, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const { profile, login, demoPassword } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('admin@aicte.gov.in')
  const [password, setPassword] = useState(demoPassword)
  const [error, setError] = useState<string | null>(null)

  if (profile) return <Navigate to={from} replace />

  const accounts = getSnapshot().accounts
  const profiles = getSnapshot().profiles

  const handleSignIn = (loginEmail = email, loginPass = password) => {
    setError(null)
    const res = login(loginEmail, loginPass)
    if (!res.ok) {
      setError(res.error ?? 'Unable to sign in')
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col font-sans">
      {/* 1. Official Government of India Top Bar */}
      <GovernmentTopBar />

      {/* 2. Official AICTE Brand Masthead */}
      <OfficialAicteHeader />

      {/* 3. Official Portal Announcement / Sub-Header Ribbon */}
      <div className="bg-[#003366] text-white border-b-4 border-[#ff9933] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-[#ff9933] text-[#002244] font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
              {PROTOTYPE_LABEL}
            </span>
            <div>
              <p className="text-[13px] sm:text-[14px] font-bold text-white tracking-wide">
                {PRODUCT_NAME} — {PRODUCT_SUBTITLE}
              </p>
              <p className="text-[11px] text-white/80">
                Regulation Bureau · Public Grievance Redressal Cell (PGRC) · Regional Offices
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[12px] text-white/90">
            <ShieldCheck size={16} className="text-[#ffd580]" />
            <span>Authorized AICTE Officers & Staff Only</span>
          </div>
        </div>
      </div>

      {/* 4. Main Body: AICTE Login Interface */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col justify-center">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Official Context & Mandate */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-6 shadow-sm">
              <div className="flex items-center gap-2 text-[#003366] border-b border-[#e2e8f0] pb-3 mb-4">
                <Building size={20} className="text-[#003366]" />
                <h2 className="text-[18px] font-bold tracking-tight">
                  Single Window Institution Grievance Oversight
                </h2>
              </div>
              <p className="text-[14px] text-[#334155] leading-relaxed">
                The <strong>AICTE CaseSync Portal</strong> connects disparate complaint handling pipelines
                across the <strong>Regulation Bureau (RB)</strong>, <strong>Public Grievance Redressal Cell (PGRC)</strong>,
                and <strong>Regional Offices</strong> into a singular, synchronized institution-level ledger.
              </p>

              <div className="mt-5 grid sm:grid-cols-2 gap-3 text-[13px]">
                <div className="p-3 bg-[#f0f4f8] rounded-[3px] border-l-4 border-[#003366]">
                  <p className="font-bold text-[#003366]">Institution 360° Picture</p>
                  <p className="text-[#475569] text-[12px] mt-0.5">
                    Unified case history, active inquiries and pending actions indexed by AICTE Permanent ID.
                  </p>
                </div>
                <div className="p-3 bg-[#fff7ed] rounded-[3px] border-l-4 border-[#ff9933]">
                  <p className="font-bold text-[#b45309]">Cross-Bureau Overlap Engine</p>
                  <p className="text-[#475569] text-[12px] mt-0.5">
                    Vector-assisted similarity detection flags parallel investigations before contradictory action is taken.
                  </p>
                </div>
                <div className="p-3 bg-[#f0fdf4] rounded-[3px] border-l-4 border-[#16a34a]">
                  <p className="font-bold text-[#15803d]">Dynamic SLA Tracking</p>
                  <p className="text-[#475569] text-[12px] mt-0.5">
                    Category-based deadline monitoring, automated warning alerts, and escalation triggers.
                  </p>
                </div>
                <div className="p-3 bg-[#f8fafc] rounded-[3px] border-l-4 border-[#64748b]">
                  <p className="font-bold text-[#334155]">Bilateral Coordination</p>
                  <p className="text-[#475569] text-[12px] mt-0.5">
                    Bureau Heads link cases and request joint action while preserving independent file timelines.
                  </p>
                </div>
              </div>

              {/* Security Warning */}
              <div className="mt-5 flex items-start gap-2.5 p-3 bg-[#fffbeb] border border-[#fef3c7] rounded-[3px] text-[12px] text-[#92400e]">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#d97706]" />
                <p>
                  <strong>Notice:</strong> This is a secure Government of India intranet administrative
                  dashboard for Smart India Hackathon 2026. Unauthorized access attempts are monitored and recorded.
                </p>
              </div>
            </div>

            {/* Quick Demo Role Selector with Instant One-Click Login */}
            <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2 mb-3">
                <span className="text-[13px] font-bold text-[#003366] uppercase tracking-wide">
                  Quick Access: Official Demo Roles
                </span>
                <span className="text-[11px] font-semibold text-[#64748b]">
                  Default Password: <code className="bg-[#f1f5f9] px-1.5 py-0.5 rounded text-[#003366]">{demoPassword}</code>
                </span>
              </div>
              <p className="text-[12px] text-[#64748b] mb-3">
                Click any role to test role-specific workflows (permissions, assigned queues, cross-bureau transfers):
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-[12px]">
                {accounts.slice(0, 6).map((a) => {
                  const p = profiles.find((x) => x.id === a.profileId)
                  const isCurrent = email === a.email
                  return (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => {
                        setEmail(a.email)
                        setPassword(demoPassword)
                        handleSignIn(a.email, demoPassword)
                      }}
                      className={`text-left p-2.5 rounded-[3px] border transition flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'border-[#003366] bg-[#eef4fa]'
                          : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-[#003366] hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-[#003366] leading-tight">{p?.full_name}</p>
                        <p className="text-[11px] text-[#475569]">{p ? ROLE_LABEL[p.role] : ''}</p>
                        <p className="text-[10px] text-[#64748b] font-mono">{a.email}</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#003366] bg-white border border-[#cbd5e1] px-2 py-1 rounded">
                        Sign In →
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Official Login Form */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[3px] border-2 border-[#003366] shadow-md overflow-hidden">
              <div className="bg-[#003366] px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">अधिकारी लॉगिन / Staff Sign In</h3>
                  <p className="text-[12px] text-white/80">AICTE Internal Authentication System</p>
                </div>
                <Lock size={20} className="text-[#ff9933]" />
              </div>

              <form
                className="p-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSignIn()
                }}
              >
                {error ? (
                  <div className="flex items-center gap-2 p-3 bg-[#fef2f2] border border-[#fecdd3] text-[#b91c1c] text-[13px] rounded-[3px]">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div>
                  <label className="block text-[13px] font-bold text-[#003366] mb-1">
                    Official Email ID / उपयोगकर्ता नाम
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-2.5 text-[#64748b]" />
                    <input
                      className={`${inputClass} pl-9 font-sans`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@aicte.gov.in"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[13px] font-bold text-[#003366]">
                      Password / पासवर्ड
                    </label>
                    <Link to="/forgot-password" className="text-[12px] font-semibold text-[#003366] hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-2.5 text-[#64748b]" />
                    <input
                      className={`${inputClass} pl-9 font-sans`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {/* Security Verification Badge */}
                <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[3px] flex items-center justify-between text-[11px] text-[#475569]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    256-bit SSL Intranet Encrypted
                  </span>
                  <span className="bg-[#e2e8f0] px-2 py-0.5 rounded font-mono font-bold text-[#003366]">
                    CAPTCHA: VERIFIED
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold text-[14px] py-2.5 rounded-[3px] shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={18} className="text-[#ff9933]" />
                  Sign In to AICTE Portal
                </button>
              </form>

              <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-6 py-3 text-center text-[11px] text-[#64748b]">
                For portal assistance, contact AICTE Helpdesk: <span className="font-semibold text-[#003366]">1800-11-2026</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Official AICTE Government Footer */}
      <footer className="bg-[#002244] text-white/80 border-t-4 border-[#ff9933] text-[12px] mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                AICTE Head Office
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                Nelson Mandela Marg, Vasant Kunj,<br />
                New Delhi - 110070<br />
                Phone: 011-26131576-78
              </p>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Bureaus / Cells
              </p>
              <ul className="space-y-1 text-white/70 text-[12px]">
                <li>• Regulation Bureau (RB)</li>
                <li>• Public Grievance Redressal Cell (PGRC)</li>
                <li>• Approval Bureau</li>
                <li>• Regional Offices & Centers</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Compliance & Security
              </p>
              <ul className="space-y-1 text-white/70 text-[12px]">
                <li>• Government of India IT Guidelines</li>
                <li>• Role-Based Access Security (RLS)</li>
                <li>• Immutable Audit Trails</li>
                <li>• Data Protection & Confidentiality</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Project Information
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                Smart India Hackathon (SIH) 2026<br />
                Problem Statement: AICTE Regulation Bureau<br />
                Integrated Complaint Tracking Platform
              </p>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/60">
            <p>© 2026 All India Council for Technical Education (AICTE). All Rights Reserved.</p>
            <p>Designed for AICTE Internal Administration · Government of India</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
