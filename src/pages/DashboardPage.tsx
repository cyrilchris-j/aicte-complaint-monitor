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
import { acceptTransfer, dashboardStats, getSnapshot, subscribe, visibleCases } from '../demo/store'
import { KPICard, PageHeader, SlaBadge, StatusBadge } from '../components/ui'
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
  FileText,
  ArrowRightLeft,
  Inbox,
  ArrowUpRight,
  Clock,
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
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [actionTab, setActionTab] = useState<'all' | 'assigned' | 'transfers' | 'evidence'>('all')

  if (!profile) return null

  const stats = dashboardStats(profile)
  const cases = visibleCases(profile)

  // 1. Pending incoming transfers to this bureau
  const pendingTransfers = cases.filter(
    (c) => c.pending_transfer_bureau_id && (c.pending_transfer_bureau_id === profile.bureau_id || profile.role === 'SUPER_ADMIN')
  )

  // 2. Cases assigned directly to this official
  const assignedToMe = cases.filter((c) => c.assigned_officer_id === profile.id)

  // 3. Cases requiring evidence or institution response
  const pendingEvidence = cases.filter(
    (c) =>
      c.status === 'PENDING_INFORMATION' ||
      c.verification_status === 'EVIDENCE_REQUIRED' ||
      c.verification_status === 'INSTITUTION_RESPONSE_REQUIRED'
  )

  // Consolidated action items queue
  const allActionItems = useMemo(() => {
    const ids = new Set<string>()
    const items = []
    // Prioritize pending transfers
    for (const c of pendingTransfers) {
      if (!ids.has(c.id)) {
        ids.add(c.id)
        items.push({ case: c, type: 'TRANSFER_REQUEST' as const, label: 'Incoming Bureau Transfer' })
      }
    }
    // Then direct assignments
    for (const c of assignedToMe) {
      if (!ids.has(c.id)) {
        ids.add(c.id)
        items.push({ case: c, type: 'ASSIGNED_TO_ME' as const, label: 'Direct Assignment' })
      }
    }
    // Then pending evidence / response
    for (const c of pendingEvidence) {
      if (!ids.has(c.id)) {
        ids.add(c.id)
        items.push({ case: c, type: 'PENDING_EVIDENCE' as const, label: 'Evidence / Response Awaited' })
      }
    }
    return items
  }, [pendingTransfers, assignedToMe, pendingEvidence])

  const filteredActionItems = useMemo(() => {
    if (actionTab === 'assigned') return allActionItems.filter((i) => i.type === 'ASSIGNED_TO_ME')
    if (actionTab === 'transfers') return allActionItems.filter((i) => i.type === 'TRANSFER_REQUEST')
    if (actionTab === 'evidence') return allActionItems.filter((i) => i.type === 'PENDING_EVIDENCE')
    return allActionItems
  }, [actionTab, allActionItems])

  const handleDashboardAcceptTransfer = (caseId: string, caseRef: string) => {
    acceptTransfer(caseId, profile)
    setActionFeedback(`✓ Transfer of ${caseRef} accepted. File is now under your Bureau authority.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

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

      {/* Action feedback toast banner */}
      {actionFeedback && (
        <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-[13px] rounded-[3px] flex items-center gap-2 font-bold shadow-xs">
          <CheckCircle2 size={16} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* High-priority Incoming Transfer Alert Banner */}
      {pendingTransfers.length > 0 && (
        <div className="p-4 bg-[#fffbeb] border-2 border-[#f59e0b] rounded-[3px] text-[13px] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-[#fef3c7] rounded-[3px] text-[#b45309] shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h3 className="font-bold text-[#92400e] text-[14px] flex items-center gap-2">
                <span>Incoming Bureau Transfer Request Pending Acceptance</span>
                <span className="bg-[#b45309] text-white text-[11px] px-2 py-0.2 rounded-full font-bold">
                  {pendingTransfers.length} file{pendingTransfers.length > 1 ? 's' : ''}
                </span>
              </h3>
              <p className="text-[#b45309] text-[12px] mt-0.5">
                Case files have been formally transferred to your bureau for departmental action. Review and accept file ownership to initiate inquiry.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {pendingTransfers.slice(0, 3).map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => handleDashboardAcceptTransfer(pt.id, pt.case_id)}
                className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-3 py-1.5 rounded-[3px] text-[12px] flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Accept {pt.case_id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Task Status Summary Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border border-[#cbd5e1] rounded-[3px] text-[12px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#64748b] font-bold uppercase tracking-wide text-[11px]">Your Work Queue:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f0f4f8] text-[#003366] font-bold border border-[#cbd5e1]">
            <UserCheck size={13} className="text-[#003366]" />
            <span>Assigned to You:</span>
            <strong className="text-[#b45309]">{assignedToMe.length}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#fffbeb] text-[#92400e] font-bold border border-[#fde68a]">
            <ArrowRightLeft size={13} className="text-[#b45309]" />
            <span>Pending Transfers:</span>
            <strong>{pendingTransfers.length}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f8fafc] text-[#475569] font-medium border border-[#e2e8f0]">
            <Clock size={13} className="text-[#64748b]" />
            <span>Evidence / Response Pending:</span>
            <strong className="text-[#003366]">{pendingEvidence.length}</strong>
          </span>
        </div>
        <Link
          to="/assigned"
          className="text-[#003366] hover:underline font-bold text-[12px] flex items-center gap-1"
        >
          <span>Open Full Assignment Queue</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

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

      {/* SECTION: ASSIGNED TASKS & ACTION QUEUE */}
      <section className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <header className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-l-4 border-l-[#ff9933]">
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-[#003366]" />
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">
              Official Task Queue & Requested Assignments (कार्य एवं फाइल दायित्व)
            </h2>
            <span className="bg-[#003366] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {allActionItems.length} Active Items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/assigned" className="text-[12px] font-bold text-[#003366] hover:underline flex items-center gap-1">
              <span>View Full Assignment Scope →</span>
            </Link>
          </div>
        </header>

        {/* Action Queue Filter Tabs */}
        <div className="px-4 py-2 bg-[#f1f5f9] border-b border-[#e2e8f0] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActionTab('all')}
            className={`px-3 py-1 rounded-[3px] text-[11px] font-bold transition cursor-pointer ${
              actionTab === 'all' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            All Action Queue ({allActionItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActionTab('assigned')}
            className={`px-3 py-1 rounded-[3px] text-[11px] font-bold transition cursor-pointer ${
              actionTab === 'assigned' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            Assigned to You ({assignedToMe.length})
          </button>
          <button
            type="button"
            onClick={() => setActionTab('transfers')}
            className={`px-3 py-1 rounded-[3px] text-[11px] font-bold transition cursor-pointer ${
              actionTab === 'transfers' ? 'bg-[#b45309] text-white shadow-xs' : 'bg-white text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            Incoming Bureau Transfers ({pendingTransfers.length})
          </button>
          <button
            type="button"
            onClick={() => setActionTab('evidence')}
            className={`px-3 py-1 rounded-[3px] text-[11px] font-bold transition cursor-pointer ${
              actionTab === 'evidence' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            Evidence / Response Awaited ({pendingEvidence.length})
          </button>
        </div>

        {filteredActionItems.length === 0 ? (
          <div className="p-6 text-center text-[#64748b]">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2 opacity-80" />
            <p className="font-bold text-[#1e293b] text-[14px]">
              {actionTab === 'transfers'
                ? 'No Pending Bureau Transfers'
                : actionTab === 'assigned'
                ? 'No Cases Directly Assigned to You'
                : 'All Files Up to Date'}
            </p>
            <p className="text-[12px] text-[#64748b] mt-1">
              There are no pending action items in this queue filter. Files will appear here automatically when requested or assigned.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f8fafc] text-[#475569] border-b border-[#cbd5e1] text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Case Reference</th>
                  <th className="px-3 py-2.5">Institution & Subject</th>
                  <th className="px-3 py-2.5">Task Nature</th>
                  <th className="px-3 py-2.5">Assigned Officer</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">SLA Timeline</th>
                  <th className="px-3 py-2.5 text-right">Official Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredActionItems.map(({ case: c, type, label }) => {
                  const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
                  const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
                  const isPendingTransfer = c.pending_transfer_bureau_id && (c.pending_transfer_bureau_id === profile.bureau_id || profile.role === 'SUPER_ADMIN')

                  return (
                    <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                      <td className="px-3.5 py-3 font-mono">
                        <Link className="font-bold text-[#003366] hover:underline" to={`/complaints/${c.id}`}>
                          {c.case_id}
                        </Link>
                        <span className="block text-[10px] text-[#64748b] font-sans">
                          Recd: {formatDate(c.received_date)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-[#1e293b] block line-clamp-1">{inst?.institution_name}</span>
                        <span className="text-[11px] text-[#64748b] line-clamp-1">{c.subject}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                            type === 'TRANSFER_REQUEST'
                              ? 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                              : type === 'ASSIGNED_TO_ME'
                              ? 'bg-[#f0f4f8] text-[#003366] border-[#cbd5e1]'
                              : 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0]'
                          }`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {officer ? (
                          <div className="text-[12px]">
                            <span className="font-semibold text-[#1e293b]">{officer.full_name}</span>
                            {c.assigned_officer_id === profile.id && (
                              <span className="ml-1 text-[10px] bg-[#dbeafe] text-[#1e40af] font-bold px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#94a3b8] italic text-[12px]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-3">
                        <SlaBadge state={slaState(c)} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingTransfer && (
                            <button
                              type="button"
                              onClick={() => handleDashboardAcceptTransfer(c.id, c.case_id)}
                              className="bg-[#15803d] hover:bg-[#166534] text-white text-[11px] font-bold px-2.5 py-1 rounded-[3px] shadow-xs cursor-pointer flex items-center gap-1 transition"
                            >
                              <CheckCircle2 size={12} />
                              <span>Accept Transfer</span>
                            </button>
                          )}
                          <Link
                            to={`/complaints/${c.id}`}
                            className="bg-white hover:bg-[#003366] hover:text-white text-[#003366] border border-[#cbd5e1] text-[11px] font-bold px-2.5 py-1 rounded-[3px] transition inline-flex items-center gap-1"
                          >
                            <span>Open File</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                <th className="px-3.5 py-2.5">Assigned Officer</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">SLA Compliance</th>
                <th className="px-3.5 py-2.5">Last Action Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {recent.map((c) => {
                const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
                const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
                const isMine = c.assigned_officer_id === profile.id

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
                      {officer ? (
                        <span className={`text-[12px] font-medium ${isMine ? 'text-[#003366] font-bold' : 'text-[#334155]'}`}>
                          {officer.full_name} {isMine && '(You)'}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8] italic text-[12px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <SlaBadge state={slaState(c)} />
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
