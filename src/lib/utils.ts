import { format, formatDistanceToNow, differenceInCalendarDays, parseISO } from 'date-fns'
import type { CaseStatus, ComplaintCase, SlaRule, SlaState } from '../types'

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`
}

export function formatDate(iso: string) {
  return format(parseISO(iso), 'dd MMM yyyy')
}

export function formatDateTime(iso: string) {
  return format(parseISO(iso), 'dd MMM yyyy — hh:mm a')
}

export function relative(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true })
}

export function daysBetween(a: string, b: string) {
  return Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)))
}

export function addDaysIso(iso: string, days: number) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function nowIso() {
  return new Date().toISOString()
}

export function caseAgeDays(c: ComplaintCase, today = new Date()) {
  return differenceInCalendarDays(today, parseISO(c.received_date))
}

export function ageingBucket(days: number) {
  if (days <= 7) return '0–7 days'
  if (days <= 15) return '8–15 days'
  if (days <= 30) return '16–30 days'
  if (days <= 60) return '31–60 days'
  return '60+ days'
}

export function slaState(c: ComplaintCase, today = new Date()): SlaState {
  if (c.status === 'DISPOSED' || c.status === 'CLOSED') return 'WITHIN'
  const daysLeft = differenceInCalendarDays(parseISO(c.expected_disposal_date), today)
  if (daysLeft < 0) return 'OVERDUE'
  if (daysLeft <= 5) return 'APPROACHING'
  return 'WITHIN'
}

export function matchSlaRule(rules: SlaRule[], category: string, priority: string) {
  return (
    rules.find((r) => r.active && r.category === category && r.priority === priority) ||
    rules.find((r) => r.active && r.category === category && r.priority === 'Any') ||
    rules.find((r) => r.active && r.category === 'Any' && r.priority === priority) ||
    rules.find((r) => r.active && r.category === 'Any' && r.priority === 'Any')
  )
}

export function isPendingStatus(status: CaseStatus) {
  return status !== 'DISPOSED' && status !== 'CLOSED'
}

export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|college|institute|institution|of|engineering|technology|and|&|univ|university)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function csvEscape(value: string | number) {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
