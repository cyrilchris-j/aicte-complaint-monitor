import { useState, useSyncExternalStore } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, resetDemo, saveSlaRule, saveThresholds, subscribe } from '../demo/store'
import { ActionNotice, Button, Card, Field, PageHeader, inputClass } from '../components/ui'

export function SettingsPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [t, setT] = useState(snapshot.settings.overlapThresholds)
  const [notice, setNotice] = useState<string | null>(null)
  if (!profile) return null

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Administration & Thresholds"
        subtitle="Configure AI similarity detection bounds and Bureau SLA timelines. Changes apply across all Bureau workspaces."
        actions={
          <Button
            variant="danger"
            onClick={() => {
              resetDemo()
              setNotice('Prototype demo state reset to baseline seed records.')
            }}
          >
            Reset Demo Data
          </Button>
        }
      />
      <ActionNotice message={notice} onDismiss={() => setNotice(null)} />
      <Card title="AI Overlap Detection Scoring Bounds (%)">
        <p className="mb-3 text-[13px] text-muted">{snapshot.settings.prototypeNotice}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Potential Duplicate (85–100%)">
            <input className={inputClass} type="number" value={t.potentialDuplicate} onChange={(e) => setT({ ...t, potentialDuplicate: Number(e.target.value) })} />
          </Field>
          <Field label="Potentially Related (70–84%)">
            <input className={inputClass} type="number" value={t.potentiallyRelated} onChange={(e) => setT({ ...t, potentiallyRelated: Number(e.target.value) })} />
          </Field>
          <Field label="Weak Relation (50–69%)">
            <input className={inputClass} type="number" value={t.weakRelation} onChange={(e) => setT({ ...t, weakRelation: Number(e.target.value) })} />
          </Field>
        </div>
        <Button
          className="mt-3.5"
          onClick={() => {
            saveThresholds(t, profile)
            setNotice('AI Overlap similarity thresholds updated successfully.')
          }}
        >
          Save Thresholds
        </Button>
      </Card>
      <Card title="Official Bureau Citizen Charter & SLA Rules">
        <div className="rounded-[3px] border border-[#cbd5e1] overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#003366] text-[12px] uppercase font-bold text-white tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3.5 py-2.5">Priority</th>
                <th className="px-3.5 py-2.5">Allowed Days</th>
                <th className="px-3.5 py-2.5">Warning Alert Days</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {snapshot.slaRules.map((r) => (
                <tr key={r.id} className="hover:bg-[#f8fafc] transition">
                  <td className="px-3.5 py-2.5 font-bold text-[#003366]">{r.category}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="font-semibold text-[12px] text-[#475569]">{r.priority}</span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <input
                      className="w-24 rounded border border-[#cbd5e1] px-2 py-1 text-[13px] font-mono"
                      type="number"
                      defaultValue={r.allowed_days}
                      onBlur={(e) => {
                        saveSlaRule(r.id, { allowed_days: Number(e.target.value) }, profile)
                        setNotice(`Allowed days for ${r.category} (${r.priority}) updated to ${e.target.value}.`)
                      }}
                    />
                  </td>
                  <td className="px-3.5 py-2.5">
                    <input
                      className="w-24 rounded border border-[#cbd5e1] px-2 py-1 text-[13px] font-mono"
                      type="number"
                      defaultValue={r.warning_days}
                      onBlur={(e) => {
                        saveSlaRule(r.id, { warning_days: Number(e.target.value) }, profile)
                        setNotice(`Warning threshold for ${r.category} (${r.priority}) updated to ${e.target.value}.`)
                      }}
                    />
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <button
                      className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition ${
                        r.active ? 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]' : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]'
                      }`}
                      onClick={() => {
                        saveSlaRule(r.id, { active: !r.active }, profile)
                        setNotice(`SLA rule for ${r.category} is now ${!r.active ? 'Active' : 'Inactive'}.`)
                      }}
                    >
                      {r.active ? '✓ Active' : '✕ Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Participating AICTE Bureaus / Autonomous Cells">
        <div className="grid gap-3 sm:grid-cols-2">
          {snapshot.bureaus.map((b) => (
            <div key={b.id} className="rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] p-3">
              <div className="flex items-center justify-between">
                <span className="bg-[#003366] text-white font-mono font-bold text-[12px] px-2 py-0.5 rounded">
                  {b.code}
                </span>
                <span className="text-[11px] text-[#64748b] font-medium">Headquarters / Regional</span>
              </div>
              <h4 className="mt-2 font-bold text-[#003366] text-[14px]">{b.name}</h4>
              <p className="mt-1 text-[12px] text-[#475569] leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
