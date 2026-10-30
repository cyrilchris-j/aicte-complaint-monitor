import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createInstitution, getSnapshot, institutionMetrics, subscribe } from '../demo/store'
import { Button, Field, PageHeader, inputClass } from '../components/ui'
import { Plus, Building2, X } from 'lucide-react'

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Other',
]

const AICTE_REGIONS = [
  'Central',
  'Eastern',
  'Northern',
  'North-West',
  'South-Central',
  'Southern',
  'South-West',
  'Western',
]

export function InstitutionsPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')
  const [volume, setVolume] = useState('')
  const [watchlistOnly, setWatchlistOnly] = useState(false)

  // Modal for adding a new institution
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPermId, setNewPermId] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newState, setNewState] = useState('Tamil Nadu')
  const [newRegion, setNewRegion] = useState('Southern')
  const [newType, setNewType] = useState('Engineering & Technology')
  const [modalError, setModalError] = useState<string | null>(null)

  const rows = useMemo(() => {
    if (!profile) return []
    return snapshot.institutions
      .filter((i) => (profile.role === 'REGIONAL_OFFICER' ? i.region === profile.region : true))
      .map((i) => {
        const m = institutionMetrics(i.id, profile)
        const activeCases = snapshot.cases.filter(
          (c) => c.institution_id === i.id && c.status !== 'DISPOSED' && c.status !== 'CLOSED'
        )
        const bureaus = new Set(activeCases.map((c) => c.bureau_id))
        const isMultiBureau = bureaus.size >= 2
        const isWatchlist = m.risk || isMultiBureau || m.overdue > 0
        return { i, m, isMultiBureau, isWatchlist, activeCount: activeCases.length }
      })
      .filter(({ i, m, isWatchlist }) => {
        if (watchlistOnly && !isWatchlist) return false
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
  }, [snapshot, profile, q, state, region, status, volume, watchlistOnly])

  if (!profile) return null

  const states = [...new Set(snapshot.institutions.map((i) => i.state))].sort()
  const regions = [...new Set(snapshot.institutions.map((i) => i.region))].sort()

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newPermId.trim() || !newCity.trim()) {
      setModalError('Institution Name, Permanent ID, and City are required.')
      return
    }
    createInstitution(
      {
        institution_name: newName,
        aicte_permanent_id: newPermId,
        city: newCity,
        state: newState,
        region: newRegion,
        institution_type: newType,
      },
      profile,
    )
    setShowAddModal(false)
    setNewName('')
    setNewPermId('')
    setNewCity('')
    setModalError(null)
  }

  return (
    <div>
      <PageHeader
        title="Institutions"
        subtitle="Search by AICTE Permanent ID or name. Open Institution 360° for the complete case picture."
        actions={
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5">
            <Plus size={16} />
            <span>Add Institution</span>
          </Button>
        }
      />

      {/* Regional & Watchlist KPI Ribbon */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Monitored Technical Institutions
          </span>
          <p className="mt-1 text-[24px] font-black text-[#003366] font-mono leading-none">
            {snapshot.institutions.length}
          </p>
          <span className="text-[11px] text-[#64748b] mt-1 block">Nationwide AICTE Jurisdiction</span>
        </div>

        <div
          onClick={() => setWatchlistOnly(!watchlistOnly)}
          className={`rounded-[3px] border p-3.5 shadow-xs cursor-pointer transition select-none ${
            watchlistOnly
              ? 'border-[#b91c1c] bg-[#fef2f2] ring-2 ring-red-300'
              : 'border-[#cbd5e1] bg-white hover:border-[#f87171]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#b91c1c] uppercase tracking-wider">
              ⚠️ High Attention Watchlist
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${watchlistOnly ? 'bg-[#b91c1c] text-white' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
              {watchlistOnly ? 'Filter Active' : 'Click to filter'}
            </span>
          </div>
          <p className="mt-1 text-[24px] font-black text-[#b91c1c] font-mono leading-none">
            {snapshot.institutions.filter((inst) => {
              const cs = snapshot.cases.filter((c) => c.institution_id === inst.id && c.status !== 'DISPOSED' && c.status !== 'CLOSED')
              return new Set(cs.map((c) => c.bureau_id)).size >= 2
            }).length}
          </p>
          <span className="text-[11px] text-[#7f1d1d] mt-1 block">Cross-Bureau active inquiries</span>
        </div>

        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Southern Region Active
          </span>
          <p className="mt-1 text-[24px] font-black text-[#2563eb] font-mono leading-none">
            {snapshot.institutions.filter((i) => i.region === 'Southern').length} Colleges
          </p>
          <span className="text-[11px] text-[#64748b] mt-1 block">Tamil Nadu & Pondicherry</span>
        </div>

        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Western & Central Active
          </span>
          <p className="mt-1 text-[24px] font-black text-[#7c3aed] font-mono leading-none">
            {snapshot.institutions.filter((i) => i.region === 'Western' || i.region === 'Central').length} Colleges
          </p>
          <span className="text-[11px] text-[#64748b] mt-1 block">Maharashtra, MP & Goa</span>
        </div>
      </div>

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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-[#64748b]">
                    <Building2 size={36} className="mx-auto mb-2 text-[#94a3b8]" />
                    <p className="font-semibold text-[14px] text-[#334155]">No institutions registered</p>
                    <p className="text-[12px] text-[#64748b] mt-1">Register an institution to begin managing complaint cases.</p>
                    <Button onClick={() => setShowAddModal(true)} className="mt-3 text-[12px] py-1">
                      + Add Institution
                    </Button>
                  </td>
                </tr>
              ) : null}
              {rows.map(({ i, m, isMultiBureau, isWatchlist }) => (
                <tr key={i.id} className="hover:bg-[#f8fafc] transition">
                  <td className="px-3 py-2.5 font-mono font-bold text-[#003366]">{i.aicte_permanent_id}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-[#002244]">{i.institution_name}</div>
                    {isMultiBureau ? (
                      <span className="inline-block bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5">
                        ⚠️ Cross-Bureau Active Alert
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-[#334155]">{i.state}</td>
                  <td className="px-3 py-2.5 text-[#334155]">{i.region}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#003366]">{m.total}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#b45309]">{m.pending}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#b91c1c]">{m.overdue}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-[#475569]">{m.activeBureaus}</td>
                  <td className="px-3 py-2.5">
                    {isWatchlist ? (
                      <span className="inline-block bg-[#fee2e2] text-[#b91c1c] border border-[#fecdd3] text-[11px] font-bold px-2 py-0.5 rounded">
                        High Attention
                      </span>
                    ) : (
                      <span className="text-[#15803d] font-semibold text-[12px]">Normal</span>
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

      {/* Add Institution Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[4px] border border-[#cbd5e1] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 mb-4">
              <div className="flex items-center gap-2 text-[#003366]">
                <Building2 size={20} />
                <h3 className="font-bold text-[16px]">Register New Institution</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748b] hover:text-[#002244] p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <Field label="AICTE Permanent ID">
                <input
                  className={inputClass}
                  placeholder="e.g., 1-12345678"
                  value={newPermId}
                  onChange={(e) => setNewPermId(e.target.value)}
                  required
                />
              </Field>
              <Field label="Institution Full Name">
                <input
                  className={inputClass}
                  placeholder="e.g., National Institute of Engineering & Technology"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    className={inputClass}
                    placeholder="e.g., Bengaluru"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    required
                  />
                </Field>
                <Field label="State">
                  <select className={inputClass} value={newState} onChange={(e) => setNewState(e.target.value)}>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="AICTE Region">
                  <select className={inputClass} value={newRegion} onChange={(e) => setNewRegion(e.target.value)}>
                    {AICTE_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Institution Category / Stream">
                  <select className={inputClass} value={newType} onChange={(e) => setNewType(e.target.value)}>
                    <option>Engineering & Technology</option>
                    <option>Management</option>
                    <option>Pharmacy</option>
                    <option>Polytechnic / Diploma</option>
                    <option>Architecture & Planning</option>
                    <option>Applied Arts & Crafts</option>
                    <option>Other</option>
                  </select>
                </Field>
              </div>
              {modalError ? <p className="text-[13px] text-danger">{modalError}</p> : null}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Institution
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
