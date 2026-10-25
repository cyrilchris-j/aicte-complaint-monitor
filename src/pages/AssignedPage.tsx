import { useState, useSyncExternalStore, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { acceptTransfer, getSnapshot, subscribe, visibleCases } from '../demo/store'
import { Button, EmptyState, PageHeader, SlaBadge, StatusBadge } from '../components/ui'
import { formatDate, slaState } from '../lib/utils'
import { UserCheck, ArrowRightLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'

export function AssignedPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [tab, setTab] = useState<'mine' | 'transfers' | 'scope'>('mine')
  const [q, setQ] = useState('')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  if (!profile) return null

  // 1. Cases directly assigned to the logged-in user
  const assignedToMe = snapshot.cases.filter((c) => c.assigned_officer_id === profile.id)

  // 2. Cases requested for transfer to the user's bureau
  const pendingTransfers = snapshot.cases.filter(
    (c) => c.pending_transfer_bureau_id && (c.pending_transfer_bureau_id === profile.bureau_id || profile.role === 'SUPER_ADMIN')
  )

  // 3. All cases assigned within user's visibility scope
  const inScope = visibleCases(profile).filter((c) => c.assigned_officer_id)

  const activeList = useMemo(() => {
    let base = assignedToMe
    if (tab === 'transfers') base = pendingTransfers
    if (tab === 'scope') base = inScope

    if (!q.trim()) return base
    const query = q.trim().toLowerCase()
    return base.filter((c) => {
      const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
      const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
      return (
        c.case_id.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        inst?.institution_name.toLowerCase().includes(query) ||
        officer?.full_name.toLowerCase().includes(query)
      )
    })
  }, [tab, assignedToMe, pendingTransfers, inScope, q, snapshot])

  const handleAccept = (caseId: string) => {
    acceptTransfer(caseId, profile)
    setActionNotice('File transfer accepted! Case is now officially under your Bureau authority.')
    setTimeout(() => setActionNotice(null), 4000)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assigned Tasks & File Queue"
        subtitle="Comprehensive oversight of case files assigned to your official profile or pending bureau transfer."
      />

      {actionNotice && (
        <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-[13px] rounded-[3px] flex items-center gap-2 font-bold">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Tabs & Search Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cbd5e1] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`px-3.5 py-1.5 rounded-[3px] text-[12px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'mine'
                ? 'bg-[#003366] text-white shadow-xs'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            <UserCheck size={14} />
            <span>Assigned to Me</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab === 'mine' ? 'bg-white/20 text-white' : 'bg-[#cbd5e1] text-[#334155]'}`}>
              {assignedToMe.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('transfers')}
            className={`px-3.5 py-1.5 rounded-[3px] text-[12px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'transfers'
                ? 'bg-[#b45309] text-white shadow-xs'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            <ArrowRightLeft size={14} />
            <span>Pending Bureau Transfers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab === 'transfers' ? 'bg-white/20 text-white' : 'bg-[#cbd5e1] text-[#334155]'}`}>
              {pendingTransfers.length}
            </span>
          </button>

          {(profile.role === 'SUPER_ADMIN' || profile.role === 'SENIOR_MANAGEMENT' || profile.role === 'BUREAU_HEAD') && (
            <button
              type="button"
              onClick={() => setTab('scope')}
              className={`px-3.5 py-1.5 rounded-[3px] text-[12px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                tab === 'scope'
                  ? 'bg-[#003366] text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              <ShieldCheck size={14} />
              <span>All Assigned in Scope</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab === 'scope' ? 'bg-white/20 text-white' : 'bg-[#cbd5e1] text-[#334155]'}`}>
                {inScope.length}
              </span>
            </button>
          )}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by case, officer, institution..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full text-[12px] px-3 py-1.5 rounded-[3px] border border-[#cbd5e1] outline-none focus:border-[#003366]"
          />
        </div>
      </div>

      {activeList.length === 0 ? (
        <EmptyState
          title={
            tab === 'mine'
              ? 'No cases directly assigned'
              : tab === 'transfers'
              ? 'No pending transfer requests'
              : 'No assigned cases found'
          }
          body={
            tab === 'mine'
              ? 'When an official file is assigned to your profile, it will appear here.'
              : tab === 'transfers'
              ? 'No incoming bureau transfer requests are currently pending for your bureau.'
              : 'Try adjusting your search criteria.'
          }
        />
      ) : (
        <>
          {/* Mobile view */}
          <div className="grid gap-3 md:hidden">
            {activeList.map((c) => {
              const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
              const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
              return (
                <div key={c.id} className="rounded-sm border border-[#cbd5e1] bg-white p-3 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Link to={`/complaints/${c.id}`} className="font-mono font-bold text-[#003366] hover:underline">
                      {c.case_id}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-[13px] font-medium text-[#1e293b]">{c.subject}</p>
                  <p className="text-[11px] text-[#64748b]">{inst?.institution_name}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-[11px]">
                    <span className="text-[#475569]">
                      Officer: <strong>{officer?.full_name ?? 'Unassigned'}</strong>
                    </span>
                    <SlaBadge state={slaState(c)} />
                  </div>
                  {c.pending_transfer_bureau_id && (profile.bureau_id === c.pending_transfer_bureau_id || profile.role === 'SUPER_ADMIN') && (
                    <Button onClick={() => handleAccept(c.id)} className="w-full mt-2 text-[11px]">
                      Accept Transfer
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs md:block overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#003366] text-[11px] uppercase font-bold text-white tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Case Reference</th>
                  <th className="px-3 py-2.5">Institution & Region</th>
                  <th className="px-3 py-2.5">Assigned Officer</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">SLA Compliance</th>
                  <th className="px-3 py-2.5">Expected Disposal</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {activeList.map((c) => {
                  const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
                  const officer = snapshot.profiles.find((p) => p.id === c.assigned_officer_id)
                  const isMine = c.assigned_officer_id === profile.id
                  const isPendingThisBureau = c.pending_transfer_bureau_id === profile.bureau_id || (profile.role === 'SUPER_ADMIN' && c.pending_transfer_bureau_id)

                  return (
                    <tr key={c.id} className="hover:bg-[#f8fafc] transition">
                      <td className="px-3.5 py-3 font-mono">
                        <Link className="text-[#003366] font-bold hover:underline" to={`/complaints/${c.id}`}>
                          {c.case_id}
                        </Link>
                        <p className="text-[11px] font-sans font-normal text-[#64748b] line-clamp-1">{c.subject}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-[#1e293b] block line-clamp-1">{inst?.institution_name}</span>
                        <span className="text-[11px] text-[#64748b]">{inst?.city}, {inst?.state}</span>
                      </td>
                      <td className="px-3 py-3">
                        {officer ? (
                          <div>
                            <span className={`font-semibold ${isMine ? 'text-[#003366]' : 'text-[#334155]'}`}>
                              {officer.full_name}
                            </span>
                            {isMine && (
                              <span className="ml-1 text-[10px] font-bold bg-[#e0f2fe] text-[#0369a1] px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                            <p className="text-[10px] text-[#64748b]">{officer.designation}</p>
                          </div>
                        ) : (
                          <span className="text-[#94a3b8] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={c.status} />
                        {c.pending_transfer_bureau_id && (
                          <span className="block mt-1 text-[10px] text-[#b45309] font-bold">
                            Transfer Pending ({snapshot.bureaus.find((b) => b.id === c.pending_transfer_bureau_id)?.code})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <SlaBadge state={slaState(c)} />
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-[#475569]">
                        {formatDate(c.expected_disposal_date)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingThisBureau && (
                            <button
                              type="button"
                              onClick={() => handleAccept(c.id)}
                              className="bg-[#15803d] hover:bg-[#166534] text-white text-[11px] font-bold px-2.5 py-1 rounded-[3px] shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} />
                              <span>Accept</span>
                            </button>
                          )}
                          <Link
                            to={`/complaints/${c.id}`}
                            className="bg-white hover:bg-[#003366] hover:text-white text-[#003366] border border-[#cbd5e1] text-[11px] font-bold px-2.5 py-1 rounded-[3px] transition"
                          >
                            Open →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
