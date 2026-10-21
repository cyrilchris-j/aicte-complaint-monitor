import { Link } from 'react-router-dom'
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
import { useSyncExternalStore } from 'react'
import { KPICard, PageHeader, StatusBadge } from '../components/ui'
import { formatDate } from '../lib/utils'

const PIE_COLORS = ['#0b5cab', '#084782', '#64748b', '#b45309', '#1b7a4e', '#b42318']

export function DashboardPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!profile) return null
  const stats = dashboardStats(profile)
  const recent = visibleCases(profile)
    .slice()
    .sort((a, b) => b.last_action_date.localeCompare(a.last_action_date))
    .slice(0, 8)
  const pie = [
    { name: 'New', value: stats.byStatus.NEW ?? 0 },
    { name: 'Under Review', value: stats.byStatus.UNDER_REVIEW ?? 0 },
    { name: 'Under Process', value: stats.byStatus.UNDER_PROCESS ?? 0 },
    { name: 'Pending Info', value: stats.byStatus.PENDING_INFORMATION ?? 0 },
    { name: 'Disposed', value: (stats.byStatus.DISPOSED ?? 0) + (stats.byStatus.CLOSED ?? 0) },
    { name: 'Escalated', value: stats.byStatus.ESCALATED ?? 0 },
  ]
  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrated Institution Complaint Monitoring Dashboard"
        subtitle="एकीकृत संस्था शिकायत निगरानी डैशबोर्ड — Centralized monitoring of institution-related complaints across AICTE Bureaus and Cells"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KPICard label="Total Complaints" value={stats.total.toLocaleString('en-IN')} hint={`${stats.monthDeltaPct > 0 ? '+' : ''}${stats.monthDeltaPct}% this month`} />
        <KPICard label="Pending Inquiries" value={stats.pending.toLocaleString('en-IN')} hint={`${stats.pendingOverdue} overdue`} tone="warn" />
        <KPICard label="Under Process" value={stats.underProcess.toLocaleString('en-IN')} />
        <KPICard label="Disposed / Closed" value={stats.disposed.toLocaleString('en-IN')} tone="ok" />
        <KPICard label="Overdue SLA" value={stats.overdue.toLocaleString('en-IN')} tone="danger" />
        <KPICard label="Parallel Overlaps" value={stats.overlaps.toLocaleString('en-IN')} hint="Coordination required" tone="warn" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">Case Status Distribution</h2>
          </header>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pie.map((e) => (
                    <Cell key={e.name} fill={PIE_COLORS[pie.indexOf(e) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">Bureau Workload (Open Files)</h2>
          </header>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.byBureau}>
                <CartesianGrid stroke="#e8eef4" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 12, fontWeight: 'bold', fill: '#003366' }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#003366" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">Monthly Trend (Received vs Disposed)</h2>
          </header>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid stroke="#e8eef4" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#003366' }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="received" stroke="#003366" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="disposed" stroke="#15803d" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#003366] pl-2">
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">Case Ageing Histogram (Open Files)</h2>
          </header>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.ageing}>
                <CartesianGrid stroke="#e8eef4" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#003366' }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0b4d8c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
          <header className="border-b border-[#e2e8f0] pb-2 mb-3 border-l-4 border-l-[#ff9933] pl-2">
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">Overlap Summary</h2>
          </header>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
              <dt className="text-[#475569]">Potential overlaps detected</dt>
              <dd className="font-bold text-[#003366] font-mono">{stats.overlaps}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
              <dt className="text-[#475569]">High Priority (85%+)</dt>
              <dd className="font-bold text-[#b91c1c] font-mono">{stats.highPriorityOverlaps}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
              <dt className="text-[#475569]">Cross-Bureau overlaps</dt>
              <dd className="font-bold text-[#b45309] font-mono">{stats.crossBureau}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-[#475569]">Awaiting Coordination</dt>
              <dd className="font-bold text-[#15803d] font-mono">{stats.awaitingCoordination}</dd>
            </div>
          </dl>
          <Link to="/overlap" className="mt-4 block text-center bg-[#003366] hover:bg-[#002244] text-white text-[12px] font-bold py-2 rounded-[3px] shadow-xs uppercase tracking-wide">
            Open Overlap & Coordination Centre →
          </Link>
        </section>
        <section className="lg:col-span-2 rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
          <header className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 border-l-4 border-l-[#003366]">
            <h2 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">Recent Case File Activity</h2>
          </header>
          <div className="table-scroll">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">Case ID</th>
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last Action Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                    <td className="px-3 py-2.5">
                      <Link className="font-bold font-mono text-[#003366] hover:underline" to={`/complaints/${c.id}`}>
                        {c.case_id}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[#002244]">
                      {snapshot.institutions.find((i) => i.id === c.institution_id)?.institution_name}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-2.5 text-[#64748b] text-[12px]">{formatDate(c.last_action_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
