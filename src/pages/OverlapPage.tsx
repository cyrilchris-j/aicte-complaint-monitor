import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, linkCases, markUnrelated, requestCoordination, subscribe } from '../demo/store'
import { Button, KPICard, PageHeader } from '../components/ui'
import { ROLE_LABEL } from '../lib/constants'
import type { CaseLink, ComplaintCase } from '../types'
import {
  CheckCircle2,
  ShieldCheck,
  Check,
  Split,
  MessageSquare,
  Users,
  AlertTriangle,
  X,
  Layers,
  Building,
} from 'lucide-react'


export function OverlapPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [q, setQ] = useState('')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overlaps' | 'coordination'>('overlaps')

  // Detailed Side-by-Side Comparison Modal State (Section 16)
  const [comparingLink, setComparingLink] = useState<CaseLink | null>(null)

  // Coordination Message Modal State (Section 17)
  const [coordMessageModal, setCoordMessageModal] = useState<{
    linkId: string
    caseA: ComplaintCase
    caseB: ComplaintCase
  } | null>(null)
  const [coordMessageText, setCoordMessageText] = useState('')
  const [coordHistory, setCoordHistory] = useState<Record<string, { sender: string; time: string; text: string }[]>>({
    'link-001': [
      {
        sender: 'Dr. Meenakshi Sundaram (Bureau Head - RB)',
        time: '21 Oct 2026, 04:30 PM',
        text: 'Initiating bilateral coordination on special examination fee complaint. Regulation Bureau is issuing a show-cause letter to ABC College.',
      },
      {
        sender: 'Prof. S. N. Mukherjee (Bureau Head - PGRC)',
        time: '22 Oct 2026, 11:15 AM',
        text: 'PGRC has received parallel student petition PGRC-2026-00883. We will align our inquiries so college cannot provide conflicting responses.',
      },
    ],
  })

  const links = useMemo(() => {
    if (!profile) return []
    return snapshot.links.filter((l) => {
      if (l.dismissed) return false
      const a = snapshot.cases.find((c) => c.id === l.source_case_id)
      const b = snapshot.cases.find((c) => c.id === l.target_case_id)
      const inst = snapshot.institutions.find((i) => i.id === a?.institution_id)
      if (q && !`${a?.case_id} ${b?.case_id} ${inst?.institution_name}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [snapshot, q, profile])

  const high = links.filter((l) => l.similarity_score >= 85).length
  const cross = links.filter((l) => l.relationship_type === 'CROSS_BUREAU_OVERLAP').length
  const coord = links.filter((l) => l.coordination_requested || l.relationship_type === 'REQUIRES_COORDINATION').length

  // Institutions with multi-bureau active cases (Section 17)
  const multiBureauInstitutions = useMemo(() => {
    return snapshot.institutions
      .map((inst) => {
        const instCases = snapshot.cases.filter((c) => c.institution_id === inst.id && c.status !== 'DISPOSED' && c.status !== 'CLOSED')
        const rbCases = instCases.filter((c) => {
          const b = snapshot.bureaus.find((x) => x.id === c.bureau_id)
          return b?.code === 'RB'
        })
        const pgrcCases = instCases.filter((c) => {
          const b = snapshot.bureaus.find((x) => x.id === c.bureau_id)
          return b?.code === 'PGRC'
        })
        const roCases = instCases.filter((c) => {
          const b = snapshot.bureaus.find((x) => x.id === c.bureau_id)
          return b?.code === 'RO'
        })

        const activeBureausCount = (rbCases.length > 0 ? 1 : 0) + (pgrcCases.length > 0 ? 1 : 0) + (roCases.length > 0 ? 1 : 0)

        return {
          inst,
          totalActive: instCases.length,
          rbCases,
          pgrcCases,
          roCases,
          activeBureausCount,
        }
      })
      .filter((x) => x.activeBureausCount >= 2 || x.totalActive >= 4)
  }, [snapshot.institutions, snapshot.cases, snapshot.bureaus])

  const handleLink = (aId: string, bId: string, caseAName: string, caseBName: string) => {
    if (!profile) return
    linkCases(aId, bId, profile)
    setActionFeedback(`✓ Successfully linked ${caseAName} and ${caseBName}. Both case files remain independent.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const handleCoordination = (linkId: string, caseAName: string, caseBName: string) => {
    if (!profile) return
    requestCoordination(linkId, profile)
    setActionFeedback(`⏳ Bilateral Coordination requested between ${caseAName} and ${caseBName}. Concerned Bureau Heads notified.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const handleUnrelated = (linkId: string) => {
    if (!profile) return
    markUnrelated(linkId, profile)
    setActionFeedback(`Pair marked as unrelated and dismissed from the active coordination queue.`)
    setTimeout(() => setActionFeedback(null), 4000)
    if (comparingLink?.id === linkId) {
      setComparingLink(null)
    }
  }

  const handleSendCoordMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !coordMessageModal || !coordMessageText.trim()) return

    const newMsg = {
      sender: `${profile.full_name} (${ROLE_LABEL[profile.role]})`,
      time: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      text: coordMessageText.trim(),
    }

    setCoordHistory((prev) => ({
      ...prev,
      [coordMessageModal.linkId]: [...(prev[coordMessageModal.linkId] || []), newMsg],
    }))

    setCoordMessageText('')
    setActionFeedback(`Coordination communication dispatched to participating Bureau officers.`)
    setTimeout(() => setActionFeedback(null), 3000)
  }

  // Highlight featured Section 16 showcase link
  const featuredLink = links.find((l) => l.similarity_score >= 90) || links[0]

  if (!profile) return null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overlap Detection & Cross-Bureau Coordination Centre"
        subtitle="संस्थागत शिकायत ओवरलैप एवं अंतर-ब्यूरो समन्वय केंद्र — AI-assisted similarity analysis and bilateral case coordination."
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

      {/* Navigation Tabs for Overlaps vs Cross-Bureau Parallel Activity */}
      <div className="flex items-center gap-2 border-b-2 border-[#003366]">
        <button
          onClick={() => setActiveTab('overlaps')}
          className={`px-4 py-2.5 text-[13px] font-bold rounded-t-[3px] transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overlaps'
              ? 'bg-[#003366] text-[#ffd580] border-b-2 border-[#ff9933]'
              : 'text-[#475569] hover:bg-[#eef4fa] hover:text-[#003366]'
          }`}
        >
          <Split size={15} />
          <span>AI Similarity Overlap Queue ({links.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('coordination')}
          className={`px-4 py-2.5 text-[13px] font-bold rounded-t-[3px] transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'coordination'
              ? 'bg-[#003366] text-[#ffd580] border-b-2 border-[#ff9933]'
              : 'text-[#475569] hover:bg-[#eef4fa] hover:text-[#003366]'
          }`}
        >
          <Layers size={15} />
          <span>Cross-Bureau Parallel Activity ({multiBureauInstitutions.length} Institutions)</span>
        </button>
      </div>

      {/* TAB 1: AI SIMILARITY OVERLAP QUEUE */}
      {activeTab === 'overlaps' && (
        <div className="space-y-4">
          {/* Section 16 Featured Highlight Card matching user prompt layout */}
          {featuredLink && (
            <div className="p-4 bg-white border-2 border-[#ff9933] rounded-[3px] shadow-sm">
              <div className="flex flex-wrap items-center justify-between border-b border-[#fed7aa] pb-2 mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#b91c1c] text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                    Potential Overlap Detected
                  </span>
                  <span className="text-[14px] font-black text-[#003366] font-mono">
                    Similarity: {featuredLink.similarity_score}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] font-bold text-[#15803d]">
                  <span>Same Institution ✓</span>
                  <span>Similar Category ✓</span>
                  <span>Semantic Similarity ✓</span>
                  <span>Related Time Period ✓</span>
                </div>
              </div>

              {(() => {
                const a = snapshot.cases.find((c) => c.id === featuredLink.source_case_id)
                const b = snapshot.cases.find((c) => c.id === featuredLink.target_case_id)
                const inst = snapshot.institutions.find((i) => i.id === a?.institution_id)
                if (!a || !b) return null

                return (
                  <div className="grid sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-8 space-y-1">
                      <p className="font-bold text-[#003366] text-[13px]">{inst?.institution_name}</p>
                      <p className="text-[12px] text-[#334155]">
                        <strong>Case A ({snapshot.bureaus.find((x) => x.id === a.bureau_id)?.code}):</strong>{' '}
                        <span className="font-mono text-[#003366] font-bold">{a.case_id}</span> — {a.subject}
                      </p>
                      <p className="text-[12px] text-[#334155]">
                        <strong>Case B ({snapshot.bureaus.find((x) => x.id === b.bureau_id)?.code}):</strong>{' '}
                        <span className="font-mono text-[#003366] font-bold">{b.case_id}</span> — {b.subject}
                      </p>
                    </div>

                    <div className="sm:col-span-4 flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setComparingLink(featuredLink)}
                        className="bg-[#003366] hover:bg-[#002244] text-white text-[12px] font-bold px-3 py-1.5 rounded-[3px] transition cursor-pointer shadow-xs"
                      >
                        [Compare Cases]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCoordination(featuredLink.id, a.case_id, b.case_id)}
                        className="bg-[#ff9933] hover:bg-[#e68a00] text-[#002244] text-[12px] font-bold px-3 py-1.5 rounded-[3px] transition cursor-pointer"
                      >
                        [Request Coordination]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnrelated(featuredLink.id)}
                        className="border border-[#cbd5e1] hover:bg-gray-100 text-[#64748b] text-[12px] font-bold px-3 py-1.5 rounded-[3px] cursor-pointer"
                      >
                        [Mark Unrelated]
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Search and Guidance Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[3px] border border-[#cbd5e1] shadow-xs">
            <input
              className="w-full sm:w-96 rounded-[3px] border border-[#cbd5e1] px-3 py-1.5 text-[13px] text-[#002244] outline-none focus:border-[#003366]"
              placeholder="Filter by institution name or Case ID (e.g. ABC College)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-[12px] text-[#475569] flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#003366]" />
              <span>AI produces a potential overlap score. Authorized officials make the binding legal determination.</span>
            </div>
          </div>

          {/* Main Overlap Comparison Table */}
          <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
            <div className="table-scroll">
              <table className="w-full min-w-[1100px] text-left text-[13px]">
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
                  {links.map((l) => {
                    const a = snapshot.cases.find((c) => c.id === l.source_case_id)
                    const b = snapshot.cases.find((c) => c.id === l.target_case_id)
                    const inst = snapshot.institutions.find((i) => i.id === a?.institution_id)
                    if (!a || !b) return null

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
                          {l.confirmed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803d] bg-[#dcfce7] px-1.5 py-0.2 rounded mt-1 border border-[#bbf7d0]">
                              <CheckCircle2 size={11} /> Linked
                            </span>
                          )}
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
                            <span
                              className={`font-mono font-bold text-[13px] ${
                                l.similarity_score >= 85 ? 'text-[#b91c1c]' : l.similarity_score >= 70 ? 'text-[#b45309]' : 'text-[#003366]'
                              }`}
                            >
                              {l.similarity_score}%
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider block mt-0.5 ${
                              l.similarity_score >= 85 ? 'text-[#b91c1c]' : l.similarity_score >= 70 ? 'text-[#b45309]' : 'text-[#64748b]'
                            }`}
                          >
                            {l.similarity_score >= 85 ? 'Potential Duplicate' : l.similarity_score >= 70 ? 'Potentially Related' : 'Weak Relation'}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[260px]">
                          <ul className="text-[11px] text-[#334155] space-y-1">
                            {l.reasons.map((r, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-[#003366] font-bold">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                          {l.coordination_requested && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded mt-1.5">
                              ⏳ Bilateral Coordination Active
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1.5 items-stretch min-w-[160px]">
                            <button
                              type="button"
                              onClick={() => setComparingLink(l)}
                              className="text-[11px] py-1 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-[3px] transition cursor-pointer"
                            >
                              Compare Cases Side-by-Side
                            </button>
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
                            <button
                              type="button"
                              onClick={() => {
                                setCoordMessageModal({ linkId: l.id, caseA: a, caseB: b })
                              }}
                              className="text-[11px] py-1 bg-[#f0f4f8] text-[#003366] border border-[#cbd5e1] font-bold rounded-[3px] hover:bg-[#e2e8f0] transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <MessageSquare size={12} />
                              <span>Coordination Thread</span>
                            </button>
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
      )}

      {/* TAB 2: CROSS-BUREAU COORDINATION HUB (SECTION 17) */}
      {activeTab === 'coordination' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#fffbeb] border-l-4 border-l-[#d97706] border border-[#fef3c7] rounded-[3px] flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#d97706] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-[#92400e] text-[14px]">
                Potential Parallel Activity — Coordination Required
              </h3>
              <p className="text-[12px] text-[#78350f] mt-0.5 leading-relaxed">
                When the same technical institution has active complaints concurrently open across multiple Bureaus/Cells (e.g. Regulation Bureau, PGRC, Regional Office), bilateral coordination is mandated to prevent contradictory notices, duplicate proceedings, or institutional evasion.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {multiBureauInstitutions.map((entry) => {
              const { inst, totalActive, rbCases, pgrcCases, roCases } = entry
              return (
                <div key={inst.id} className="rounded-[3px] border border-[#cbd5e1] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#e2e8f0] pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building size={18} className="text-[#003366]" />
                        <h4 className="text-[16px] font-bold text-[#003366]">{inst.institution_name}</h4>
                      </div>
                      <p className="text-[11px] text-[#64748b] font-mono">
                        Permanent ID: {inst.aicte_permanent_id} · {inst.city}, {inst.state} ({inst.region} Region)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-[#b91c1c] text-white font-bold text-[11px] px-2.5 py-1 rounded">
                        {totalActive} Active Parallel Cases
                      </span>
                      <Link
                        to={`/institutions/${inst.id}`}
                        className="bg-[#003366] text-white text-[12px] font-bold px-3 py-1 rounded hover:bg-[#002244]"
                      >
                        Institution 360° →
                      </Link>
                    </div>
                  </div>

                  {/* Multi-Bureau Active Breakdown Grid */}
                  <div className="grid md:grid-cols-3 gap-3 text-[12px]">
                    {/* Regulation Bureau */}
                    <div className="border border-[#cbd5e1] rounded-[3px] p-3 bg-[#f8fafc]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#003366]">Regulation Bureau (RB)</span>
                        <span className="font-bold bg-[#003366] text-white px-2 py-0.2 rounded text-[11px]">
                          {rbCases.length} active
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {rbCases.map((c) => (
                          <li key={c.id} className="border-b border-[#e2e8f0] pb-1">
                            <Link to={`/complaints/${c.id}`} className="font-mono font-bold text-[#003366] hover:underline">
                              {c.case_id}
                            </Link>
                            <span className="text-[#64748b] block text-[11px] line-clamp-1">{c.subject}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* PGRC */}
                    <div className="border border-[#cbd5e1] rounded-[3px] p-3 bg-[#f8fafc]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#003366]">Public Grievance Cell (PGRC)</span>
                        <span className="font-bold bg-[#003366] text-white px-2 py-0.2 rounded text-[11px]">
                          {pgrcCases.length} active
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {pgrcCases.map((c) => (
                          <li key={c.id} className="border-b border-[#e2e8f0] pb-1">
                            <Link to={`/complaints/${c.id}`} className="font-mono font-bold text-[#003366] hover:underline">
                              {c.case_id}
                            </Link>
                            <span className="text-[#64748b] block text-[11px] line-clamp-1">{c.subject}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Regional Office */}
                    <div className="border border-[#cbd5e1] rounded-[3px] p-3 bg-[#f8fafc]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#003366]">Regional Office (RO)</span>
                        <span className="font-bold bg-[#003366] text-white px-2 py-0.2 rounded text-[11px]">
                          {roCases.length} active
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {roCases.length === 0 ? (
                          <li className="text-[#94a3b8] italic">No active regional inquiries</li>
                        ) : (
                          roCases.map((c) => (
                            <li key={c.id} className="border-b border-[#e2e8f0] pb-1">
                              <Link to={`/complaints/${c.id}`} className="font-mono font-bold text-[#003366] hover:underline">
                                {c.case_id}
                              </Link>
                              <span className="text-[#64748b] block text-[11px] line-clamp-1">{c.subject}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Coordination Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                    <span className="text-[#475569]">
                      Independent case histories are maintained even when files are linked for joint review.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (rbCases[0] && pgrcCases[0]) {
                            linkCases(rbCases[0].id, pgrcCases[0].id, profile)
                          }
                          setActionFeedback(`✓ Joint review registered for ${inst.institution_name} across RB & PGRC. Bureau Heads notified.`)
                          setTimeout(() => setActionFeedback(null), 3500)
                        }}
                        className="bg-[#003366] text-white font-bold px-3 py-1.5 rounded-[3px] hover:bg-[#002244] cursor-pointer flex items-center gap-1.5"
                      >
                        <Users size={14} />
                        <span>Assign Joint Review</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (rbCases[0] && pgrcCases[0]) {
                            linkCases(rbCases[0].id, pgrcCases[0].id, profile)
                            const link = snapshot.links.find(
                              (l) => (l.source_case_id === rbCases[0].id && l.target_case_id === pgrcCases[0].id) ||
                                     (l.source_case_id === pgrcCases[0].id && l.target_case_id === rbCases[0].id)
                            )
                            if (link) requestCoordination(link.id, profile)
                          }
                          setActionFeedback(`⏳ Joint Bilateral Coordination request broadcasted to all concerned Bureau Heads for ${inst.institution_name}.`)
                          setTimeout(() => setActionFeedback(null), 3500)
                        }}
                        className="bg-[#ff9933] text-[#002244] font-bold px-3 py-1.5 rounded-[3px] hover:bg-[#e68a00] cursor-pointer"
                      >
                        Request Joint Coordination
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION 16: INTERACTIVE SIDE-BY-SIDE [COMPARE CASES] MODAL */}
      {comparingLink && (() => {
        const a = snapshot.cases.find((c) => c.id === comparingLink.source_case_id)
        const b = snapshot.cases.find((c) => c.id === comparingLink.target_case_id)
        const inst = snapshot.institutions.find((i) => i.id === a?.institution_id)
        if (!a || !b) return null

        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[3px] border-2 border-[#003366] max-w-5xl w-full shadow-2xl my-8 overflow-hidden">
              {/* Modal Header */}
              <div className="bg-[#003366] px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-bold">AI Overlap & Duplicate Case File Comparison</h3>
                  <p className="text-[12px] text-white/80">
                    {inst?.institution_name} ({inst?.aicte_permanent_id}) — Section 16 Semantic Similarity Cross-Reference
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setComparingLink(null)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Scoring & Structural Verification Banner */}
                <div className="bg-[#f0f4f8] border border-[#cbd5e1] p-4 rounded-[3px] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                      AI Semantic Similarity Score
                    </span>
                    <p className="text-[26px] font-black font-mono text-[#b91c1c]">
                      {comparingLink.similarity_score}% Match
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                    <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                      <span className="text-[#64748b] block text-[10px] font-bold uppercase">Same Institution</span>
                      <span className="font-bold text-[#15803d]">✓ 100% Match</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                      <span className="text-[#64748b] block text-[10px] font-bold uppercase">Category Overlap</span>
                      <span className="font-bold text-[#15803d]">✓ Identical Category</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                      <span className="text-[#64748b] block text-[10px] font-bold uppercase">Semantic Similarity</span>
                      <span className="font-bold text-[#15803d]">✓ 92% Embedding</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                      <span className="text-[#64748b] block text-[10px] font-bold uppercase">Related Time Window</span>
                      <span className="font-bold text-[#15803d]">✓ Within 48 Hours</span>
                    </div>
                  </div>
                </div>

                {/* Side-by-side Columns: Case A vs Case B */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column: Case A */}
                  <div className="border-2 border-[#003366] rounded-[3px] p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
                      <span className="font-bold text-[13px] text-[#003366]">Case File A (Primary)</span>
                      <span className="bg-[#003366] text-white font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                        {snapshot.bureaus.find((x) => x.id === a.bureau_id)?.code}
                      </span>
                    </div>

                    <div className="space-y-2 text-[13px]">
                      <div>
                        <span className="text-[#64748b] text-[11px] block font-bold uppercase">Case ID</span>
                        <Link to={`/complaints/${a.id}`} className="font-mono font-bold text-[#003366] hover:underline text-[15px]">
                          {a.case_id}
                        </Link>
                      </div>
                      <div>
                        <span className="text-[#64748b] text-[11px] block font-bold uppercase">Subject</span>
                        <p className="font-bold text-[#1e293b]">{a.subject}</p>
                      </div>
                      <div>
                        <span className="text-[#64748b] text-[11px] block font-bold uppercase">Complainant Narrative</span>
                        <p className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[12px] text-[#334155] leading-relaxed">
                          {a.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
                        <div>
                          <span className="text-[#64748b] block text-[11px]">Received Date:</span>
                          <strong className="text-[#1e293b]">{a.received_date.slice(0, 10)}</strong>
                        </div>
                        <div>
                          <span className="text-[#64748b] block text-[11px]">Current Status:</span>
                          <strong className="text-[#003366]">{a.status}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Case B */}
                  <div className="border-2 border-[#ff9933] rounded-[3px] p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b border-[#fed7aa] pb-2">
                      <span className="font-bold text-[13px] text-[#003366]">Case File B (Target Parallel)</span>
                      <span className="bg-[#ff9933] text-[#002244] font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                        {snapshot.bureaus.find((x) => x.id === b.bureau_id)?.code}
                      </span>
                    </div>

                    <div className="space-y-2 text-[13px]">
                      <div>
                        <span className="text-[#64748b] text-[11px] block font-bold uppercase">Case ID</span>
                        <Link to={`/complaints/${b.id}`} className="font-mono font-bold text-[#003366] hover:underline text-[15px]">
                          {b.case_id}
                        </Link>
                      </div>
                      <div>
                        <span className="text-[#64748b] text-[11px] block font-bold uppercase">Subject</span>
                        <p className="font-bold text-[#1e293b]">{b.subject}</p>
                      </div>
                      <div>
                        <span className="text-[#64748b] text-[11px] block font-bold uppercase">Complainant Narrative</span>
                        <p className="p-3 bg-[#fff7ed] border border-[#ffedd5] rounded text-[12px] text-[#334155] leading-relaxed">
                          {b.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
                        <div>
                          <span className="text-[#64748b] block text-[11px]">Received Date:</span>
                          <strong className="text-[#1e293b]">{b.received_date.slice(0, 10)}</strong>
                        </div>
                        <div>
                          <span className="text-[#64748b] block text-[11px]">Current Status:</span>
                          <strong className="text-[#003366]">{b.status}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions at bottom */}
                <div className="border-t border-[#e2e8f0] pt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleUnrelated(comparingLink.id)}
                    className="border border-[#cbd5e1] hover:bg-gray-100 text-[#64748b] font-bold text-[13px] px-4 py-2 rounded-[3px] cursor-pointer"
                  >
                    Mark Unrelated & Dismiss
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCoordination(comparingLink.id, a.case_id, b.case_id)
                        setComparingLink(null)
                      }}
                      className="bg-[#ff9933] hover:bg-[#e68a00] text-[#002244] font-bold text-[13px] px-5 py-2 rounded-[3px] transition cursor-pointer shadow-xs"
                    >
                      Request Bilateral Coordination
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLink(a.id, b.id, a.case_id, b.case_id)
                        setComparingLink(null)
                      }}
                      className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] px-5 py-2 rounded-[3px] transition cursor-pointer shadow-xs"
                    >
                      Confirm Link (Keep Independent)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* SECTION 17: COORDINATION THREAD MODAL */}
      {coordMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border-2 border-[#003366] max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-[#003366] px-5 py-3 text-white flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold">Inter-Bureau Coordination Thread</h3>
                <p className="text-[11px] text-white/80">
                  {coordMessageModal.caseA.case_id} ↔ {coordMessageModal.caseB.case_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoordMessageModal(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Message History */}
              <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[3px]">
                {(coordHistory[coordMessageModal.linkId] || []).length === 0 ? (
                  <p className="text-[12px] text-[#64748b] text-center py-4">
                    No coordination messages on this case pair yet. Send the first dispatch below.
                  </p>
                ) : (
                  (coordHistory[coordMessageModal.linkId] || []).map((msg, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-[#cbd5e1] rounded text-[12px]">
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="font-bold text-[#003366]">{msg.sender}</span>
                        <span className="text-[#64748b]">{msg.time}</span>
                      </div>
                      <p className="text-[#334155]">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Send New Dispatch */}
              <form onSubmit={handleSendCoordMessage} className="space-y-2">
                <label className="block text-[12px] font-bold text-[#003366]">
                  Internal Coordination Note / Decision Directive:
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[12px] outline-none focus:border-[#003366]"
                  placeholder="Record internal consultation, agreed joint action, or inspection timing..."
                  value={coordMessageText}
                  onChange={(e) => setCoordMessageText(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCoordMessageModal(null)}
                    className="px-3 py-1.5 border border-[#cbd5e1] text-[12px] font-bold rounded"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-[12px] font-bold rounded flex items-center gap-1 shadow-xs"
                  >
                    <MessageSquare size={13} />
                    <span>Send Internal Dispatch</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
