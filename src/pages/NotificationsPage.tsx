import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, markAllNotificationsRead, markNotificationRead, subscribe } from '../demo/store'
import { Button, EmptyState, PageHeader } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export function NotificationsPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [filter, setFilter] = useState('ALL')
  if (!profile) return null
  const list = snapshot.notifications
    .filter((n) => n.user_id === profile.id)
    .filter((n) => (filter === 'ALL' ? true : filter === 'UNREAD' ? !n.read : n.notification_type === filter))
  const types = ['ALL', 'UNREAD', 'OVERLAP', 'SLA', 'TRANSFER', 'ASSIGNMENT', 'RESPONSE']
  return (
    <div>
      <PageHeader
        title="Alerts & notifications"
        actions={<Button variant="secondary" onClick={() => markAllNotificationsRead(profile.id)}>Mark all read</Button>}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            className={`rounded-sm border px-3 py-1 text-[12px] font-semibold ${filter === t ? 'border-brand bg-soft text-brand' : 'border-line'}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState title="No notifications" body="SLA, overlap and transfer alerts for your role will appear here." />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id} className={`rounded-sm border bg-white p-3 app-shadow ${n.read ? 'border-line' : 'border-brand'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">{n.title}</p>
                  <p className="text-[13px]">{n.message}</p>
                  <p className="text-[12px] text-muted">{formatDateTime(n.created_at)} · {n.notification_type}</p>
                  {n.case_id ? (
                    <Link className="text-[13px] font-semibold text-brand" to={`/complaints/${n.case_id}`} onClick={() => markNotificationRead(n.id)}>
                      Open case
                    </Link>
                  ) : null}
                </div>
                {!n.read ? (
                  <Button variant="ghost" onClick={() => markNotificationRead(n.id)}>
                    Mark read
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
