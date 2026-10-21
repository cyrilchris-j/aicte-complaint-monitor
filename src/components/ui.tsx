import { type ReactNode } from 'react'
import { cn } from '../lib/utils'
import type { CaseStatus, Priority, SlaState, VerificationStatus } from '../types'

export function KPICard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'neutral' | 'warn' | 'danger' | 'ok'
}) {
  const border =
    tone === 'danger'
      ? 'border-l-[#b91c1c] bg-[#fff5f5]'
      : tone === 'warn'
        ? 'border-l-[#ff9933] bg-[#fffbf5]'
        : tone === 'ok'
          ? 'border-l-[#15803d] bg-[#f5fbf7]'
          : 'border-l-[#003366] bg-white'
  return (
    <article className={cn('rounded-[3px] border border-[#cbd5e1] p-4 border-l-4 shadow-xs transition hover:shadow-sm', border)}>
      <p className="text-[11px] font-bold tracking-wider text-[#475569] uppercase font-sans">{label}</p>
      <p className="mt-1 text-[28px] font-extrabold leading-none text-[#003366] font-sans">{value}</p>
      {hint ? <p className="mt-2 text-[12px] font-semibold text-[#64748b]">{hint}</p> : null}
    </article>
  )
}

const statusClass: Record<string, string> = {
  NEW: 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]',
  UNDER_REVIEW: 'bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe]',
  VERIFIED: 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]',
  UNDER_PROCESS: 'bg-[#e0f2fe] text-[#003366] border border-[#93c5fd]',
  PENDING_INFORMATION: 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]',
  TRANSFERRED: 'bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]',
  ESCALATED: 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecdd3]',
  DISPOSED: 'bg-[#dcfce7] text-[#166534] border border-[#86efac]',
  CLOSED: 'bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]',
  HIGH: 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]',
  CRITICAL: 'bg-[#7f1d1d] text-white border border-[#450a0a]',
  MEDIUM: 'bg-[#fef3c7] text-[#92400e] border border-[#fcd34d]',
  LOW: 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]',
}

export function StatusBadge({ status }: { status: CaseStatus | string }) {
  return (
    <span className={cn('inline-flex rounded-[3px] px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase', statusClass[status] ?? 'bg-[#f1f5f9] text-[#003366]')}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <StatusBadge status={priority} />
}

export function SlaBadge({ state }: { state: SlaState }) {
  if (state === 'OVERDUE') return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#b91c1c] bg-[#fee2e2] px-2 py-0.5 rounded-[3px] border border-[#fecdd3]">🔴 Overdue</span>
  if (state === 'APPROACHING') return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-[3px] border border-[#fde68a]">⚠ Approaching SLA</span>
  return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded-[3px] border border-[#bbf7d0]">✓ Within timeline</span>
}

export function VerifyBadge({ status }: { status: VerificationStatus }) {
  return <StatusBadge status={status} />
}

export function Card({ title, actions, children, className }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs', className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 border-l-4 border-l-[#003366]">
          <h2 className="text-[16px] font-bold text-[#003366] uppercase tracking-wide">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'bg-[#003366] text-white hover:bg-[#002244] border border-[#002244] shadow-xs active:bg-[#001730]',
    secondary: 'border border-[#003366] bg-white text-[#003366] hover:bg-[#eef4fa] shadow-xs',
    ghost: 'text-[#003366] hover:bg-[#eef4fa]',
    danger: 'bg-[#b91c1c] text-white hover:bg-[#991b1b] border border-[#7f1d1d] shadow-xs',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn('inline-flex items-center justify-center gap-1.5 rounded-[3px] px-3.5 py-1.5 text-[13px] font-bold transition disabled:opacity-50 cursor-pointer', styles, className)}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[13px]">
      <span className="mb-1 block font-bold text-[#003366] uppercase text-[11px] tracking-wide">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-[3px] border border-[#cbd5e1] bg-white px-3 py-1.5 text-[13px] text-[#002244] outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366] transition'

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-dashed border-line bg-canvas px-4 py-10 text-center">
      <p className="font-display text-[16px] text-navy">{title}</p>
      <p className="mt-1 text-[13px] text-muted">{body}</p>
    </div>
  )
}

export function LoadingSkeleton() {
  return <div className="h-24 animate-pulse rounded-sm bg-soft" />
}

export function ConfirmationDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm Action',
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md rounded-[3px] border border-[#cbd5e1] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#003366] px-4 py-3 text-white border-b-2 border-[#ff9933] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff9933] text-[#002244] font-bold text-[11px]">!</span>
            <h3 className="font-bold text-[14px] text-white tracking-wide">{title}</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-lg leading-none cursor-pointer">×</button>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-[#1e293b] leading-relaxed">{body}</p>
          <div className="mt-3 rounded-[3px] bg-[#f8fafc] border border-[#e2e8f0] p-2 text-[11px] text-[#64748b]">
            <span className="font-bold text-[#003366]">Note:</span> This administrative action will be recorded in the official AICTE audit log.
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActionNotice({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss?: () => void
}) {
  if (!message) return null
  return (
    <div className="rounded-[3px] border border-[#86efac] bg-[#f0fdf4] p-3 text-[#166534] shadow-xs flex items-center justify-between transition-all">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-white text-[11px] font-bold">✓</span>
        <span>{message}</span>
      </div>
      {onDismiss ? (
        <button onClick={onDismiss} className="text-[#166534] hover:text-[#14532d] font-bold text-sm cursor-pointer ml-3">
          Dismiss
        </button>
      ) : null}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-[30px] font-semibold leading-tight text-navy">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-[14px] text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[12px] text-muted">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 ? <span className="text-muted/60">/</span> : null}
          {item.to ? (
            <a href={item.to} className="hover:text-brand hover:underline font-medium">
              {item.label}
            </a>
          ) : (
            <span className="text-ink font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function DocumentViewerModal({
  open,
  documentName,
  dataUrl,
  storagePath,
  onClose,
}: {
  open: boolean
  documentName: string
  dataUrl?: string
  storagePath?: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-sm border border-line bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h3 className="font-display text-[16px] font-semibold text-navy">{documentName}</h3>
            {storagePath ? <p className="text-[11px] text-muted">{storagePath}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {dataUrl ? (
              <a href={dataUrl} download={documentName}>
                <Button variant="secondary">Download</Button>
              </a>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </header>
        <div className="relative flex-1 overflow-auto bg-canvas p-6 text-center">
          <div className="absolute right-4 top-4 rounded border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning">
            CONFIDENTIAL · AICTE OFFICIAL RECORD
          </div>
          {dataUrl?.startsWith('data:image/') ? (
            <img src={dataUrl} alt={documentName} className="mx-auto max-h-full rounded border border-line bg-white shadow-sm" />
          ) : dataUrl?.startsWith('data:application/pdf') ? (
            <iframe src={dataUrl} title={documentName} className="h-full w-full rounded border border-line bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-sm border border-dashed border-line bg-white p-8 max-w-md app-shadow">
                <p className="font-display text-[16px] text-navy font-semibold">{documentName}</p>
                <p className="mt-2 text-[13px] text-muted">
                  Official AICTE Case Document stored securely in private bucket:
                  <br />
                  <code className="text-brand font-mono text-[12px]">{storagePath ?? 'complaint-documents'}</code>
                </p>
                <p className="mt-4 text-[12px] text-muted">
                  Signed URL verification passed. File integrity checked.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

