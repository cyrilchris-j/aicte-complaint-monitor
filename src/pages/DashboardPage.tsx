import { useState, useSyncExternalStore, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { dashboardStats, getSnapshot, subscribe, visibleCases } from '../demo/store'
import { KPICard, PageHeader, StatusBadge } from '../components/ui'
import { formatDate, slaState } from '../lib/utils'
import { ROLE_LABEL } from '../lib/constants'
import type { Profile } from '../types'
import {
  ShieldCheck,
  Lock,
  UserCheck,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react'

const PIE_COLORS = ['#003366', '#0284c7', '#64748b', '#b45309', '#15803d', '#b91c1c']


export function DashboardPage() {
  const { profile, login, demoPassword } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const navigate = useNavigate()

  // Selected official for individual authentication modal (Section 12 flow)
  const [selectedOfficial, setSelectedOfficial] = useState<Profile | null>(null)
  const [authPassword, setAuthPassword] = useState(demoPassword)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

  if (!profile) return null

  const stats = dashboardStats(profile)
  const cases = visibleCases(profile)

  const recent = cases
    .slice()
    .sort((a, b) => b.last_action_date.localeCompare(a.last_action_date))
    .slice(0, 8)

  const escalatedCount = cases.filter((c) => c.status === 'ESCALATED').length
  const thisMonthCount = cases.filter((c) => c.received_date.startsWith('2026-10')).length

  // 1. Case Status Distribution
  const pie = [
    { name: 'New', value: stats.byStatus.NEW ?? 0 },
    { name: 'Under Review', value: stats.byStatus.UNDER_REVIEW ?? 0 },
    { name: 'Under Process', value: stats.byStatus.UNDER_PROCESS ?? 0 },
    { name: 'Pending Info', value: stats.byStatus.PENDING_INFORMATION ?? 0 },
    { name: 'Disposed/Closed', value: (stats.byStatus.DISPOSED ?? 0) + (stats.byStatus.CLOSED ?? 0) },
    { name: 'Escalated', value: stats.byStatus.ESCALATED ?? 0 },
  ]

  // 2. Category Distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    cases.forEach((c) => {
      const cat = c.complaint_category.split(' ')[0] || 'Other'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([cat, count]) => ({ category: cat, count }))
  }, [cases])

  // 3. SLA Performance Breakdown
  const slaData = useMemo(() => {
    const within = cases.filter((c) => slaState(c) === 'WITHIN').length
    const approaching = cases.filter((c) => slaState(c) === 'APPROACHING').length
    const overdue = cases.filter((c) => slaState(c) === 'OVERDUE').length
    return [
      { name: 'Within SLA', count: within, fill: '#15803d' },
      { name: 'Approaching SLA', count: approaching, fill: '#d97706' },
      { name: 'Overdue SLA', count: overdue, fill: '#b91c1c' },
    ]
  }, [cases])

  // 4. Region-wise Workload
  const regionData = useMemo(() => {
    const counts: Record<string, number> = {}
    snapshot.institutions.forEach((inst) => {
      const reg = inst.region || 'Other'
      const instCases = cases.filter((c) => c.institution_id === inst.id)
      counts[reg] = (counts[reg] || 0) + instCases.length
    })
    return Object.entries(counts).map(([region, count]) => ({ region, count }))
  }, [snapshot.institutions, cases])

  // Handle individual official authentication
  const handleOfficialAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOfficial) return
    setAuthError(null)

    const res = await login(selectedOfficial.email, authPassword)
    if (res.ok) {
      setAuthSuccess(`✓ Authenticated as ${selectedOfficial.full_name}. Entering official workspace.`)
      setTimeout(() => {
        setSelectedOfficial(null)
        setAuthSuccess(null)
        navigate('/dashboard')
      }, 700)
    } else {
      setAuthError(res.error || 'Authentication failed. Please verify credentials.')
    }
  }

  const isAdminWorkspace = profile.role === 'SUPER_ADMIN' || profile.role === 'SENIOR_MANAGEMENT'

  return (
    <div className="space-y-6">
      {/* Title & Subtitle banner */}
      <PageHeader
        title={
          isAdminWorkspace
            ? 'AICTE Central Admin Workspace & Operational Monitoring'
            : `${ROLE_LABEL[profile.role]} Official Workspace`
        }
        subtitle={
          isAdminWorkspace
            ? 'केंद्रीय प्रशासनिक कार्यक्षेत्र — High-level operational oversight across AICTE Regulation Bureau, PGRC & Regional Offices.'
            : `Authorised official file queue for ${profile.full_name} (${profile.designation}).`
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/complaints/new"
              className="bg-[#003366] hover:bg-[#002244] text-white text-[12px] font-bold px-3 py-1.5 rounded-[3px] shadow-xs flex items-center gap-1.5"
            >
              <FileText size={14} />
              <span>Register Intake</span>
            </Link>
          </div>
        }
      />

      {/* 8 Mandatory KPI Cards (Section 10 Requirements) */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        <KPICard
          label="Total Cases"
          value={stats.total.toLocaleString('en-IN')}
          hint="Aggregate volume"
        />
        <KPICard
          label="Pending"
          value={stats.pending.toLocaleString('en-IN')}
          hint="Inquiry pending"
          tone="warn"
        />
        <KPICard
          label="Under Process"
          value={stats.underProcess.toLocaleString('en-IN')}
          hint="Active files"
        />
        <KPICard
          label="Disposed / Closed"
          value={stats.disposed.toLocaleString('en-IN')}
          hint="Concluded orders"
          tone="ok"
        />
        <KPICard
          label="Overdue SLA"
          value={stats.overdue.toLocaleString('en-IN')}
          hint="Action required"
          tone="danger"
        />
        <KPICard
          label="Overlaps"
          value={stats.overlaps.toLocaleString('en-IN')}
          hint="Coordination"
          tone="warn"
        />
        <KPICard
          label="Escalated"
          value={escalatedCount.toLocaleString('en-IN')}
          hint="Senior review"
          tone={escalatedCount > 0 ? 'danger' : 'neutral'}
        />
        <KPICard
          label="This Month"
          value={thisMonthCount.toLocaleString('en-IN')}
          hint="October 2026"
        />
      </div>

      {/* Admin Monitoring Disclaimer (Section 10) */}
      {isAdminWorkspace && (
        <div className="p-3.5 bg-[#f0f4f8] border-l-4 border-l-[#003366] border border-[#cbd5e1] rounded-[3px] text-[12px] text-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#003366] shrink-0" />
            <span>
              <strong>Administrative Oversight Principle:</strong> The Admin Workspace displays system-level operational statistics. Complete sensitive case files require individual official authentication as designated in Section 12.
            </span>
          </div>
          <span className="font-mono bg-white px-2 py-0.5 rounded text-[11px] font-bold text-[#003366] border border-[#cbd5e1]">
            RLS Policy Active
          </span>
        </div>
      )}

      {/* 6 Visual Charts Grid (Section 10 Requirements) */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Chart 1: Case Status Distribution */}
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide">
              1. Case Status Distribution
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pie.map((e, idx) => (
                    <Cell key={e.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Bureau Workload */}
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide">
              2. Bureau Workload (Active Files)
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={stats.byBureau}>
                <CartesianGrid stroke="#e8eef4" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#003366' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#003366" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 3: Monthly Complaint Trend */}
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide">
              3. Monthly Trend (Intake vs Disposed)
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid stroke="#e8eef4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#003366' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="received" stroke="#003366" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="disposed" stroke="#15803d" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 4: Category Distribution */}
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide">
              4. Category Distribution
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={categoryData}>
                <CartesianGrid stroke="#e8eef4" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#003366' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ff9933" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 5: SLA Performance */}
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide">
              5. Citizen Charter SLA Compliance
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={slaData}>
                <CartesianGrid stroke="#e8eef4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#003366' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count">
                  {slaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 6: Region-wise Workload */}
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide">
              6. Region-Wise Case Distribution
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={regionData}>
                <CartesianGrid stroke="#e8eef4" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#003366' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* SECTION 11 & 12: OFFICIAL AICTE SYSTEM ROLES & INDIVIDUAL AUTHENTICATION GATEWAY */}
      <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-[#e2e8f0] pb-3 mb-4 gap-2">
          <div>
            <h2 className="text-[16px] font-bold text-[#003366] uppercase tracking-wide flex items-center gap-2">
              <UserCheck size={18} className="text-[#003366]" />
              Official AICTE System Roles (Section 11 & 12 Gateway)
            </h2>
            <p className="text-[12px] text-[#64748b]">
              Selecting an official role requires individual re-authentication with password before exposing sensitive case files.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#475569] bg-[#f1f5f9] px-2.5 py-1 rounded border border-[#cbd5e1]">
            Active Role: <strong className="text-[#003366]">{ROLE_LABEL[profile.role]}</strong>
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px]">
          {snapshot.profiles.map((p, idx) => {
            const b = snapshot.bureaus.find((x) => x.id === p.bureau_id)
            const isMe = p.id === profile.id
            const officialId = `OFFICER-AICTE-${(idx + 1).toString().padStart(3, '0')}`

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-[3px] border transition flex flex-col justify-between ${
                  isMe
                    ? 'border-[#003366] bg-[#f0f4f8] shadow-xs'
                    : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-[#003366] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-[#64748b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                      {officialId}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="font-bold text-[#003366] text-[13px] leading-snug">{p.full_name}</p>
                  <p className="text-[11px] font-semibold text-[#b45309] mt-0.5">{ROLE_LABEL[p.role]}</p>
                  <p className="text-[11px] text-[#475569]">{p.designation}</p>
                  <p className="text-[10px] text-[#64748b] font-mono mt-1">{p.email}</p>
                  <p className="text-[11px] text-[#475569] mt-0.5">
                    Bureau: <strong>{b ? b.code : p.role === 'SUPER_ADMIN' ? 'Headquarters' : 'Regional'}</strong>
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#e2e8f0]">
                  {isMe ? (
                    <span className="block text-center bg-emerald-600 text-white font-bold py-1 rounded-[3px] text-[11px]">
                      Currently Active Profile
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOfficial(p)
                        setAuthError(null)
                        setAuthPassword(demoPassword)
                      }}
                      className="w-full bg-white hover:bg-[#003366] hover:text-white text-[#003366] border border-[#cbd5e1] font-bold py-1 rounded-[3px] transition text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Lock size={12} />
                      <span>Authenticate & Enter →</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION 12: INDIVIDUAL OFFICIAL AUTHENTICATION MODAL */}
      {selectedOfficial && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border-2 border-[#003366] max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#003366] px-5 py-3 text-white flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold">Individual Official Authentication</h3>
                <p className="text-[11px] text-white/80">Section 12 Role-Based Access Gate</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfficial(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOfficialAuth} className="p-5 space-y-4">
              {authError && (
                <div className="p-2.5 bg-[#fef2f2] border border-[#fecdd3] text-[#b91c1c] text-[12px] rounded flex items-center gap-1.5">
                  <AlertTriangle size={15} />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-2.5 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-[12px] rounded flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={15} />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* Selected Official Summary */}
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[3px] text-[12px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Official Name:</span>
                  <span className="font-bold text-[#003366]">{selectedOfficial.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Assigned Role:</span>
                  <span className="font-semibold text-[#b45309]">{ROLE_LABEL[selectedOfficial.role]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Official Email:</span>
                  <span className="font-mono text-[#003366]">{selectedOfficial.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#003366] mb-1">
                  Official Password / सुरक्षा पासवर्ड
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-2.5 text-[#64748b]" />
                  <input
                    type="password"
                    className="w-full rounded-[3px] border border-[#cbd5e1] pl-9 pr-3 py-1.5 text-[13px] outline-none focus:border-[#003366]"
                    placeholder="Enter official password..."
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-1">
                  Demo hint: <code className="bg-[#f1f5f9] px-1 rounded text-[#003366]">{demoPassword}</code>
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOfficial(null)}
                  className="px-4 py-2 border border-[#cbd5e1] text-[#475569] font-bold text-[12px] rounded-[3px] hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold text-[12px] rounded-[3px] shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock size={14} className="text-[#ff9933]" />
                  <span>Verify Role & Sign In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case File Activity Table */}
      <section className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <header className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 flex items-center justify-between border-l-4 border-l-[#003366]">
          <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">
            Recent Case Activity ({cases.length} Visible Files)
          </h2>
          <Link to="/complaints" className="text-[12px] font-bold text-[#003366] hover:underline">
            View All Complaints →
          </Link>
        </header>

        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Case ID</th>
                <th className="px-3.5 py-2.5">Institution</th>
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Last Action Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {recent.map((c) => {
                const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
                return (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                    <td className="px-3.5 py-2.5">
                      <Link className="font-bold font-mono text-[#003366] hover:underline" to={`/complaints/${c.id}`}>
                        {c.case_id}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-[#1e293b]">
                      {inst?.institution_name || 'Institution'}
                    </td>
                    <td className="px-3.5 py-2.5 text-[#475569]">{c.complaint_category}</td>
                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3.5 py-2.5 text-[#64748b] text-[12px]">{formatDate(c.last_action_date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
