import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe } from '../demo/store'
import { PageHeader } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export function AuditPage() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Immutable to normal users. Super Admin may review but the prototype store does not allow in-app edits of these records." />
      <ol className="space-y-3">
        {snapshot.auditLogs.map((a) => (
          <li key={a.id} className="rounded-sm border border-line bg-white p-4 app-shadow">
            <p className="text-[12px] text-muted">{formatDateTime(a.created_at)}</p>
            <p className="font-semibold text-navy">{snapshot.profiles.find((p) => p.id === a.user_id)?.full_name ?? a.user_id}</p>
            <p className="text-[14px]">{a.action}</p>
            <p className="text-[13px] text-muted">
              {a.entity_type} {a.entity_id}
              {a.old_value || a.new_value ? ` · ${a.old_value ?? '—'} → ${a.new_value ?? '—'}` : ''}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
