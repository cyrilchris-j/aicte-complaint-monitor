import { useState } from 'react'
import type { ComplaintCase, Institution, Bureau } from '../types'
import { Button } from './ui'
import {
  summarizeComplaint,
  tagAphClauses,
  draftShowCauseNotice,
  generateCaseDossier,
  APH_CLAUSES,
  type ComplaintSummary,
  type AphTagResult,
  type NoticeDraftResult,
  type CaseDossierSummary,
} from '../lib/gemini'
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, FileText, Layers, BookOpen } from 'lucide-react'
import { caseAgeDays } from '../lib/utils'

interface AiCasePanelProps {
  complaint: ComplaintCase
  institution: Institution
  bureau: Bureau
  relatedCasesCount: number
}

type AiTab = 'summary' | 'aph' | 'dossier' | 'notice'

export function AiCasePanel({ complaint: c, institution: inst, bureau, relatedCasesCount }: AiCasePanelProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AiTab>('summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [summary, setSummary] = useState<ComplaintSummary | null>(null)
  const [aphResult, setAphResult] = useState<AphTagResult | null>(null)
  const [dossier, setDossier] = useState<CaseDossierSummary | null>(null)
  const [noticeDraft, setNoticeDraft] = useState<NoticeDraftResult | null>(null)
  const [selectedAphClause, setSelectedAphClause] = useState('APH-10.1')
  const [selectedNoticeType, setSelectedNoticeType] = useState('Show Cause Notice')

  const NOTICE_TYPES = [
    'Show Cause Notice',
    'Notice for Submission of Information',
    'Summons for Personal Hearing',
    'Notice for Withdrawal of Approval',
  ]

  async function run(fn: () => Promise<void>) {
    setLoading(true)
    setError(null)
    try {
      await fn()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI analysis failed.'
      if (msg.includes('VITE_AI_API_KEY')) {
        setError('Gemini API key is not configured. Set VITE_AI_API_KEY in your .env file.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const urgencyColors: Record<string, string> = {
    LOW: 'bg-[#dcfce7] text-[#15803d]',
    MEDIUM: 'bg-[#fef3c7] text-[#b45309]',
    HIGH: 'bg-[#fee2e2] text-[#b91c1c]',
    CRITICAL: 'bg-[#7f1d1d] text-white',
  }
  const severityColors: Record<string, string> = {
    MINOR: 'bg-[#dcfce7] text-[#15803d]',
    MODERATE: 'bg-[#fef3c7] text-[#b45309]',
    SERIOUS: 'bg-[#fee2e2] text-[#b91c1c]',
    SEVERE: 'bg-[#7f1d1d] text-white',
  }

  return (
    <div className="rounded-sm border border-[#ddd6fe] bg-[#faf5ff] shadow-xs">
      {/* Header Toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#7c3aed]" />
          <span className="font-bold text-[14px] text-[#4c1d95]">AI Case Intelligence</span>
          <span className="text-[11px] bg-[#ede9fe] text-[#5b21b6] px-2 py-0.5 rounded font-bold border border-[#ddd6fe]">
            Gemini AI · Human verification required
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-[#7c3aed]" /> : <ChevronDown size={16} className="text-[#7c3aed]" />}
      </button>

      {!open ? null : (
        <div className="border-t border-[#ddd6fe] px-4 pb-4 pt-3">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 mb-4">
            {([
              { id: 'summary' as AiTab, label: 'Complaint Summary', icon: FileText },
              { id: 'aph' as AiTab, label: 'APH Clause Tagging', icon: BookOpen },
              { id: 'dossier' as AiTab, label: 'Case Dossier', icon: Layers },
              { id: 'notice' as AiTab, label: 'Notice Drafter', icon: AlertTriangle },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-[3px] cursor-pointer transition ${
                  activeTab === id
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-white text-[#6d28d9] border border-[#ddd6fe] hover:bg-[#ede9fe]'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-3 rounded-[3px] bg-[#fee2e2] border border-[#fca5a5] p-3 text-[12px] text-[#b91c1c] font-semibold">
              ⚠ {error}
            </div>
          )}

          {/* ── Tab: Summary ────────────────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div>
              {!summary ? (
                <div className="text-center py-4">
                  <p className="text-[13px] text-[#6d28d9] mb-3">
                    Gemini AI will extract key allegations, detect monetary amounts, assess urgency, and suggest the most appropriate AICTE complaint category.
                  </p>
                  <Button
                    onClick={() => run(async () => {
                      const r = await summarizeComplaint({
                        category: c.complaint_category,
                        subject: c.subject,
                        description: c.description,
                        complainantType: c.complainant_type,
                        institutionName: inst.institution_name,
                      })
                      setSummary(r)
                    })}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5"><Sparkles size={13} className="animate-spin" /> Analysing…</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Sparkles size={13} /> Generate AI Summary</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-[13px]">
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">One-Line Summary</p>
                    <p className="font-semibold text-[#1e293b]">{summary.oneLineSummary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                      <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Urgency Level</p>
                      <span className={`inline-block px-2.5 py-0.5 rounded font-bold text-[12px] ${urgencyColors[summary.urgencyLevel] ?? ''}`}>
                        {summary.urgencyLevel}
                      </span>
                    </div>
                    <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                      <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Disputed Amount</p>
                      <p className="font-bold text-[#1e293b]">{summary.monetaryAmount ?? 'None detected'}</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Key Allegations</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {summary.keyAllegations.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                      <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Suggested Category</p>
                      <p className="font-semibold">{summary.suggestedCategory}</p>
                      <p className="text-[11px] text-[#64748b] mt-0.5">{summary.suggestedSubCategory}</p>
                    </div>
                  </div>
                  <button onClick={() => setSummary(null)} className="text-[11px] text-[#7c3aed] hover:underline cursor-pointer">
                    Regenerate
                  </button>
                  <p className="text-[10px] text-[#94a3b8]">AI-generated analysis — authorised officer verification required. Not an official AICTE determination.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: APH Clause Tagging ─────────────────────────────────────── */}
          {activeTab === 'aph' && (
            <div>
              {!aphResult ? (
                <div className="text-center py-4">
                  <p className="text-[13px] text-[#6d28d9] mb-3">
                    Gemini AI will map this complaint to the most relevant clauses in the AICTE Approval Process Handbook (APH) and assess regulatory violation severity.
                  </p>
                  <Button
                    onClick={() => run(async () => {
                      const r = await tagAphClauses({
                        category: c.complaint_category,
                        subject: c.subject,
                        description: c.description,
                      })
                      setAphResult(r)
                    })}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5"><Sparkles size={13} className="animate-spin" /> Mapping clauses…</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><BookOpen size={13} /> Map to APH Clauses</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-[13px]">
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider">Primary Clause</span>
                      <span className="font-mono font-black text-[#4c1d95] bg-[#ede9fe] px-2 py-0.5 rounded text-[12px]">
                        {aphResult.primaryClause.id}
                      </span>
                      <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded ${severityColors[aphResult.violationSeverity] ?? ''}`}>
                        {aphResult.violationSeverity}
                      </span>
                    </div>
                    <p className="font-bold text-[#1e293b]">{aphResult.primaryClause.title}</p>
                    <p className="text-[#475569] mt-1">{aphResult.primaryClause.relevance}</p>
                  </div>
                  {aphResult.additionalClauses.length > 0 && (
                    <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                      <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-2">Additional Applicable Clauses</p>
                      <div className="space-y-2">
                        {aphResult.additionalClauses.map((cl, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="font-mono font-bold text-[#4c1d95] bg-[#ede9fe] px-1.5 py-0.5 rounded text-[11px] shrink-0">{cl.id}</span>
                            <div>
                              <p className="font-semibold text-[#1e293b]">{cl.title}</p>
                              <p className="text-[11px] text-[#475569]">{cl.relevance}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#b45309] uppercase tracking-wider mb-1">Compliance Risk Note</p>
                    <p>{aphResult.complianceRiskNote}</p>
                  </div>
                  <button onClick={() => setAphResult(null)} className="text-[11px] text-[#7c3aed] hover:underline cursor-pointer">
                    Regenerate
                  </button>
                  <p className="text-[10px] text-[#94a3b8]">AI-assisted APH mapping — legal verification by authorised officer required.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Case Dossier ─────────────────────────────────────────── */}
          {activeTab === 'dossier' && (
            <div>
              {!dossier ? (
                <div className="text-center py-4">
                  <p className="text-[13px] text-[#6d28d9] mb-3">
                    Gemini AI will produce a professional case dossier — executive summary, key findings, risk factors, and recommended disposal — ready for senior AICTE officials.
                  </p>
                  <Button
                    onClick={() => run(async () => {
                      const r = await generateCaseDossier({
                        caseId: c.case_id,
                        category: c.complaint_category,
                        subject: c.subject,
                        description: c.description,
                        status: c.status,
                        priority: c.priority,
                        daysPending: caseAgeDays(c),
                        relatedCasesCount,
                        institutionName: inst.institution_name,
                        complainantType: c.complainant_type,
                        hasDocuments: c.documents_received,
                        hasInstitutionResponse: c.institution_response_received,
                      })
                      setDossier(r)
                    })}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5"><Sparkles size={13} className="animate-spin" /> Generating…</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Layers size={13} /> Generate Case Dossier</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-[13px]">
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Executive Summary</p>
                    <p className="leading-relaxed">{dossier.executiveSummary}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                      <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Key Findings</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {dossier.keyFindings.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                      <p className="text-[11px] font-bold text-[#b91c1c] uppercase tracking-wider mb-1">Risk Factors</p>
                      <ul className="list-disc pl-4 space-y-1 text-[#b91c1c]">
                        {dossier.riskFactors.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Recommended Actions</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      {dossier.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                    </ol>
                  </div>
                  <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#b45309] uppercase tracking-wider mb-1">Disposal Recommendation</p>
                    <p className="font-semibold">{dossier.disposalRecommendation}</p>
                  </div>
                  <button onClick={() => setDossier(null)} className="text-[11px] text-[#7c3aed] hover:underline cursor-pointer">
                    Regenerate
                  </button>
                  <p className="text-[10px] text-[#94a3b8]">AI-assisted dossier — final disposal authority rests with the authorised AICTE officer.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Notice Drafter ─────────────────────────────────────────── */}
          {activeTab === 'notice' && (
            <div>
              {!noticeDraft ? (
                <div className="py-2 space-y-3">
                  <p className="text-[13px] text-[#6d28d9]">
                    Gemini AI will draft formal, authoritative statutory language for the selected notice type, citing APH clauses and student grievance specifics.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4c1d95] mb-1">Notice Type</label>
                      <select
                        value={selectedNoticeType}
                        onChange={e => setSelectedNoticeType(e.target.value)}
                        className="w-full rounded-[3px] border border-[#ddd6fe] px-3 py-1.5 text-[12px] outline-none"
                      >
                        {NOTICE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4c1d95] mb-1">APH Clause Reference</label>
                      <select
                        value={selectedAphClause}
                        onChange={e => setSelectedAphClause(e.target.value)}
                        className="w-full rounded-[3px] border border-[#ddd6fe] px-3 py-1.5 text-[12px] outline-none"
                      >
                        {APH_CLAUSES.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.id}: {cl.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={() => run(async () => {
                      const r = await draftShowCauseNotice({
                        caseId: c.case_id,
                        institutionName: inst.institution_name,
                        noticeType: selectedNoticeType,
                        category: c.complaint_category,
                        subject: c.subject,
                        description: c.description,
                        aphClause: selectedAphClause,
                        issuingBureau: bureau.name,
                      })
                      setNoticeDraft(r)
                    })}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5"><Sparkles size={13} className="animate-spin" /> Drafting…</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><AlertTriangle size={13} /> Draft {selectedNoticeType}</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-[13px]">
                  <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#b45309] uppercase tracking-wider mb-1">Notice Subject</p>
                    <p className="font-bold">{noticeDraft.subject}</p>
                  </div>
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Recitals</p>
                    <p className="leading-relaxed whitespace-pre-wrap">{noticeDraft.recitals}</p>
                  </div>
                  <div className="bg-white border border-[#e9d5ff] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">Directives</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{noticeDraft.directives}</p>
                  </div>
                  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-[3px] p-3">
                    <p className="text-[11px] font-bold text-[#b91c1c] uppercase tracking-wider mb-1">Legal Basis</p>
                    <p>{noticeDraft.legalBasis}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block bg-[#003366] text-white text-[11px] font-bold px-3 py-1 rounded">
                      Response Deadline: {noticeDraft.responseDeadlineDays} days
                    </span>
                    <button onClick={() => setNoticeDraft(null)} className="text-[11px] text-[#7c3aed] hover:underline cursor-pointer">
                      Regenerate
                    </button>
                  </div>
                  <p className="text-[10px] text-[#94a3b8]">
                    AI-drafted notice language — must be reviewed, edited, and authorised by a competent AICTE officer before issuance. This draft does not constitute an official notice.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

