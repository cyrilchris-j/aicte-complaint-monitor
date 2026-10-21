import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, linkCases, markUnrelated, requestCoordination, subscribe } from '../demo/store'
import { Button, KPICard, PageHeader } from '../components/ui'
import { CheckCircle2, ShieldCheck, Check } from 'lucide-react'

export function OverlapPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [q, setQ] = useState('')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const links = useMemo(
    () => {
      if (!profile) return []
      return snapshot.links.filter((l) => {
        if (l.dismissed) return false
        const a = snapshot.cases.find((c) => c.id === l.source_case_id)
        const b = snapshot.cases.find((c) => c.id === l.target_case_id)
        const inst = snapshot.institutions.find((i) => i.id === a?.institution_id)
        if (q && !`${a?.case_id} ${b?.case_id} ${inst?.institution_name}`.toLowerCase().includes(q.toLowerCase())) return false
        return true
      })
    },
    [snapshot, q, profile],
  )

  if (!profile) return null

  const high = links.filter((l) => l.similarity_score >= 85).length
  const cross = links.filter((l) => l.relationship_type === 'CROSS_BUREAU_OVERLAP').length
  const coord = links.filter((l) => l.coordination_requested || l.relationship_type === 'REQUIRES_COORDINATION').length

  const handleLink = (aId: string, bId: string, caseAName: string, caseBName: string) => {
    linkCases(aId, bId, profile)
    setActionFeedback(`✓ Successfully linked ${caseAName} and ${caseBName}. Both case files remain independent.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const handleCoordination = (linkId: string, caseAName: string, caseBName: string) => {
    requestCoordination(linkId, profile)
    setActionFeedback(`⏳ Bilateral Coordination requested between ${caseAName} and ${caseBName}. Concerned Bureau Heads notified.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const handleUnrelated = (linkId: string) => {
    markUnrelated(linkId, profile)
    setActionFeedback(`Pair marked as unrelated and dismissed from the active coordination queue.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overlap & Coordination Centre"
        subtitle="संस्थागत शिकायत ओवरलैप एवं अंतर-ब्यूरो समन्वय केंद्र — Single window detection to prevent contradictory decisions and duplicate inquiries."
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Total Overlaps Flagged" value={links.length} hint="AI-assisted similarity index" />
        <KPICard label="Cross-Bureau Cases" value={cross} hint="Parallel inquiries across Bureaus" tone="warn" />
        <KPICard label="High Priority (85%+)" value={high} hint="Urgent review recommended" tone="danger" />
        <KPICard label="Coordination In Progress" value={coord} hint="Bilateral coordination active" tone="ok" />
      </div>

      {/* Feedback Banner */}
      {actionFeedback ? (
        <div className="flex items-center gap-2 p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-[13px] font-semibold rounded-[3px] shadow-xs">
          <Check size={16} />
          <span>{actionFeedback}</span>
        </div>
      ) : null}

      {/* Filter and Explanatory Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[3px] border border-[#cbd5e1] shadow-xs">
        <input
          className="w-full sm:w-96 rounded-[3px] border border-[#cbd5e1] px-3 py-1.5 text-[13px] text-[#002244] outline-none focus:border-[#003366]"
          placeholder="Filter by institution name or Case ID (e.g., ABC Engineering)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="text-[12px] text-[#475569] flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#003366]" />
          <span>Officer decision is authoritative. AI suggestions never merge case files automatically.</span>
        </div>
      </div>

      {/* Main Overlap Comparison Table */}
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[1050px] text-left text-[13px]">
            <thead className="bg-[#003366] text-white text-[12px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5">Institution & Details</th>
                <th className="px-3 py-2.5">Case A (Source)</th>
                <th className="px-3 py-2.5">Bureau A</th>
                <th className="px-3 py-2.5">Case B (Target)</th>
                <th className="px-3 py-2.5">Bureau B</th>
                <th className="px-3 py-2.5">Similarity</th>
                <th className="px-3 py-2.5">AI Flagging Rationale</th>
                <th className="px-3 py-2.5 text-center">Bureau Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748b]">
                    No overlapping cases found matching your search.
                  </td>
                </tr>
              ) : null}

              {links.slice(0, 80).map((l) => {
                const a = snapshot.cases.find((c) => c.id === l.source_case_id)!
                const b = snapshot.cases.find((c) => c.id === l.target_case_id)!
                const inst = snapshot.institutions.find((i) => i.id === a.institution_id)
                const isCross = a.bureau_id !== b.bureau_id

                return (
                  <tr key={l.id} className="hover:bg-[#f8fafc] transition align-top">
                    <td className="px-3 py-3 max-w-[200px]">
                      <span className="font-bold text-[#003366] block leading-tight">{inst?.institution_name}</span>
                      <span className="text-[11px] font-mono text-[#64748b] block mt-0.5">{inst?.aicte_permanent_id}</span>
                      <span className="text-[11px] text-[#475569]">{inst?.city}, {inst?.state}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Link className="text-[#003366] hover:underline font-bold font-mono text-[13px]" to={`/complaints/${a.id}`}>
                        {a.case_id}
                      </Link>
                      <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2 max-w-[180px]">{a.subject}</p>
                      {l.confirmed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803d] bg-[#dcfce7] px-1.5 py-0.2 rounded mt-1 border border-[#bbf7d0]">
                          <CheckCircle2 size={11} /> Linked
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-[#eef4fa] text-[#003366] font-bold text-[11px] px-2 py-0.5 rounded border border-[#cbd5e1]">
                        {snapshot.bureaus.find((x) => x.id === a.bureau_id)?.code}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link className="text-[#003366] hover:underline font-bold font-mono text-[13px]" to={`/complaints/${b.id}`}>
                        {b.case_id}
                      </Link>
                      <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2 max-w-[180px]">{b.subject}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-[#eef4fa] text-[#003366] font-bold text-[11px] px-2 py-0.5 rounded border border-[#cbd5e1]">
                        {snapshot.bureaus.find((x) => x.id === b.bureau_id)?.code}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-[13px] ${
                          l.similarity_score >= 85 ? 'text-[#b91c1c]' : l.similarity_score >= 70 ? 'text-[#b45309]' : 'text-[#003366]'
                        }`}>
                          {l.similarity_score}%
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mt-0.5 ${
                        l.similarity_score >= 85 ? 'text-[#b91c1c]' : l.similarity_score >= 70 ? 'text-[#b45309]' : 'text-[#64748b]'
                      }`}>
                        {l.similarity_score >= 85 ? 'High Overlap' : l.similarity_score >= 70 ? 'Related' : 'Weak'}
                      </span>
                      {isCross ? (
                        <span className="inline-block mt-1 bg-[#fff7ed] text-[#b45309] border border-[#fde68a] text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Cross-Bureau
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 max-w-[260px]">
                      <ul className="text-[12px] text-[#334155] space-y-1">
                        {l.reasons.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-[#003366] font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                      {l.coordination_requested ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded mt-2">
                          ⏳ Coordination Requested
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5 items-stretch min-w-[150px]">
                        {!l.confirmed ? (
                          <Button
                            variant="secondary"
                            onClick={() => handleLink(a.id, b.id, a.case_id, b.case_id)}
                            className="text-[11px] py-1"
                          >
                            Link Cases
                          </Button>
                        ) : (
                          <span className="text-center text-[11px] font-bold text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] py-1 rounded">
                            ✓ Confirmed Linked
                          </span>
                        )}
                        {!l.coordination_requested ? (
                          <Button
                            variant="primary"
                            onClick={() => handleCoordination(l.id, a.case_id, b.case_id)}
                            className="text-[11px] py-1 bg-[#ff9933] hover:bg-[#e68a00] text-[#002244] border-[#d97706]"
                          >
                            Request Coordination
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          onClick={() => handleUnrelated(l.id)}
                          className="text-[11px] py-0.5 text-[#64748b]"
                        >
                          Mark Unrelated
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
