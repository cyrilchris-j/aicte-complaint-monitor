import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, subscribe, visibleCases } from '../demo/store'
import { EmptyState, PageHeader, SlaBadge, StatusBadge } from '../components/ui'
import { formatDate, slaState } from '../lib/utils'

export function AssignedPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!profile) return null
  const mine =
    profile.role === 'CASE_OFFICER'
      ? snapshot.cases.filter((c) => c.assigned_officer_id === profile.id)
      : visibleCases(profile).filter((c) => c.assigned_officer_id)
  return (
    <div>
      <PageHeader title="My assigned cases" subtitle="Cases currently owned by you or visible officers in your scope." />
      {mine.length === 0 ? (
        <EmptyState title="No assigned cases" body="When a Bureau Head assigns a file to you, it will appear here." />
      ) : (
        <div className="grid gap-3 md:hidden">
          {mine.slice(0, 40).map((c) => (
            <Link key={c.id} to={`/complaints/${c.id}`} className="rounded-sm border border-line bg-white p-3 app-shadow">
              <p className="font-semibold text-navy">{c.case_id}</p>
              <p className="text-[13px]">{c.subject}</p>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
      <div className="hidden rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs md:block overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#003366] text-[12px] uppercase font-bold text-white tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5">Case Reference</th>
              <th className="px-3 py-2.5">Institution</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">SLA Timeline</th>
              <th className="px-3 py-2.5">Expected Disposal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {mine.slice(0, 80).map((c) => (
              <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                <td className="px-3.5 py-3 font-mono font-bold">
                  <Link className="text-[#003366] hover:underline" to={`/complaints/${c.id}`}>{c.case_id}</Link>
                  <p className="text-[11px] font-sans font-normal text-[#64748b] line-clamp-1">{c.subject}</p>
                </td>
                <td className="px-3 py-3 font-medium text-[#1e293b]">{snapshot.institutions.find((i) => i.id === c.institution_id)?.institution_name}</td>
                <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-3"><SlaBadge state={slaState(c)} /></td>
                <td className="px-3 py-3 font-mono text-[12px] text-[#475569]">{formatDate(c.expected_disposal_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
