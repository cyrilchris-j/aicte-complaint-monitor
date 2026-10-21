import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, institutionMetrics, subscribe } from '../demo/store'
import { Button, Field, PageHeader, inputClass } from '../components/ui'

export function InstitutionsPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')
  const [volume, setVolume] = useState('')
  const rows = useMemo(() => {
    if (!profile) return []
    return snapshot.institutions
      .filter((i) => (profile.role === 'REGIONAL_OFFICER' ? i.region === profile.region : true))
      .map((i) => ({ i, m: institutionMetrics(i.id, profile) }))
      .filter(({ i, m }) => {
        const query = q.trim().toLowerCase()
        if (query && !i.institution_name.toLowerCase().includes(query) && !i.aicte_permanent_id.toLowerCase().includes(query)) return false
        if (state && i.state !== state) return false
        if (region && i.region !== region) return false
        if (status && i.status !== status) return false
        if (volume === 'high' && m.total < 6) return false
        if (volume === 'medium' && (m.total < 3 || m.total >= 6)) return false
        if (volume === 'low' && m.total >= 3) return false
        return true
      })
  }, [snapshot, profile, q, state, region, status, volume])

  if (!profile) return null

  const states = [...new Set(snapshot.institutions.map((i) => i.state))].sort()
  const regions = [...new Set(snapshot.institutions.map((i) => i.region))].sort()

  return (
    <div>
      <PageHeader title="Institutions" subtitle="Search by AICTE Permanent ID or name. Open Institution 360° for the complete case picture." />
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <Field label="Search">
          <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or Permanent ID" />
        </Field>
        <Field label="State">
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Region">
          <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All</option>
            {regions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option>Active</option>
            <option>Under Review</option>
            <option>Inactive</option>
          </select>
        </Field>
        <Field label="Case volume">
          <select className={inputClass} value={volume} onChange={(e) => setVolume(e.target.value)}>
            <option value="">All</option>
            <option value="high">High (6+)</option>
            <option value="medium">Medium (3–5)</option>
            <option value="low">Low (0–2)</option>
          </select>
        </Field>
      </div>
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead className="bg-[#003366] text-white text-[12px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5">AICTE Permanent ID</th>
                <th className="px-3 py-2.5">Institution Name</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5">Region</th>
                <th className="px-3 py-2.5 text-center">Total</th>
                <th className="px-3 py-2.5 text-center">Pending</th>
                <th className="px-3 py-2.5 text-center">Overdue</th>
                <th className="px-3 py-2.5 text-center">Bureaus</th>
                <th className="px-3 py-2.5">Attention Flag</th>
                <th className="px-3 py-2.5">Last Activity</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {rows.map(({ i, m }) => (
                <tr key={i.id} className="hover:bg-[#f8fafc] transition">
                  <td className="px-3 py-2.5 font-mono font-bold text-[#003366]">{i.aicte_permanent_id}</td>
                  <td className="px-3 py-2.5 font-bold text-[#002244]">{i.institution_name}</td>
                  <td className="px-3 py-2.5 text-[#334155]">{i.state}</td>
                  <td className="px-3 py-2.5 text-[#334155]">{i.region}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#003366]">{m.total}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#b45309]">{m.pending}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#b91c1c]">{m.overdue}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-[#475569]">{m.activeBureaus}</td>
                  <td className="px-3 py-2.5">
                    {m.risk ? (
                      <span className="inline-block bg-[#fee2e2] text-[#b91c1c] border border-[#fecdd3] text-[11px] font-bold px-2 py-0.5 rounded">
                        High Attention
                      </span>
                    ) : (
                      <span className="text-[#64748b] text-[12px]">Normal</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[#64748b] text-[12px]">{m.lastActivity ? m.lastActivity.slice(0, 10) : '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Link to={`/institutions/${i.id}`}>
                      <Button variant="secondary" className="text-[11px] py-1">View 360°</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
