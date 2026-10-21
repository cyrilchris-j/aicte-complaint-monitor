import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, subscribe, visibleCases } from '../demo/store'
import { PageHeader, StatusBadge, VerifyBadge } from '../components/ui'

export function VerificationPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!profile) return null
  const queue = visibleCases(profile).filter((c) =>
    ['UNVERIFIED', 'UNDER_REVIEW', 'EVIDENCE_REQUIRED', 'INSTITUTION_RESPONSE_REQUIRED'].includes(c.verification_status),
  )
  return (
    <div>
      <PageHeader
        title="Verification queue"
        subtitle="Complaint verification and risk screening. The system does not label a complaint as fake. Authorised officials make the determination."
      />
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#003366] text-[12px] uppercase font-bold text-white tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5">Case Reference</th>
              <th className="px-3 py-2.5">Institution</th>
              <th className="px-3 py-2.5">Complainant Mobile</th>
              <th className="px-3 py-2.5">Evidence Docs</th>
              <th className="px-3 py-2.5">Institution Reply</th>
              <th className="px-3 py-2.5">Verification Status</th>
              <th className="px-3 py-2.5">Cluster Pattern</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {queue.slice(0, 60).map((c) => (
              <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                <td className="px-3.5 py-3">
                  <Link className="font-mono font-bold text-[#003366] hover:underline" to={`/complaints/${c.id}`}>{c.case_id}</Link>
                  <div className="mt-1"><StatusBadge status={c.status} /></div>
                </td>
                <td className="px-3 py-3 font-medium text-[#1e293b]">{snapshot.institutions.find((i) => i.id === c.institution_id)?.institution_name}</td>
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${c.mobile_verified ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fef3c7] text-[#b45309]'}`}>
                    {c.mobile_verified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${c.documents_received ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                    {c.documents_received ? '✓ Received' : 'Required'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${c.institution_response_received ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#f1f5f9] text-[#64748b]'}`}>
                    {c.institution_response_received ? '✓ Received' : 'Pending'}
                  </span>
                </td>
                <td className="px-3 py-3"><VerifyBadge status={c.verification_status} /></td>
                <td className="px-3 py-3">
                  {snapshot.suspiciousPatterns.some((s) => s.related_case_ids.includes(c.id)) ? (
                    <span className="inline-block bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] px-2 py-0.5 rounded text-[11px] font-bold">
                      ⚠ Cluster Pattern
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] text-[12px]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
