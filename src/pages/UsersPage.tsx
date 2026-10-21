import { useState, useSyncExternalStore } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, saveProfile, subscribe } from '../demo/store'
import { ROLE_LABEL } from '../lib/constants'
import { ROLES, type Role } from '../types'
import { ActionNotice, Button, Field, PageHeader, inputClass } from '../components/ui'
import { uid } from '../lib/utils'

export function UsersPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('CASE_OFFICER')
  const [bureauId, setBureauId] = useState(snapshot.bureaus[1]?.id ?? '')
  const [notice, setNotice] = useState<string | null>(null)
  if (!profile) return null

  return (
    <div className="space-y-4">
      <PageHeader title="Users & Roles Administration" subtitle="Strict Role-Based Access Control (RBAC). Only Super Admin may provision officers or change roles." />
      <ActionNotice message={notice} onDismiss={() => setNotice(null)} />
      <form
        className="grid gap-3 rounded-[3px] border border-[#cbd5e1] bg-white p-4 md:grid-cols-5 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault()
          saveProfile(
            {
              id: uid('user'),
              auth_user_id: uid('auth'),
              full_name: name,
              email,
              role,
              bureau_id: role === 'SUPER_ADMIN' || role === 'SENIOR_MANAGEMENT' ? null : bureauId,
              region: role === 'REGIONAL_OFFICER' ? 'Southern' : null,
              designation: ROLE_LABEL[role],
              phone: '',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            profile,
          )
          setNotice(`Officer "${name}" successfully provisioned with role ${ROLE_LABEL[role]}.`)
          setName('')
          setEmail('')
        }}
      >
        <Field label="Officer Name"><input className={inputClass} placeholder="Dr. / Shri Full Name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Official Email"><input className={inputClass} type="email" placeholder="officer@aicte.gov.in" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Assigned Role">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="Bureau / Cell">
          <select className={inputClass} value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
            {snapshot.bureaus.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><Button type="submit">Provision User</Button></div>
      </form>
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#003366] text-[12px] uppercase font-bold text-white tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5">Officer Name</th>
              <th className="px-3.5 py-2.5">Email (SSO)</th>
              <th className="px-3.5 py-2.5">System Role</th>
              <th className="px-3.5 py-2.5">Bureau</th>
              <th className="px-3.5 py-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {snapshot.profiles.map((p) => (
              <tr key={p.id} className="hover:bg-[#f8fafc] transition">
                <td className="px-3.5 py-3 font-bold text-[#003366]">
                  {p.full_name}
                  <span className="block text-[11px] font-normal text-[#64748b]">{p.designation}</span>
                </td>
                <td className="px-3.5 py-3 font-mono text-[12px] text-[#475569]">{p.email}</td>
                <td className="px-3.5 py-3">
                  <select
                    className="text-[12px] rounded border border-[#cbd5e1] bg-white px-2 py-1 font-semibold text-[#003366]"
                    value={p.role}
                    onChange={(e) => {
                      const newRole = e.target.value as Role
                      saveProfile({ ...p, role: newRole }, profile)
                      setNotice(`Role for ${p.full_name} updated to ${ROLE_LABEL[newRole]}.`)
                    }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </td>
                <td className="px-3.5 py-3">
                  <span className="bg-[#eef4fa] text-[#003366] font-bold text-[11px] px-2 py-0.5 rounded border border-[#cbd5e1]">
                    {snapshot.bureaus.find((b) => b.id === p.bureau_id)?.code ?? 'HQ / All'}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-center">
                  <button
                    className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition ${
                      p.active ? 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]' : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]'
                    }`}
                    onClick={() => {
                      saveProfile({ ...p, active: !p.active }, profile)
                      setNotice(`Account for ${p.full_name} is now ${!p.active ? 'Active' : 'Deactivated'}.`)
                    }}
                  >
                    {p.active ? '✓ Active' : '✕ Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
