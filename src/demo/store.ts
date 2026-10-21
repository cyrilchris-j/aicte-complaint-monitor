import { format } from 'date-fns'
import { DEMO_PASSWORD, NEXT_ACTIONS } from '../lib/constants'
import {
  complaintText,
  detectOverlaps,
  embedText,
  officerSummary,
  overlapLabel,
  scorePair,
  suggestCategory,
  suggestedNextAction,
} from '../lib/overlap'
import {
  ageingBucket,
  caseAgeDays,
  isPendingStatus,
  matchSlaRule,
  nowIso,
  slaState,
  uid,
} from '../lib/utils'
import type {
  AppState,
  CaseAction,
  CaseDocument,
  CaseStatus,
  ComplaintCase,
  DashboardStats,
  Profile,
  Role,
  VerificationStatus,
} from '../types'
import { buildSeedState } from './seed'

const KEY = 'aicte-casesync-demo-v1'

let state: AppState = load()
const listeners = new Set<() => void>()

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.cases?.length > 100 && parsed.institutions?.length >= 50) return parsed
    }
  } catch {
    /* ignore */
  }
  return buildSeedState()
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota */
  }
}

function emit() {
  state = {
    ...state,
    cases: [...state.cases],
    actions: [...state.actions],
    links: [...state.links],
    notifications: [...state.notifications],
    documents: [...state.documents],
    auditLogs: [...state.auditLogs],
    profiles: [...state.profiles],
    institutions: [...state.institutions],
    slaRules: [...state.slaRules],
    settings: { ...state.settings, overlapThresholds: { ...state.settings.overlapThresholds } },
  }
  persist()
  for (const l of listeners) l()
}

function mutate(fn: (s: AppState) => void) {
  fn(state)
  emit()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return state
}

export function resetDemo() {
  state = buildSeedState()
  emit()
}

function audit(userId: string, action: string, entity_type: string, entity_id: string, old_value: string | null, new_value: string | null) {
  state.auditLogs.unshift({
    id: uid('aud'),
    user_id: userId,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    ip_reference: '127.0.0.1',
    created_at: nowIso(),
  })
}

function notify(userId: string, title: string, message: string, caseId: string | null, type: string, priority: ComplaintCase['priority'] = 'MEDIUM') {
  state.notifications.unshift({
    id: uid('ntf'),
    user_id: userId,
    case_id: caseId,
    notification_type: type,
    title,
    message,
    priority,
    read: false,
    created_at: nowIso(),
  })
}

function addAction(caseId: string, type: string, description: string, by: string, from: string | null, to: string | null) {
  const action: CaseAction = {
    id: uid('act'),
    case_id: caseId,
    action_type: type,
    action_description: description,
    performed_by: by,
    from_bureau_id: from,
    to_bureau_id: to,
    created_at: nowIso(),
  }
  state.actions.unshift(action)
  const c = state.cases.find((x) => x.id === caseId)
  if (c) {
    c.last_action_date = action.created_at
    c.updated_at = action.created_at
  }
  return action
}

export function login(email: string, password: string) {
  const account = state.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
  if (!account || account.password !== password) {
    return { ok: false as const, error: 'Invalid email or password.' }
  }
  const profile = state.profiles.find((p) => p.id === account.profileId)
  if (!profile?.active) return { ok: false as const, error: 'Account is inactive.' }
  state.sessionProfileId = profile.id
  audit(profile.id, 'Login', 'session', profile.id, null, email)
  emit()
  return { ok: true as const, profile }
}

export function logout() {
  if (state.sessionProfileId) audit(state.sessionProfileId, 'Logout', 'session', state.sessionProfileId, null, null)
  state.sessionProfileId = null
  emit()
}

export function currentProfile() {
  return state.profiles.find((p) => p.id === state.sessionProfileId) ?? null
}

export function canAccessCase(profile: Profile, c: ComplaintCase) {
  if (profile.role === 'SUPER_ADMIN' || profile.role === 'SENIOR_MANAGEMENT') return true
  if (profile.role === 'BUREAU_HEAD') return c.bureau_id === profile.bureau_id
  if (profile.role === 'CASE_OFFICER') return c.assigned_officer_id === profile.id || c.bureau_id === profile.bureau_id
  if (profile.role === 'REGIONAL_OFFICER') {
    const inst = state.institutions.find((i) => i.id === c.institution_id)
    return inst?.region === profile.region
  }
  return false
}

export function visibleCases(profile: Profile) {
  return state.cases.filter((c) => canAccessCase(profile, c))
}

export function dashboardStats(profile: Profile): DashboardStats {
  const list = visibleCases(profile)
  const pending = list.filter((c) => isPendingStatus(c.status) && c.status !== 'UNDER_PROCESS').length
  const underProcess = list.filter((c) => c.status === 'UNDER_PROCESS').length
  const disposed = list.filter((c) => c.status === 'DISPOSED' || c.status === 'CLOSED').length
  const overdue = list.filter((c) => slaState(c) === 'OVERDUE').length
  const activeLinks = state.links.filter((l) => !l.dismissed)
  const overlapCaseIds = new Set(activeLinks.flatMap((l) => [l.source_case_id, l.target_case_id]))
  const overlaps = list.filter((c) => overlapCaseIds.has(c.id)).length
  const highPriorityOverlaps = activeLinks.filter((l) => l.similarity_score >= 85).length
  const crossBureau = activeLinks.filter((l) => l.relationship_type === 'CROSS_BUREAU_OVERLAP').length
  const awaitingCoordination = activeLinks.filter((l) => l.coordination_requested && !l.confirmed).length
  const byStatus: Record<string, number> = {}
  for (const c of list) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1
  const byBureau = state.bureaus.map((b) => ({
    code: b.code,
    name: b.name,
    count: list.filter((c) => c.bureau_id === b.id && isPendingStatus(c.status)).length,
  }))
  const months: DashboardStats['monthlyTrend'] = []
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(2026, 9 - i, 1)
    const key = format(d, 'yyyy-MM')
    const received = list.filter((c) => c.received_date.slice(0, 7) === key).length
    const disp = list.filter((c) => (c.actual_disposal_date ?? '').slice(0, 7) === key).length
    months.push({ month: format(d, 'MMM'), received, disposed: disp })
  }
  const ageingMap: Record<string, number> = {
    '0–7 days': 0,
    '8–15 days': 0,
    '16–30 days': 0,
    '31–60 days': 0,
    '60+ days': 0,
  }
  for (const c of list.filter((x) => isPendingStatus(x.status))) {
    ageingMap[ageingBucket(caseAgeDays(c))] += 1
  }
  const thisMonth = list.filter((c) => c.received_date.startsWith('2026-10')).length
  const lastMonth = list.filter((c) => c.received_date.startsWith('2026-09')).length
  const monthDeltaPct = lastMonth === 0 ? 0 : Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10
  return {
    total: list.length,
    pending,
    underProcess,
    disposed,
    overdue,
    overlaps,
    monthDeltaPct,
    pendingOverdue: list.filter((c) => isPendingStatus(c.status) && slaState(c) === 'OVERDUE').length,
    highPriorityOverlaps,
    crossBureau,
    awaitingCoordination,
    byStatus,
    byBureau,
    monthlyTrend: months,
    ageing: Object.entries(ageingMap).map(([bucket, count]) => ({ bucket, count })),
  }
}

export function institutionMetrics(institutionId: string, profile: Profile) {
  const list = visibleCases(profile).filter((c) => c.institution_id === institutionId)
  const bureaus = new Set(list.map((c) => c.bureau_id))
  return {
    total: list.length,
    pending: list.filter((c) => isPendingStatus(c.status)).length,
    underProcess: list.filter((c) => c.status === 'UNDER_PROCESS').length,
    disposed: list.filter((c) => c.status === 'DISPOSED' || c.status === 'CLOSED').length,
    overdue: list.filter((c) => slaState(c) === 'OVERDUE').length,
    related: state.links.filter(
      (l) =>
        !l.dismissed &&
        list.some((c) => c.id === l.source_case_id || c.id === l.target_case_id),
    ).length,
    activeBureaus: bureaus.size,
    lastActivity: list.map((c) => c.last_action_date).sort().at(-1) ?? null,
    risk: list.filter((c) => slaState(c) === 'OVERDUE').length > 2 || list.filter((c) => isPendingStatus(c.status)).length >= 8,
  }
}

export function createCase(input: Omit<ComplaintCase, 'id' | 'case_id' | 'created_at' | 'updated_at' | 'overlap_status' | 'last_action_date' | 'pending_transfer_bureau_id' | 'actual_disposal_date'> & { case_id?: string }, actor: Profile) {
  const bureau = state.bureaus.find((b) => b.id === input.bureau_id)!
  const seq = 2000 + state.cases.length
  const c: ComplaintCase = {
    ...input,
    id: uid('case'),
    case_id: input.case_id ?? `${bureau.code}-2026-${seq}`,
    overlap_status: 'NONE',
    pending_transfer_bureau_id: null,
    actual_disposal_date: null,
    last_action_date: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  const embedding = {
    id: uid('emb'),
    case_id: c.id,
    embedding: embedText(complaintText(c)),
    created_at: c.created_at,
  }
  mutate((s) => {
    s.cases.unshift(c)
    s.embeddings.push(embedding)
    addAction(c.id, 'RECEIVED', `Complaint received by ${bureau.code}`, actor.id, null, bureau.id)
    const newLinks = detectOverlaps({
      cases: s.cases,
      institutions: s.institutions,
      embeddings: s.embeddings,
      actorId: actor.id,
      thresholds: s.settings.overlapThresholds,
      existing: s.links,
    }).filter((l) => l.source_case_id === c.id || l.target_case_id === c.id)
    s.links.push(...newLinks)
    if (newLinks.length) {
      const best = newLinks.sort((a, b) => b.similarity_score - a.similarity_score)[0]
      c.overlap_status = overlapLabel(best.similarity_score, s.settings.overlapThresholds)
      const other = s.cases.find((x) => x.id === (best.source_case_id === c.id ? best.target_case_id : best.source_case_id))
      if (other) {
        other.overlap_status = c.overlap_status
        notify(actor.id, 'Potential overlap detected', `${c.case_id} may relate to ${other.case_id}. Human verification required.`, c.id, 'OVERLAP', 'HIGH')
        if (other.assigned_officer_id) {
          notify(other.assigned_officer_id, 'Potential overlap detected', `${other.case_id} may relate to new case ${c.case_id}.`, other.id, 'OVERLAP', 'HIGH')
        }
      }
    }
    audit(actor.id, 'Created case', 'complaint_case', c.id, null, c.case_id)
  })
  return c
}

export function updateCaseStatus(caseId: string, status: CaseStatus, actor: Profile, remarks: string) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    const old = c.status
    c.status = status
    if (status === 'DISPOSED' || status === 'CLOSED') c.actual_disposal_date = nowIso()
    addAction(c.id, status, remarks || `Status changed to ${status}`, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Updated case status', 'complaint_case', c.id, old, status)
    if (c.assigned_officer_id && c.assigned_officer_id !== actor.id) {
      notify(c.assigned_officer_id, 'Case status updated', `${c.case_id}: ${old} → ${status}`, c.id, 'WORKFLOW', 'MEDIUM')
    }
  })
}

export function assignOfficer(caseId: string, officerId: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    const old = c.assigned_officer_id
    c.assigned_officer_id = officerId
    const officer = s.profiles.find((p) => p.id === officerId)
    addAction(c.id, 'ASSIGNED', `Assigned to ${officer?.full_name ?? 'officer'}`, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Assigned officer', 'complaint_case', c.id, old, officerId)
    notify(officerId, 'Case assigned', `${c.case_id} has been assigned to you.`, c.id, 'ASSIGNMENT', 'HIGH')
  })
}

export function addCaseRemark(caseId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    addAction(c.id, 'REMARK', text, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Added remark', 'complaint_case', c.id, null, text)
  })
}

export function requestInformation(caseId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    c.status = 'PENDING_INFORMATION'
    c.verification_status = 'EVIDENCE_REQUIRED'
    addAction(c.id, 'INFORMATION_REQUESTED', text, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Requested information', 'complaint_case', c.id, 'UNDER_PROCESS', 'PENDING_INFORMATION')
  })
}

export function requestInstitutionResponse(caseId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    c.verification_status = 'INSTITUTION_RESPONSE_REQUIRED'
    addAction(c.id, 'INSTITUTION_RESPONSE_REQUESTED', text, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Requested institution response', 'complaint_case', c.id, null, text)
  })
}

export function recordInstitutionResponse(caseId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    c.institution_response_received = true
    if (c.status === 'PENDING_INFORMATION') c.status = 'UNDER_PROCESS'
    addAction(c.id, 'INSTITUTION_RESPONSE', text, actor.id, c.bureau_id, c.bureau_id)
    notify(c.assigned_officer_id ?? actor.id, 'Institution response received', `${c.case_id}: response placed on record.`, c.id, 'RESPONSE', 'MEDIUM')
  })
}

export function escalateCase(caseId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    c.status = 'ESCALATED'
    addAction(c.id, 'ESCALATED', text, actor.id, c.bureau_id, c.bureau_id)
    const head = s.profiles.find((p) => p.role === 'BUREAU_HEAD' && p.bureau_id === c.bureau_id)
    if (head) notify(head.id, 'Case escalated', `${c.case_id} has been escalated.`, c.id, 'ESCALATION', 'HIGH')
    audit(actor.id, 'Escalated case', 'complaint_case', c.id, null, 'ESCALATED')
  })
}

export function requestTransfer(caseId: string, toBureauId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    c.status = 'TRANSFERRED'
    c.pending_transfer_bureau_id = toBureauId
    addAction(c.id, 'TRANSFER_REQUESTED', text, actor.id, c.bureau_id, toBureauId)
    const head = s.profiles.find((p) => p.role === 'BUREAU_HEAD' && p.bureau_id === toBureauId)
    const bureau = s.bureaus.find((b) => b.id === toBureauId)
    if (head) notify(head.id, 'Case transferred to your Bureau', `${c.case_id} awaits acceptance by ${bureau?.code}.`, c.id, 'TRANSFER', 'HIGH')
    audit(actor.id, 'Requested transfer', 'complaint_case', c.id, c.bureau_id, toBureauId)
  })
}

export function acceptTransfer(caseId: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c || !c.pending_transfer_bureau_id) return
    const from = c.bureau_id
    c.bureau_id = c.pending_transfer_bureau_id
    c.pending_transfer_bureau_id = null
    c.status = 'UNDER_PROCESS'
    c.assigned_officer_id = null
    addAction(c.id, 'TRANSFER_ACCEPTED', 'Transfer accepted. New responsible Bureau recorded.', actor.id, from, c.bureau_id)
    audit(actor.id, 'Accepted transfer', 'complaint_case', c.id, from, c.bureau_id)
  })
}

export function linkCases(sourceId: string, targetId: string, actor: Profile) {
  mutate((s) => {
    const existing = s.links.find(
      (l) =>
        (l.source_case_id === sourceId && l.target_case_id === targetId) ||
        (l.source_case_id === targetId && l.target_case_id === sourceId),
    )
    if (existing) {
      existing.confirmed = true
      existing.dismissed = false
      existing.relationship_type = existing.relationship_type === 'CROSS_BUREAU_OVERLAP' ? 'CROSS_BUREAU_OVERLAP' : 'RELATED_CASE'
    } else {
      s.links.push({
        id: uid('link'),
        source_case_id: sourceId,
        target_case_id: targetId,
        relationship_type: 'RELATED_CASE',
        similarity_score: 0,
        reason: 'Manually linked by authorised officer',
        reasons: ['Manually confirmed by authorised officer'],
        breakdown: { institution: 1, semantic: 0, category: 0, temporal: 0, total: 1 },
        created_by: actor.id,
        created_at: nowIso(),
        confirmed: true,
        dismissed: false,
        coordination_requested: false,
      })
    }
    const a = s.cases.find((c) => c.id === sourceId)
    const b = s.cases.find((c) => c.id === targetId)
    if (a) a.overlap_status = 'CONFIRMED_RELATED'
    if (b) b.overlap_status = 'CONFIRMED_RELATED'
    if (a && b) {
      addAction(a.id, 'LINKED', `Linked with ${b.case_id}. Both files remain independent.`, actor.id, a.bureau_id, b.bureau_id)
      addAction(b.id, 'LINKED', `Linked with ${a.case_id}. Both files remain independent.`, actor.id, b.bureau_id, a.bureau_id)
    }
    audit(actor.id, 'Linked cases', 'case_link', sourceId, null, targetId)
  })
}

export function markUnrelated(linkId: string, actor: Profile) {
  mutate((s) => {
    const link = s.links.find((l) => l.id === linkId)
    if (!link) return
    link.dismissed = true
    link.confirmed = false
    const a = s.cases.find((c) => c.id === link.source_case_id)
    const b = s.cases.find((c) => c.id === link.target_case_id)
    if (a) a.overlap_status = 'UNRELATED'
    if (b) b.overlap_status = 'UNRELATED'
    audit(actor.id, 'Marked unrelated', 'case_link', linkId, 'POTENTIAL', 'UNRELATED')
  })
}

export function requestCoordination(linkId: string, actor: Profile) {
  mutate((s) => {
    const link = s.links.find((l) => l.id === linkId)
    if (!link) return
    link.coordination_requested = true
    link.relationship_type = 'REQUIRES_COORDINATION'
    const a = s.cases.find((c) => c.id === link.source_case_id)
    const b = s.cases.find((c) => c.id === link.target_case_id)
    if (a && b) {
      addAction(a.id, 'COORDINATION_REQUESTED', `Coordination requested with ${b.case_id}.`, actor.id, a.bureau_id, b.bureau_id)
      const head = s.profiles.find((p) => p.role === 'BUREAU_HEAD' && p.bureau_id === b.bureau_id)
      if (head) notify(head.id, 'Coordination requested', `${a.case_id} seeks coordination with ${b.case_id}.`, b.id, 'COORDINATION', 'HIGH')
    }
    audit(actor.id, 'Requested coordination', 'case_link', linkId, null, 'REQUIRES_COORDINATION')
  })
}

export function uploadDocument(caseId: string, file: File, actor: Profile) {
  return new Promise<CaseDocument>((resolve, reject) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|docx?)$/i)) {
      reject(new Error('File type not permitted. Upload PDF, image or Word documents only.'))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('File exceeds the 8 MB limit.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const doc: CaseDocument = {
        id: uid('doc'),
        case_id: caseId,
        document_name: file.name,
        document_type: file.type || 'application/octet-stream',
        storage_path: `complaint-documents/${caseId}/${file.name}`,
        uploaded_by: actor.id,
        verification_status: 'UNDER_REVIEW',
        uploaded_at: nowIso(),
        data_url: String(reader.result),
      }
      mutate((s) => {
        const c = s.cases.find((x) => x.id === caseId)
        s.documents.push(doc)
        if (c) {
          c.documents_received = true
          addAction(c.id, 'DOCUMENT_UPLOADED', `Uploaded ${file.name}`, actor.id, c.bureau_id, c.bureau_id)
        }
        audit(actor.id, 'Uploaded document', 'case_document', doc.id, null, file.name)
      })
      resolve(doc)
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

export function updateVerification(caseId: string, patch: Partial<Pick<ComplaintCase, 'mobile_verified' | 'documents_received' | 'institution_response_received' | 'verification_status'>>, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    Object.assign(c, patch)
    addAction(c.id, 'VERIFICATION_UPDATED', `Verification updated to ${c.verification_status}`, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Updated verification', 'complaint_case', c.id, null, c.verification_status)
  })
}

export function markNotificationRead(id: string) {
  mutate((s) => {
    const n = s.notifications.find((x) => x.id === id)
    if (n) n.read = true
  })
}

export function markAllNotificationsRead(userId: string) {
  mutate((s) => {
    for (const n of s.notifications) if (n.user_id === userId) n.read = true
  })
}

export function saveProfile(profile: Profile, actor: Profile) {
  if (actor.role !== 'SUPER_ADMIN') return
  mutate((s) => {
    const i = s.profiles.findIndex((p) => p.id === profile.id)
    const old = i >= 0 ? s.profiles[i].role : null
    if (i >= 0) s.profiles[i] = profile
    else s.profiles.push(profile)
    if (!s.accounts.some((a) => a.profileId === profile.id)) {
      s.accounts.push({ email: profile.email, password: DEMO_PASSWORD, profileId: profile.id })
    }
    audit(actor.id, 'Saved user', 'profile', profile.id, old, profile.role)
  })
}

export function saveSlaRule(id: string, patch: Partial<AppState['slaRules'][number]>, actor: Profile) {
  mutate((s) => {
    const rule = s.slaRules.find((r) => r.id === id)
    if (rule) Object.assign(rule, patch)
    audit(actor.id, 'Updated SLA rule', 'sla_rule', id, null, JSON.stringify(patch))
  })
}

export function saveThresholds(thresholds: AppState['settings']['overlapThresholds'], actor: Profile) {
  mutate((s) => {
    s.settings.overlapThresholds = thresholds
    audit(actor.id, 'Updated overlap thresholds', 'settings', 'overlap', null, JSON.stringify(thresholds))
  })
}

export function saveInstitution(inst: InstitutionLike, actor: Profile) {
  mutate((s) => {
    const i = s.institutions.findIndex((x) => x.id === inst.id)
    if (i >= 0) s.institutions[i] = { ...s.institutions[i], ...inst, updated_at: nowIso() }
    else s.institutions.push({ ...inst, created_at: nowIso(), updated_at: nowIso() })
    audit(actor.id, 'Saved institution', 'institution', inst.id, null, inst.institution_name)
  })
}

type InstitutionLike = AppState['institutions'][number]

export function globalSearch(q: string, profile: Profile) {
  const query = q.trim().toLowerCase()
  if (query.length < 2) return { institutions: [], cases: [], documents: [] }
  const cases = visibleCases(profile)
  const caseIds = new Set(cases.map((c) => c.id))
  const institutions = state.institutions.filter((i) => {
    if (profile.role === 'REGIONAL_OFFICER' && i.region !== profile.region) return false
    return (
      i.institution_name.toLowerCase().includes(query) ||
      i.aicte_permanent_id.toLowerCase().includes(query) ||
      i.city.toLowerCase().includes(query)
    )
  }).slice(0, 8)
  const matchedCases = cases
    .filter(
      (c) =>
        c.case_id.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        state.profiles.find((p) => p.id === c.assigned_officer_id)?.full_name.toLowerCase().includes(query) ||
        state.bureaus.find((b) => b.id === c.bureau_id)?.code.toLowerCase() === query,
    )
    .slice(0, 8)
  const documents = state.documents
    .filter((d) => caseIds.has(d.case_id) && d.document_name.toLowerCase().includes(query))
    .slice(0, 8)
  return { institutions, cases: matchedCases, documents }
}

export function caseInsights(c: ComplaintCase) {
  const inst = state.institutions.find((i) => i.id === c.institution_id)!
  const related = state.links.filter(
    (l) => !l.dismissed && (l.source_case_id === c.id || l.target_case_id === c.id),
  )
  const relatedCases = related.map((l) => {
    const otherId = l.source_case_id === c.id ? l.target_case_id : l.source_case_id
    return { link: l, other: state.cases.find((x) => x.id === otherId)! }
  }).filter((x) => x.other)
  const best = relatedCases.sort((a, b) => b.link.similarity_score - a.link.similarity_score)[0]
  const cross = relatedCases.some((r) => r.other.bureau_id !== c.bureau_id)
  const cat = suggestCategory(`${c.subject} ${c.description}`)
  return {
    relatedCount: relatedCases.length,
    highest: best?.link.similarity_score ?? 0,
    relatedCases,
    summary: officerSummary(c, relatedCases.length),
    next: suggestedNextAction(c, relatedCases.length, cross),
    suggestedCategory: cat,
    recommended: NEXT_ACTIONS[c.status],
    institution: inst,
  }
}

export function rescoreCase(c: ComplaintCase) {
  const inst = state.institutions.find((i) => i.id === c.institution_id)
  const emb = state.embeddings.find((e) => e.case_id === c.id)
  if (!inst || !emb) return []
  return state.cases
    .filter((o) => o.id !== c.id)
    .map((o) => {
      const oi = state.institutions.find((i) => i.id === o.institution_id)
      const oe = state.embeddings.find((e) => e.case_id === o.id)
      if (!oi || !oe) return null
      const scored = scorePair(c, o, inst, oi, emb.embedding, oe.embedding)
      return { other: o, ...scored, pct: Math.round(scored.breakdown.total * 100) }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)
}

export function expectedDisposal(category: ComplaintCase['complaint_category'], priority: ComplaintCase['priority'], received: string) {
  const rule = matchSlaRule(state.slaRules, category, priority)
  const days = rule?.allowed_days ?? 30
  const d = new Date(received)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export { state as demoState, slaState, matchSlaRule }

export function bureauById(id: string) {
  return state.bureaus.find((b) => b.id === id)
}

export function profileById(id: string | null) {
  return state.profiles.find((p) => p.id === id)
}

export function institutionById(id: string) {
  return state.institutions.find((i) => i.id === id)
}

export function roleCan(role: Role, action: 'writeCase' | 'assign' | 'transfer' | 'admin' | 'reports') {
  if (role === 'SUPER_ADMIN') return true
  if (action === 'admin') return false
  if (action === 'reports') return role === 'SENIOR_MANAGEMENT' || role === 'BUREAU_HEAD'
  if (action === 'assign' || action === 'transfer') return role === 'BUREAU_HEAD'
  if (action === 'writeCase') return role === 'BUREAU_HEAD' || role === 'CASE_OFFICER' || role === 'REGIONAL_OFFICER'
  return false
}

export function updateVerificationStatus(id: string, status: VerificationStatus, actor: Profile) {
  updateVerification(id, { verification_status: status }, actor)
}
