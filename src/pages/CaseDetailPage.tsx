import { useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  acceptTransfer,
  addCaseRemark,
  assignOfficer,
  caseInsights,
  escalateCase,
  getSnapshot,
  linkCases,
  markUnrelated,
  recordInstitutionResponse,
  requestCoordination,
  requestInformation,
  requestInstitutionResponse,
  requestTransfer,
  roleCan,
  subscribe,
  updateCaseStatus,
  updateVerification,
  uploadDocument,
} from '../demo/store'
import { CASE_STATUSES, type CaseDocument, type CaseStatus } from '../types'
import { ActionNotice, Breadcrumbs, Button, Card, ConfirmationDialog, DocumentViewerModal, EmptyState, Field, PriorityBadge, SlaBadge, StatusBadge, inputClass } from '../components/ui'
import { formatDate, formatDateTime, slaState } from '../lib/utils'

export function CaseDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [remark, setRemark] = useState('')
  const [infoText, setInfoText] = useState('Additional evidence / clarification is requested.')
  const [transferTo, setTransferTo] = useState('bureau-rb')
  const [assignTo, setAssignTo] = useState('')
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => void }>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<CaseDocument | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  if (!profile) return null
  const c = snapshot.cases.find((x) => x.id === id)
  if (!c) return <EmptyState title="Case not found" body="This case is not in the current workspace or is outside your access." />
  const inst = snapshot.institutions.find((i) => i.id === c.institution_id)!
  const bureau = snapshot.bureaus.find((b) => b.id === c.bureau_id)!
  const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
  const insights = caseInsights(c)
  const actions = snapshot.actions.filter((a) => a.case_id === c.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const docs = snapshot.documents.filter((d) => d.case_id === c.id)
  const last = actions[0]
  const canWrite = roleCan(profile.role, 'writeCase')
  const officers = snapshot.profiles.filter(
    (p) => p.active && (p.role === 'CASE_OFFICER' || p.role === 'REGIONAL_OFFICER' || p.role === 'BUREAU_HEAD'),
  )
  const suspicious = snapshot.suspiciousPatterns.find((s) => s.related_case_ids.includes(c.id))

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Complaints', to: '/complaints' },
          { label: `CASE #${c.case_id}` },
        ]}
      />
      <ActionNotice message={notice} onDismiss={() => setNotice(null)} />

      {c.pending_transfer_bureau_id ? (
        <div className="rounded-[3px] border-2 border-[#f59e0b] bg-[#fffbeb] p-3.5 text-[13px] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="text-[#92400e]">
            <p className="font-bold text-[14px]">⚠️ Case Transfer Requested</p>
            <p className="text-[12px] mt-0.5">
              This case file has been requested for transfer to{' '}
              <strong>{snapshot.bureaus.find((b) => b.id === c.pending_transfer_bureau_id)?.name} ({snapshot.bureaus.find((b) => b.id === c.pending_transfer_bureau_id)?.code})</strong>.
            </p>
          </div>
          {profile.bureau_id === c.pending_transfer_bureau_id || profile.role === 'SUPER_ADMIN' ? (
            <Button
              onClick={() => {
                acceptTransfer(c.id, profile)
                setNotice('File transfer accepted! Case is now under your Bureau authority.')
              }}
            >
              Accept Bureau Transfer
            </Button>
          ) : (
            <span className="text-[12px] font-semibold text-[#b45309] bg-white px-2.5 py-1 rounded border border-[#fde68a]">
              Awaiting Target Bureau Acceptance
            </span>
          )}
        </div>
      ) : null}
      <div className="rounded-sm border border-line bg-white p-5 app-shadow">
        <p className="text-[12px] font-semibold tracking-wide text-muted uppercase">Case file</p>
        <h1 className="font-display text-[30px] text-navy">CASE #{c.case_id}</h1>
        <Link to={`/institutions/${inst.id}`} className="text-[15px] font-medium text-brand">
          {inst.institution_name}
        </Link>
        <p className="text-[13px] text-muted">
          {inst.aicte_permanent_id} · {inst.state} · {inst.region}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
          <SlaBadge state={slaState(c)} />
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-[13px]">
          <div>
            <dt className="text-muted">Bureau</dt>
            <dd className="font-semibold">{bureau.code} — {bureau.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Assigned officer</dt>
            <dd className="font-semibold">{officer?.full_name ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt className="text-muted">Last action</dt>
            <dd>{last ? last.action_description : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Deadline</dt>
            <dd>{formatDate(c.expected_disposal_date)}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-sm bg-soft px-3 py-2 text-[13px]">
          <strong>Next action:</strong> {insights.recommended}{' '}
          <span className="text-muted">AI-assisted suggestion — officer decision required: {insights.next}</span>
        </p>
      </div>

      {insights.relatedCount > 0 ? (
        <div className="rounded-sm border border-warning/40 bg-[#fff7ed] p-4">
          <p className="font-display text-[18px] text-navy">Potential cross-bureau overlap</p>
          <p className="mt-1 text-[14px]">
            Related cases: {insights.relatedCount} · Highest similarity: {insights.highest}% · Potential overlap:{' '}
            {insights.highest >= 85 ? 'HIGH' : insights.highest >= 70 ? 'MEDIUM' : 'LOW'}
          </p>
          <ul className="mt-2 space-y-2 text-[13px]">
            {insights.relatedCases.slice(0, 4).map(({ link, other }) => (
              <li key={link.id} className="rounded-sm border border-line bg-white p-3">
                <p className="font-semibold">
                  {c.case_id} ({bureau.code}) ↔ {other.case_id} ({snapshot.bureaus.find((b) => b.id === other.bureau_id)?.code}) · {link.similarity_score}%
                </p>
                <p className="text-muted">Why this case was flagged</p>
                <ul className="mt-1 list-disc pl-5">
                  {link.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-1 text-[12px] text-muted">
                  Institution {Math.round(link.breakdown.institution * 40)}% · Semantic {Math.round(link.breakdown.semantic * 35)}% · Category{' '}
                  {Math.round(link.breakdown.category * 15)}% · Temporal {Math.round(link.breakdown.temporal * 10)}% · Total {link.similarity_score}% (configurable prototype weights)
                </p>
                <p className="mt-1">Final decision: AICTE Officer. Human verification required.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link to={`/complaints/${other.id}`} className="text-brand font-semibold">View related case</Link>
                  {roleCan(profile.role, 'transfer') || profile.role === 'SUPER_ADMIN' ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          linkCases(c.id, other.id, profile)
                          setNotice(`Cases ${c.case_id} and ${other.case_id} have been officially linked.`)
                        }}
                      >
                        Link cases
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          markUnrelated(link.id, profile)
                          setNotice(`Link between ${c.case_id} and ${other.case_id} dismissed as unrelated.`)
                        }}
                      >
                        Mark as unrelated
                      </Button>
                      <Button
                        onClick={() => {
                          requestCoordination(link.id, profile)
                          setNotice(`Cross-Bureau coordination request dispatched for ${c.case_id} ↔ ${other.case_id}.`)
                        }}
                      >
                        Request coordination
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suspicious ? (
        <div className="rounded-sm border border-danger/30 bg-[#fff1f2] p-4 text-[14px]">
          <p className="font-display text-[18px] text-navy">Suspicious submission pattern</p>
          <p>Institution: {inst.institution_name}</p>
          <p>Related submissions: {suspicious.related_case_ids.length}</p>
          <p>Average text similarity: {suspicious.average_similarity}%</p>
          <p>Submission window: {suspicious.submission_window_minutes} minutes</p>
          <p>Pattern: Multiple closely timed submissions</p>
          <p className="mt-2 font-semibold">Action: Human verification required. The system does not reject these complaints automatically.</p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Complaint summary" className="xl:col-span-2">
          <dl className="grid gap-2 text-[14px] sm:grid-cols-2">
            <div><dt className="text-muted">Category</dt><dd>{c.complaint_category}</dd></div>
            <div><dt className="text-muted">Source</dt><dd>{c.source}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted">Subject</dt><dd>{c.subject}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted">Description</dt><dd>{c.description}</dd></div>
            <div><dt className="text-muted">Received</dt><dd>{formatDateTime(c.received_date)}</dd></div>
            <div><dt className="text-muted">Complainant type</dt><dd>{c.complainant_type}</dd></div>
          </dl>
        </Card>
        <Card title="Verification">
          <ul className="space-y-2 text-[14px]">
            <li>Complainant mobile: {c.mobile_verified ? 'Verified' : 'Pending'}</li>
            <li>Evidence: {c.documents_received ? 'Documents received' : 'Pending'}</li>
            <li>Institution response: {c.institution_response_received ? 'Received' : 'Pending'}</li>
            <li>Verification status: {c.verification_status.replaceAll('_', ' ')}</li>
          </ul>
          {canWrite ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  updateVerification(c.id, { mobile_verified: true, verification_status: 'UNDER_REVIEW' }, profile)
                  setNotice('Complainant mobile number verified. Status updated to UNDER REVIEW.')
                }}
              >
                Mark Mobile Verified
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  updateVerification(c.id, { verification_status: 'VERIFIED' }, profile)
                  setNotice('Case file marked as officially VERIFIED.')
                }}
              >
                Mark Verified
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      <Card title="AI-assisted case analysis">
        <p className="text-[14px]">{insights.summary}</p>
        <p className="mt-2 text-[13px] text-muted">
          Suggested category: {insights.suggestedCategory.category} ({Math.round(insights.suggestedCategory.confidence * 100)}% lexical confidence).
        </p>
        <p className="mt-2 text-[13px] font-medium">AI-assisted suggestion — officer decision required.</p>
      </Card>

      <Card title="Official Bureau Actions & Case Workflow">
        {canWrite ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold text-[#003366] uppercase tracking-wide">
                Case Disposition Status (Click to transition)
              </span>
              <div className="flex flex-wrap gap-2">
                {CASE_STATUSES.map((s) => {
                  const isCurrent = c.status === s
                  return (
                    <Button
                      key={s}
                      variant={isCurrent ? 'primary' : 'secondary'}
                      disabled={isCurrent}
                      onClick={() =>
                        setConfirm({
                          title: `Move to ${s.replaceAll('_', ' ')}`,
                          body: `Update ${c.case_id} from ${c.status.replaceAll('_', ' ')} to ${s.replaceAll('_', ' ')}? This status change will be logged in the permanent audit trail.`,
                          run: () => {
                            updateCaseStatus(c.id, s as CaseStatus, profile, `Status updated to ${s}`)
                            setNotice(`Case status successfully changed to ${s.replaceAll('_', ' ')}.`)
                          },
                        })
                      }
                      className={isCurrent ? 'bg-[#003366] text-white opacity-100 font-bold' : ''}
                    >
                      {isCurrent ? `✓ ${s.replaceAll('_', ' ')} (Current)` : s.replaceAll('_', ' ')}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3 space-y-2">
              <Field label="Record Official Case Diary Remark / Noting">
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Enter official officer noting or remarks regarding this grievance file..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </Field>
              <Button
                disabled={!remark.trim()}
                onClick={() => {
                  if (remark.trim()) {
                    addCaseRemark(c.id, remark.trim(), profile)
                    setRemark('')
                    setNotice('Official remark successfully appended to the case file timeline.')
                  }
                }}
              >
                Record Remark
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3">
                <Field label="Request Additional Evidence / Clarification">
                  <input className={inputClass} value={infoText} onChange={(e) => setInfoText(e.target.value)} />
                </Field>
                <Button
                  className="mt-2.5"
                  variant="secondary"
                  onClick={() => {
                    requestInformation(c.id, infoText, profile)
                    setNotice('Official request for additional evidence dispatched to complainant.')
                  }}
                >
                  Request Evidence
                </Button>
              </div>

              <div className="flex flex-col justify-between gap-2 rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3">
                <span className="block text-[11px] font-bold text-[#003366] uppercase tracking-wide">
                  Institution Notice & Review
                </span>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      requestInstitutionResponse(c.id, 'Institution is requested to furnish comments with supporting records within 7 days.', profile)
                      setNotice('Formal notice dispatched to institution. Status updated to Pending Institution Response.')
                    }}
                  >
                    Send Institution Response Notice
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      recordInstitutionResponse(c.id, 'Institution response placed on record (verification pending).', profile)
                      setNotice('Institution written response successfully placed on case record.')
                    }}
                  >
                    Record Institution Response
                  </Button>
                  <Button
                    variant="secondary"
                    className="border-[#b45309] text-[#b45309] hover:bg-[#fff7ed]"
                    onClick={() => {
                      escalateCase(c.id, 'Escalated for senior review.', profile)
                      setNotice('Case successfully escalated to Senior Management review queue.')
                    }}
                  >
                    Escalate to Senior Management
                  </Button>
                </div>
              </div>
            </div>

            {roleCan(profile.role, 'assign') || profile.role === 'SUPER_ADMIN' ? (
              <div className="rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Field label="Assign Official Case Officer">
                    <select
                      className={inputClass}
                      value={assignTo || c.assigned_officer_id || ''}
                      onChange={(e) => setAssignTo(e.target.value)}
                    >
                      <option value="">-- Select Officer to Assign / Delegate --</option>
                      {snapshot.bureaus.map((b) => {
                        const bOfficers = officers.filter((o) => o.bureau_id === b.id)
                        if (bOfficers.length === 0) return null
                        return (
                          <optgroup key={b.id} label={`${b.name} (${b.code})`}>
                            {bOfficers.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.full_name} — {o.designation}
                              </option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </select>
                  </Field>
                </div>
                <Button
                  disabled={!assignTo}
                  onClick={() => {
                    assignOfficer(c.id, assignTo, profile)
                    const assigned = officers.find((o) => o.id === assignTo)
                    setNotice(`Case file successfully assigned to ${assigned?.full_name ?? 'Officer'}.`)
                  }}
                >
                  Assign Officer
                </Button>
              </div>
            ) : null}

            {roleCan(profile.role, 'transfer') || profile.role === 'SUPER_ADMIN' ? (
              <div className="rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Field label="Cross-Bureau File Transfer">
                    <select className={inputClass} value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                      {snapshot.bureaus
                        .filter((b) => b.id !== c.bureau_id)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} — {b.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const targetBureau = snapshot.bureaus.find((b) => b.id === transferTo)
                    requestTransfer(c.id, transferTo, `Transfer requested to ${targetBureau?.code}`, profile)
                    setNotice(`Transfer request submitted to ${targetBureau?.code} Bureau.`)
                  }}
                >
                  Request Bureau Transfer
                </Button>
                {c.pending_transfer_bureau_id && (profile.bureau_id === c.pending_transfer_bureau_id || profile.role === 'SUPER_ADMIN') ? (
                  <Button
                    onClick={() => {
                      acceptTransfer(c.id, profile)
                      setNotice('File transfer accepted! Case is now under your Bureau authority.')
                    }}
                  >
                    Accept Transfer
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3">
              <label className="block text-[11px] font-bold text-[#003366] uppercase tracking-wide mb-1">
                Upload Official Supporting Document (PDF / Image / Word, max 8 MB)
              </label>
              <input
                type="file"
                className="text-[13px] text-[#475569] file:mr-3 file:py-1 file:px-3 file:rounded-[3px] file:border file:border-[#003366] file:text-[12px] file:font-bold file:bg-[#003366] file:text-white file:cursor-pointer hover:file:bg-[#002244]"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadError(null)
                  try {
                    await uploadDocument(c.id, file, profile)
                    setNotice(`Document "${file.name}" uploaded and appended to case record.`)
                  } catch (err) {
                    setUploadError(err instanceof Error ? err.message : 'Upload failed')
                  }
                }}
              />
              {uploadError ? <p className="mt-1 text-[13px] text-danger font-semibold">{uploadError}</p> : null}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted">Your role has read access to this file.</p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Action timeline">
          <ol className="space-y-3">
            {actions.map((a) => (
              <li key={a.id} className="border-l-2 border-soft pl-3 text-[13px]">
                <p className="text-muted">{formatDateTime(a.created_at)}</p>
                <p className="font-medium text-navy">{a.action_description}</p>
                <p className="text-muted">
                  {snapshot.profiles.find((p) => p.id === a.performed_by)?.full_name ?? 'System'} · {snapshot.bureaus.find((b) => b.id === (a.from_bureau_id ?? c.bureau_id))?.code} · {a.action_type}
                </p>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Documents">
          {docs.length === 0 ? (
            <EmptyState title="No documents yet" body="Upload evidence, notices or replies to place them on the case file." />
          ) : (
            <ul className="space-y-2 text-[13px]">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between border-b border-line py-2">
                  <span>
                    {d.document_name}
                    <span className="block text-muted">{d.storage_path}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setViewingDoc(d)}>
                      View
                    </Button>
                    {d.data_url ? (
                      <a className="text-brand font-semibold text-[13px]" href={d.data_url} download={d.document_name}>
                        Download
                      </a>
                    ) : (
                      <span className="text-muted text-[12px]">On record</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmationDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run()
          setConfirm(null)
        }}
      />

      <DocumentViewerModal
        open={!!viewingDoc}
        documentName={viewingDoc?.document_name ?? ''}
        dataUrl={viewingDoc?.data_url}
        storagePath={viewingDoc?.storage_path}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  )
}
