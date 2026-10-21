import { useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, institutionMetrics, subscribe, visibleCases } from '../demo/store'
import { Breadcrumbs, EmptyState, KPICard, PageHeader, StatusBadge } from '../components/ui'
import { formatDateTime } from '../lib/utils'

const TABS = ['Overview', 'Complaints', 'Bureau Activity', 'Timeline', 'Documents', 'Related Cases'] as const

export function Institution360Page() {
  const { id } = useParams()
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  if (!profile) return null
  const inst = snapshot.institutions.find((i) => i.id === id)
  if (!inst) return <EmptyState title="Institution not found" body="The record is not available in this workspace." />
  const m = institutionMetrics(inst.id, profile)
  const cases = visibleCases(profile).filter((c) => c.institution_id === inst.id)
  const bureauCounts = snapshot.bureaus.map((b) => ({
    b,
    count: cases.filter((c) => c.bureau_id === b.id).length,
  }))
  const actions = snapshot.actions
    .filter((a) => cases.some((c) => c.id === a.case_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 40)
  const docs = snapshot.documents.filter((d) => cases.some((c) => c.id === d.case_id))
  const related = snapshot.links.filter(
    (l) => !l.dismissed && cases.some((c) => c.id === l.source_case_id || c.id === l.target_case_id),
  )

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Institutions', to: '/institutions' },
          { label: inst.institution_name },
        ]}
      />
      <PageHeader title={inst.institution_name} subtitle="Institution 360° · complete complaint picture across Bureaus and Cells" />
      <div className="rounded-sm border border-line bg-white p-4 app-shadow">
        <p className="text-[13px] text-muted">AICTE Permanent ID</p>
        <p className="font-semibold text-navy">{inst.aicte_permanent_id}</p>
        <p className="mt-2 text-[14px]">
          {inst.city}, {inst.state} · {inst.region} Region
        </p>
        <p className="text-[13px] text-muted">Status: {inst.status}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Total cases" value={m.total} />
        <KPICard label="Pending" value={m.pending} />
        <KPICard label="Under process" value={m.underProcess} />
        <KPICard label="Disposed" value={m.disposed} />
        <KPICard label="Overdue" value={m.overdue} tone={m.overdue ? 'danger' : 'neutral'} />
        <KPICard label="Related cases" value={m.related} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1 border-b-2 border-[#003366]">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-2.5 text-[13px] font-bold transition rounded-t-[3px] cursor-pointer ${
              tab === t
                ? 'bg-[#003366] text-[#ffd580] border-b-2 border-[#ff9933]'
                : 'text-[#475569] hover:text-[#003366] hover:bg-[#eef4fa]'
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-[3px] border border-[#cbd5e1] bg-white p-5 shadow-xs">
        {tab === 'Overview' ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-[14px]">
            <div className="p-3 bg-[#f8fafc] rounded border border-[#e2e8f0]">
              <dt className="text-[#64748b] text-[11px] font-bold uppercase tracking-wider">Institution Category / Type</dt>
              <dd className="font-bold text-[#003366] text-[15px] mt-0.5">{inst.institution_type}</dd>
            </div>
            <div className="p-3 bg-[#f8fafc] rounded border border-[#e2e8f0]">
              <dt className="text-[#64748b] text-[11px] font-bold uppercase tracking-wider">Campus Address</dt>
              <dd className="font-medium text-[#1e293b] mt-0.5">
                {inst.address}, {inst.district}, {inst.pincode}
              </dd>
            </div>
            <div className="p-3 bg-[#f8fafc] rounded border border-[#e2e8f0]">
              <dt className="text-[#64748b] text-[11px] font-bold uppercase tracking-wider">Official Contact</dt>
              <dd className="font-medium text-[#1e293b] mt-0.5">
                {inst.contact_email}
                <br />
                {inst.contact_phone}
              </dd>
            </div>
            <div className="p-3 bg-[#f8fafc] rounded border border-[#e2e8f0]">
              <dt className="text-[#64748b] text-[11px] font-bold uppercase tracking-wider">Risk / Attention Status</dt>
              <dd className="mt-0.5">
                {m.risk ? (
                  <span className="font-bold text-[#b91c1c] bg-[#fee2e2] px-2 py-0.5 rounded text-[12px] border border-[#fecdd3]">
                    High Attention · Elevated complaint volume or overdue inquiries
                  </span>
                ) : (
                  <span className="text-[#15803d] font-bold text-[13px]">
                    ✓ Normal Inquiry Volume
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : null}
        {tab === 'Complaints' ? (
          <div className="table-scroll overflow-hidden rounded-[3px] border border-[#cbd5e1]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#003366] text-white text-[12px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Case ID & Subject</th>
                  <th className="px-3 py-2.5">Complaint Category</th>
                  <th className="px-3 py-2.5">Handling Bureau</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                    <td className="px-3 py-2.5">
                      <Link className="text-[#003366] hover:underline font-bold font-mono text-[13px]" to={`/complaints/${c.id}`}>
                        {c.case_id}
                      </Link>
                      <div className="text-[#475569] text-[12px] mt-0.5">{c.subject}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">{c.complaint_category}</td>
                    <td className="px-3 py-2.5">
                      <span className="bg-[#eef4fa] text-[#003366] font-bold text-[11px] px-2 py-0.5 rounded border border-[#cbd5e1]">
                        {snapshot.bureaus.find((b) => b.id === c.bureau_id)?.code}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {tab === 'Bureau Activity' ? (
          <ul className="space-y-2 text-[14px]">
            {bureauCounts.map(({ b, count }) => (
              <li key={b.id} className="flex justify-between border-b border-line py-2">
                <span>
                  {b.code} · {b.name}
                </span>
                <span className="font-semibold">{count} cases</span>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === 'Timeline' ? (
          <ol className="space-y-3">
            {actions.map((a) => (
              <li key={a.id} className="border-l-2 border-soft pl-3 text-[13px]">
                <p className="text-muted">{formatDateTime(a.created_at)}</p>
                <p className="font-medium text-navy">{a.action_description}</p>
                <p className="text-muted">
                  {snapshot.profiles.find((p) => p.id === a.performed_by)?.full_name} · {a.action_type}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
        {tab === 'Documents' ? (
          docs.length === 0 ? (
            <EmptyState title="No documents" body="Documents attached to this institution’s cases will appear here." />
          ) : (
            <ul className="text-[13px]">
              {docs.map((d) => (
                <li key={d.id} className="border-b border-line py-2">
                  {d.document_name} · {d.storage_path}
                </li>
              ))}
            </ul>
          )
        ) : null}
        {tab === 'Related Cases' ? (
          related.length === 0 ? (
            <EmptyState title="No related cases" body="Overlap detection has not flagged pairs for this institution." />
          ) : (
            <ul className="space-y-2 text-[13px]">
              {related.map((l) => {
                const a = snapshot.cases.find((c) => c.id === l.source_case_id)
                const b = snapshot.cases.find((c) => c.id === l.target_case_id)
                return (
                  <li key={l.id} className="rounded-sm border border-line p-3">
                    <p className="font-semibold text-navy">
                      {a?.case_id} ↔ {b?.case_id} · {l.similarity_score}%
                    </p>
                    <p className="text-muted">{l.reason}</p>
                    <Link className="text-brand" to="/overlap">
                      Open coordination centre
                    </Link>
                  </li>
                )
              })}
            </ul>
          )
        ) : null}
      </div>
    </div>
  )
}
