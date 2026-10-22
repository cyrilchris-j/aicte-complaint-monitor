import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, subscribe, visibleCases } from '../demo/store'
import { CASE_STATUSES, CATEGORIES, PRIORITIES } from '../types'
import { Button, Field, PageHeader, PriorityBadge, SlaBadge, StatusBadge, inputClass } from '../components/ui'
import { formatDate, slaState } from '../lib/utils'

export function ComplaintsPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [q, setQ] = useState('')
  const [bureau, setBureau] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [overlap, setOverlap] = useState('')
  const [sla, setSla] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'received_date' | 'expected_disposal_date' | 'priority'>('received_date')
  const [showCols, setShowCols] = useState({ officer: true, sla: true, overlap: true })

  const filtered = useMemo(() => {
    if (!profile) return []
    return visibleCases(profile)
      .filter((c) => {
        const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
        const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
        const query = q.trim().toLowerCase()
        if (
          query &&
          !c.case_id.toLowerCase().includes(query) &&
          !c.subject.toLowerCase().includes(query) &&
          !inst?.institution_name.toLowerCase().includes(query)
        )
          return false
        if (bureau && c.bureau_id !== bureau) return false
        if (status && c.status !== status) return false
        if (priority && c.priority !== priority) return false
        if (category && c.complaint_category !== category) return false
        if (overlap === 'yes' && c.overlap_status === 'NONE') return false
        if (overlap === 'no' && c.overlap_status === 'NONE') return true
        if (overlap === 'no' && c.overlap_status !== 'NONE') return false
        if (sla && slaState(c) !== sla) return false
        if (officer && q && officer.full_name.toLowerCase().includes(query)) return true
        return true
      })
      .sort((a, b) => b[sort].localeCompare(a[sort]))
  }, [snapshot, profile, q, bureau, status, priority, category, overlap, sla, sort])

  if (!profile) return null

  const pageSize = 15
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        title="Complaints / Cases"
        subtitle="Filter, sort and open a case file. Every row is a live record from the current workspace."
        actions={
          <Link to="/complaints/new">
            <Button>Register case</Button>
          </Link>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
        {status ? <span className="rounded-sm bg-soft px-2 py-1">Status: {status}</span> : null}
        {priority ? <span className="rounded-sm bg-soft px-2 py-1">Priority: {priority}</span> : null}
        {overlap ? <span className="rounded-sm bg-soft px-2 py-1">Overlap: {overlap}</span> : null}
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Field label="Search">
          <input className={inputClass} value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Case ID / institution / subject" />
        </Field>
        <Field label="Bureau">
          <select className={inputClass} value={bureau} onChange={(e) => { setBureau(e.target.value); setPage(1) }}>
            <option value="">All</option>
            {snapshot.bureaus.map((b) => (
              <option key={b.id} value={b.id}>{b.code}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All</option>
            {CASE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputClass} value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}>
            <option value="">All</option>
            {PRIORITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select className={inputClass} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">All</option>
            {CATEGORIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Overlap">
          <select className={inputClass} value={overlap} onChange={(e) => { setOverlap(e.target.value); setPage(1) }}>
            <option value="">All</option>
            <option value="yes">Flagged</option>
            <option value="no">None</option>
          </select>
        </Field>
        <Field label="SLA">
          <select className={inputClass} value={sla} onChange={(e) => { setSla(e.target.value); setPage(1) }}>
            <option value="">All</option>
            <option value="WITHIN">Within</option>
            <option value="APPROACHING">Approaching</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </Field>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[12px]">
        <span>Sort</span>
        <select className={inputClass + ' w-auto'} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="received_date">Received</option>
          <option value="expected_disposal_date">Expected disposal</option>
          <option value="priority">Priority</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showCols.officer} onChange={(e) => setShowCols({ ...showCols, officer: e.target.checked })} /> Officer
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showCols.sla} onChange={(e) => setShowCols({ ...showCols, sla: e.target.checked })} /> SLA
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showCols.overlap} onChange={(e) => setShowCols({ ...showCols, overlap: e.target.checked })} /> Overlap
        </label>
      </div>
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[1100px] text-left text-[13px]">
            <thead className="bg-[#003366] text-white text-[12px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5">Case ID</th>
                <th className="px-3 py-2.5">Institution Name</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Bureau</th>
                {showCols.officer ? <th className="px-3 py-2.5">Assigned Officer</th> : null}
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Received Date</th>
                <th className="px-3 py-2.5">Deadline</th>
                {showCols.sla ? <th className="px-3 py-2.5">SLA State</th> : null}
                {showCols.overlap ? <th className="px-3 py-2.5">Overlap</th> : null}
                <th className="px-3 py-2.5">Last Action</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-[#64748b]">
                    <p className="font-semibold text-[14px] text-[#334155]">No complaint cases found</p>
                    <p className="text-[12px] text-[#64748b] mt-1">Register a new case or adjust your search filters.</p>
                    <Link to="/complaints/new" className="mt-3 inline-block">
                      <Button className="text-[12px] py-1">+ Register Case</Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                    <td className="px-3 py-2.5 font-bold font-mono text-[#003366]">{c.case_id}</td>
                    <td className="px-3 py-2.5 font-semibold text-[#002244] max-w-[220px]">
                      <span className="block leading-tight">{snapshot.institutions.find((i) => i.id === c.institution_id)?.institution_name}</span>
                      <span className="text-[11px] font-normal text-[#64748b] line-clamp-1">{c.subject}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">{c.complaint_category}</td>
                    <td className="px-3 py-2.5">
                      <span className="bg-[#eef4fa] text-[#003366] font-bold text-[11px] px-2 py-0.5 rounded border border-[#cbd5e1]">
                        {snapshot.bureaus.find((b) => b.id === c.bureau_id)?.code}
                      </span>
                    </td>
                    {showCols.officer ? (
                      <td className="px-3 py-2.5 text-[#334155] text-[12px]">
                        {snapshot.profiles.find((p) => p.id === c.assigned_officer_id)?.full_name ?? <span className="text-[#94a3b8]">Unassigned</span>}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-3 py-2.5 text-[#64748b] text-[12px]">{formatDate(c.received_date)}</td>
                    <td className="px-3 py-2.5 text-[#64748b] text-[12px]">{formatDate(c.expected_disposal_date)}</td>
                    {showCols.sla ? <td className="px-3 py-2.5"><SlaBadge state={slaState(c)} /></td> : null}
                    {showCols.overlap ? (
                      <td className="px-3 py-2.5">
                        {c.overlap_status !== 'NONE' ? (
                          <span className="bg-[#fff7ed] text-[#b45309] font-bold text-[10px] px-1.5 py-0.5 rounded border border-[#fde68a]">
                            {c.overlap_status.replaceAll('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-[11px]">None</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 text-[#64748b] text-[12px]">{formatDate(c.last_action_date)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Link to={`/complaints/${c.id}`}>
                        <Button variant="secondary" className="text-[11px] py-1">Open Case</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5 text-[12px] text-[#475569]">
          <span className="font-semibold">
            Showing {rows.length} of {filtered.length} complaints · Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-[11px] py-1">Previous</Button>
            <Button variant="secondary" disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="text-[11px] py-1">Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
