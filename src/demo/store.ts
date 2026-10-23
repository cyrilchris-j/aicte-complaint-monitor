import { format } from 'date-fns'
import { NEXT_ACTIONS } from '../lib/constants'
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
  Category,
  ComplainantType,
  ComplaintCase,
  ComplaintEmbedding,
  DashboardStats,
  Priority,
  Profile,
  Role,
  VerificationStatus,
} from '../types'

import { buildSeedState } from './seed'
import { supabase, supabaseEnabled } from '../lib/supabase'

const KEY = 'aicte-casesync-clean-v2'

function fireAndForget(promiseLike: PromiseLike<unknown> | Promise<unknown>) {
  Promise.resolve(promiseLike).catch((err: unknown) => {
    console.warn('Supabase sync warning:', err)
  })
}

// Clean up old mock localStorage data if present
try {
  localStorage.removeItem('aicte-casesync-demo-v1')
  localStorage.removeItem('aicte-casesync-clean-v1')
} catch {
  /* ignore */
}

let state: AppState = load()
const listeners = new Set<() => void>()

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.profiles?.length && parsed.institutions?.length && parsed.cases?.length) return parsed
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
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  emit()
  if (supabaseEnabled) {
    void syncFromSupabase()
  }
}

// Supabase sync layer
export async function syncFromSupabase() {
  if (!supabaseEnabled || !supabase) return
  try {
    const [bRes, pRes, iRes, cRes, aRes, dRes, lRes, nRes, sRes, audRes] = await Promise.all([
      supabase.from('bureaus').select('*').order('created_at'),
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('institutions').select('*').order('institution_name'),
      supabase.from('complaint_cases').select('*').order('received_date', { ascending: false }),
      supabase.from('case_actions').select('*').order('created_at', { ascending: false }),
      supabase.from('case_documents').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('case_links').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('sla_rules').select('*').order('allowed_days'),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ])

    mutate((s) => {
      if (bRes.data?.length) s.bureaus = bRes.data
      if (pRes.data?.length) s.profiles = pRes.data
      if (iRes.data?.length) s.institutions = iRes.data
      if (cRes.data?.length) s.cases = cRes.data
      if (aRes.data?.length) s.actions = aRes.data
      if (dRes.data?.length) s.documents = dRes.data
      if (lRes.data?.length) s.links = lRes.data
      if (nRes.data?.length) s.notifications = nRes.data
      if (sRes.data?.length) s.slaRules = sRes.data
      if (audRes.data?.length) s.auditLogs = audRes.data
    })
  } catch (err) {
    console.error('Failed to sync from Supabase:', err)
  }
}

// Initialise Supabase session & real-time sync
if (supabaseEnabled && supabase) {
  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const found = state.profiles.find((p) => p.auth_user_id === session.user.id || p.email.toLowerCase() === session.user.email?.toLowerCase())
        if (found) {
          state.sessionProfileId = found.id
        }
      }
      await syncFromSupabase()
    } catch {
      /* ignore */
    }
  })()

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const found = state.profiles.find((p) => p.auth_user_id === session.user.id || p.email.toLowerCase() === session.user.email?.toLowerCase())
      if (found) {
        state.sessionProfileId = found.id
        emit()
      }
      await syncFromSupabase()
    } else {
      state.sessionProfileId = null
      emit()
    }
  })
}

function audit(userId: string, action: string, entity_type: string, entity_id: string, old_value: string | null, new_value: string | null) {
  const item = {
    id: uid('aud'),
    user_id: userId,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    ip_reference: '10.20.0.12',
    created_at: nowIso(),
  }
  state.auditLogs.unshift(item)
  if (supabaseEnabled && supabase) {
    fireAndForget(supabase.from('audit_logs').insert(item))
  }
}

function notify(userId: string, title: string, message: string, caseId: string | null, type: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
  const item = {
    id: uid('ntf'),
    user_id: userId,
    case_id: caseId,
    notification_type: type,
    title,
    message,
    priority,
    read: false,
    created_at: nowIso(),
  }
  state.notifications.unshift(item)
  if (supabaseEnabled && supabase) {
    fireAndForget(supabase.from('notifications').insert(item))
  }
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
  if (supabaseEnabled && supabase) {
    fireAndForget(supabase.from('case_actions').insert(action))
  }
  return action
}

export async function login(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  if (supabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (error) {
        return { ok: false as const, error: error.message }
      }
      if (data.user) {
        await syncFromSupabase()
        const p = state.profiles.find((x) => x.auth_user_id === data.user.id || x.email.toLowerCase() === cleanEmail)
        if (p) {
          state.sessionProfileId = p.id
          emit()
          audit(p.id, 'Login', 'session', p.id, null, email)
          return { ok: true as const, profile: p }
        }
      }
    } catch (e: any) {
      return { ok: false as const, error: e.message || 'Unable to sign in via Supabase.' }
    }
  }

  // Fallback demo account authentication
  const account = state.accounts.find((a) => a.email.toLowerCase() === cleanEmail)
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

export async function logout() {
  if (state.sessionProfileId) audit(state.sessionProfileId, 'Logout', 'session', state.sessionProfileId, null, null)
  state.sessionProfileId = null
  if (supabaseEnabled && supabase) {
    await supabase.auth.signOut().catch(() => {})
  }
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
  const m0 = months[months.length - 1]?.received ?? 0
  const m1 = months[months.length - 2]?.received ?? 0
  return {
    total: list.length,
    pending,
    underProcess,
    disposed,
    overdue,
    overlaps,
    monthDeltaPct: list.length ? Math.round(((m0 - m1) / Math.max(1, m1)) * 100) : 0,
    pendingOverdue: overdue,
    byStatus,
    byBureau,
    monthlyTrend: months,
    ageing: Object.entries(ageingMap).map(([bucket, count]) => ({ bucket, count })),
    highPriorityOverlaps,
    crossBureau,
    awaitingCoordination,
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

export function createCase(
  input: Omit<ComplaintCase, 'id' | 'case_id' | 'created_at' | 'updated_at' | 'overlap_status' | 'last_action_date' | 'pending_transfer_bureau_id' | 'actual_disposal_date'> & { case_id?: string },
  actor: Profile,
) {
  const bureau = state.bureaus.find((b) => b.id === input.bureau_id) || state.bureaus[0]
  const seq = 1000 + state.cases.length + 1
  const c: ComplaintCase = {
    ...input,
    id: uid('case'),
    case_id: input.case_id ?? `${bureau?.code || 'CASE'}-2026-${seq}`,
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
    addAction(c.id, 'RECEIVED', `Complaint received by ${bureau?.code || 'bureau'}`, actor.id, null, bureau?.id ?? null)
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

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').insert({
        id: c.id,
        case_id: c.case_id,
        institution_id: c.institution_id,
        bureau_id: c.bureau_id,
        assigned_officer_id: c.assigned_officer_id,
        complainant_type: c.complainant_type,
        complainant_name: c.complainant_name,
        complainant_reference: c.complainant_reference,
        complaint_category: c.complaint_category,
        subject: c.subject,
        description: c.description,
        priority: c.priority,
        status: c.status,
        received_date: c.received_date,
        last_action_date: c.last_action_date,
        expected_disposal_date: c.expected_disposal_date,
        source: c.source,
        verification_status: c.verification_status,
        overlap_status: c.overlap_status,
        mobile_verified: c.mobile_verified,
        documents_received: c.documents_received,
        institution_response_received: c.institution_response_received,
      })
    )
  }

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

  if (supabaseEnabled && supabase) {
    const c = state.cases.find((x) => x.id === caseId)
    if (c) {
      fireAndForget(
        supabase.from('complaint_cases').update({
          status,
          actual_disposal_date: c.actual_disposal_date,
          last_action_date: c.last_action_date,
          updated_at: nowIso(),
        }).eq('id', caseId)
      )
    }
  }
}

export function updateStatus(caseId: string, status: CaseStatus, actor: Profile, remarks: string = '') {
  updateCaseStatus(caseId, status, actor, remarks)
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

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').update({
        assigned_officer_id: officerId,
        updated_at: nowIso(),
      }).eq('id', caseId)
    )
  }
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

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').update({
        status: 'PENDING_INFORMATION',
        verification_status: 'EVIDENCE_REQUIRED',
        updated_at: nowIso(),
      }).eq('id', caseId)
    )
  }
}

export function requestInstitutionResponse(caseId: string, text: string, actor: Profile) {
  mutate((s) => {
    const c = s.cases.find((x) => x.id === caseId)
    if (!c) return
    c.verification_status = 'INSTITUTION_RESPONSE_REQUIRED'
    addAction(c.id, 'INSTITUTION_RESPONSE_REQUESTED', text, actor.id, c.bureau_id, c.bureau_id)
    audit(actor.id, 'Requested institution response', 'complaint_case', c.id, null, text)
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').update({
        verification_status: 'INSTITUTION_RESPONSE_REQUIRED',
        updated_at: nowIso(),
      }).eq('id', caseId)
    )
  }
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

  if (supabaseEnabled && supabase) {
    const c = state.cases.find((x) => x.id === caseId)
    if (c) {
      fireAndForget(
        supabase.from('complaint_cases').update({
          institution_response_received: true,
          status: c.status,
          updated_at: nowIso(),
        }).eq('id', caseId)
      )
    }
  }
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

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').update({
        status: 'ESCALATED',
        updated_at: nowIso(),
      }).eq('id', caseId)
    )
  }
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

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').update({
        status: 'TRANSFERRED',
        pending_transfer_bureau_id: toBureauId,
        updated_at: nowIso(),
      }).eq('id', caseId)
    )
  }
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

  if (supabaseEnabled && supabase) {
    const c = state.cases.find((x) => x.id === caseId)
    if (c) {
      fireAndForget(
        supabase.from('complaint_cases').update({
          bureau_id: c.bureau_id,
          pending_transfer_bureau_id: null,
          status: 'UNDER_PROCESS',
          assigned_officer_id: null,
          updated_at: nowIso(),
        }).eq('id', caseId)
      )
    }
  }
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
      const link = {
        id: uid('link'),
        source_case_id: sourceId,
        target_case_id: targetId,
        relationship_type: 'RELATED_CASE' as const,
        similarity_score: 0,
        reason: 'Manually linked by authorised officer',
        reasons: ['Manually confirmed by authorised officer'],
        breakdown: { institution: 1, semantic: 0, category: 0, temporal: 0, total: 1 },
        created_by: actor.id,
        created_at: nowIso(),
        confirmed: true,
        dismissed: false,
        coordination_requested: false,
      }
      s.links.push(link)
      if (supabaseEnabled && supabase) {
        fireAndForget(supabase.from('case_links').insert(link))
      }
    }
    const a = s.cases.find((c) => c.id === sourceId)
    const b = s.cases.find((c) => c.id === targetId)
    if (a) a.overlap_status = 'CONFIRMED_RELATED'
    if (b) b.overlap_status = 'CONFIRMED_RELATED'
    audit(actor.id, 'Linked cases', 'case_link', `${sourceId} ↔ ${targetId}`, null, 'CONFIRMED_RELATED')
  })
}

export function markUnrelated(linkId: string, actor: Profile) {
  mutate((s) => {
    const l = s.links.find((x) => x.id === linkId)
    if (!l) return
    l.dismissed = true
    l.confirmed = false
    audit(actor.id, 'Marked unrelated', 'case_link', linkId, null, 'DISMISSED')
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('case_links').update({
        dismissed: true,
        confirmed: false,
      }).eq('id', linkId)
    )
  }
}

export function requestCoordination(linkId: string, actor: Profile) {
  mutate((s) => {
    const l = s.links.find((x) => x.id === linkId)
    if (!l) return
    l.coordination_requested = true
    const a = s.cases.find((c) => c.id === l.source_case_id)
    const b = s.cases.find((c) => c.id === l.target_case_id)
    if (a && b) {
      const hA = s.profiles.find((p) => p.role === 'BUREAU_HEAD' && p.bureau_id === a.bureau_id)
      const hB = s.profiles.find((p) => p.role === 'BUREAU_HEAD' && p.bureau_id === b.bureau_id)
      if (hA) notify(hA.id, 'Coordination requested', `Bilateral coordination requested for ${a.case_id} ↔ ${b.case_id}.`, a.id, 'OVERLAP', 'HIGH')
      if (hB && hB.id !== hA?.id) notify(hB.id, 'Coordination requested', `Bilateral coordination requested for ${b.case_id} ↔ ${a.case_id}.`, b.id, 'OVERLAP', 'HIGH')
    }
    audit(actor.id, 'Requested coordination', 'case_link', linkId, null, 'COORDINATION_REQUESTED')
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('case_links').update({
        coordination_requested: true,
      }).eq('id', linkId)
    )
  }
}

export function uploadDocument(caseId: string, file: File, actor: Profile): Promise<CaseDocument> {
  return new Promise((resolve, reject) => {
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

      if (supabaseEnabled && supabase) {
        fireAndForget(
          supabase.from('case_documents').insert({
            id: doc.id,
            case_id: doc.case_id,
            document_name: doc.document_name,
            document_type: doc.document_type,
            storage_path: doc.storage_path,
            uploaded_by: doc.uploaded_by,
            verification_status: doc.verification_status,
            uploaded_at: doc.uploaded_at,
          })
        )
      }

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

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').update({
        ...patch,
        updated_at: nowIso(),
      }).eq('id', caseId)
    )
  }
}

export function markNotificationRead(id: string) {
  mutate((s) => {
    const n = s.notifications.find((x) => x.id === id)
    if (n) n.read = true
  })
  if (supabaseEnabled && supabase) {
    fireAndForget(supabase.from('notifications').update({ read: true }).eq('id', id))
  }
}

export function markAllNotificationsRead(userId: string) {
  mutate((s) => {
    for (const n of s.notifications) if (n.user_id === userId) n.read = true
  })
  if (supabaseEnabled && supabase) {
    fireAndForget(supabase.from('notifications').update({ read: true }).eq('user_id', userId))
  }
}

export function saveProfile(profile: Profile, actor: Profile) {
  if (actor.role !== 'SUPER_ADMIN') return
  mutate((s) => {
    const i = s.profiles.findIndex((p) => p.id === profile.id)
    const old = i >= 0 ? s.profiles[i].role : null
    if (i >= 0) s.profiles[i] = profile
    else s.profiles.push(profile)
    audit(actor.id, 'Saved user', 'profile', profile.id, old, profile.role)
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('profiles').upsert({
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        bureau_id: profile.bureau_id,
        region: profile.region,
        designation: profile.designation,
        phone: profile.phone || '',
        active: profile.active,
        updated_at: nowIso(),
      })
    )
  }
}

export function saveSlaRule(id: string, patch: Partial<AppState['slaRules'][number]>, actor: Profile) {
  mutate((s) => {
    const rule = s.slaRules.find((r) => r.id === id)
    if (rule) Object.assign(rule, patch)
    audit(actor.id, 'Updated SLA rule', 'sla_rule', id, null, JSON.stringify(patch))
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(supabase.from('sla_rules').update(patch).eq('id', id))
  }
}

export function saveThresholds(thresholds: AppState['settings']['overlapThresholds'], actor: Profile) {
  mutate((s) => {
    s.settings.overlapThresholds = thresholds
    audit(actor.id, 'Updated overlap thresholds', 'settings', 'overlap', null, JSON.stringify(thresholds))
  })
}

export function saveInstitution(inst: InstitutionLike, actor: Profile) {
  const isNew = !state.institutions.some((x) => x.id === inst.id)
  mutate((s) => {
    const i = s.institutions.findIndex((x) => x.id === inst.id)
    if (i >= 0) s.institutions[i] = { ...s.institutions[i], ...inst, updated_at: nowIso() }
    else s.institutions.push({ ...inst, created_at: nowIso(), updated_at: nowIso() })
    audit(actor.id, isNew ? 'Created institution' : 'Updated institution', 'institution', inst.id, null, inst.institution_name)
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('institutions').upsert({
        id: inst.id,
        aicte_permanent_id: inst.aicte_permanent_id,
        institution_name: inst.institution_name,
        institution_type: inst.institution_type || null,
        address: inst.address || null,
        city: inst.city || null,
        district: inst.district || null,
        state: inst.state || null,
        region: inst.region || null,
        pincode: inst.pincode || null,
        contact_email: inst.contact_email || null,
        contact_phone: inst.contact_phone || null,
        status: inst.status || 'Active',
        updated_at: nowIso(),
      })
    )
  }
}

export function createInstitution(
  input: {
    institution_name: string
    aicte_permanent_id: string
    city: string
    state: string
    region: string
    district?: string
    institution_type?: string
  },
  actor: Profile,
) {
  const id = uid('inst')
  const inst: InstitutionLike = {
    id,
    aicte_permanent_id: input.aicte_permanent_id.trim().toUpperCase(),
    institution_name: input.institution_name.trim(),
    institution_type: input.institution_type ?? 'Engineering & Technology',
    address: '',
    city: input.city.trim(),
    district: input.district ?? input.city.trim(),
    state: input.state.trim(),
    region: input.region.trim(),
    pincode: '',
    contact_email: '',
    contact_phone: '',
    status: 'Active',
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  saveInstitution(inst, actor)
  return inst
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
  const inst = state.institutions.find((i) => i.id === c.institution_id)
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

// ----------------------------------------------------
// Public Complaint Portal & OTP Verification Subsystem
// ----------------------------------------------------

interface OTPStoreItem {
  identifier: string
  code: string
  expiresAt: number
  attempts: number
  verified: boolean
  lastSentAt: number
}

const otpStore = new Map<string, OTPStoreItem>()

export function requestOTP(identifier: string, type: 'email' | 'mobile') {
  const clean = identifier.trim().toLowerCase()
  const existing = otpStore.get(clean)
  const now = Date.now()

  // Cooldown check: 30 seconds
  if (existing && now - existing.lastSentAt < 30000) {
    const remaining = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000)
    return { ok: false, error: `Please wait ${remaining} seconds before requesting a new OTP.` }
  }

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000))
  // Exactly 5 minutes validity
  const expiresAt = now + 5 * 60 * 1000

  otpStore.set(clean, {
    identifier: clean,
    code,
    expiresAt,
    attempts: 0,
    verified: false,
    lastSentAt: now,
  })

  const provider = type === 'email' 
    ? (import.meta.env.VITE_EMAIL_OTP_PROVIDER || 'simulation')
    : (import.meta.env.VITE_SMS_OTP_PROVIDER || 'simulation')

  // Supabase persistence if connected
  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('otp_verifications').insert({
        identifier: clean,
        otp_hash: btoa(code + clean).slice(0, 32),
        channel: type,
        expires_at: new Date(expiresAt).toISOString(),
        attempts: 0,
        verified: false,
      })
    )
  }

  return {
    ok: true,
    code,
    expiresAt,
    expiresInSeconds: 300,
    provider,
    demoNotice: `Demo Gateway [${provider.toUpperCase()}]: 6-digit ${type.toUpperCase()} OTP for ${identifier} is ${code}`,
  }
}

export function verifyOTP(identifier: string, enteredCode: string) {
  const clean = identifier.trim().toLowerCase()
  const record = otpStore.get(clean)
  const now = Date.now()

  if (!record) {
    return { ok: false, error: 'No OTP generated for this contact. Please request an OTP first.' }
  }

  if (now > record.expiresAt) {
    return { ok: false, error: 'OTP has expired. Verification codes are valid for exactly 5 minutes. Please request a new OTP.' }
  }

  if (record.attempts >= 5) {
    return { ok: false, error: 'Maximum verification attempts (5) exceeded. Please generate a new OTP.' }
  }

  if (record.code !== enteredCode.trim()) {
    record.attempts += 1
    const rem = 5 - record.attempts
    if (supabaseEnabled && supabase) {
      fireAndForget(
        supabase.from('otp_verifications').update({ attempts: record.attempts, updated_at: new Date().toISOString() }).eq('identifier', clean)
      )
    }
    return { ok: false, error: `Incorrect 6-digit OTP. ${rem} attempt${rem === 1 ? '' : 's'} remaining.` }
  }

  record.verified = true
  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('otp_verifications').update({ verified: true, updated_at: new Date().toISOString() }).eq('identifier', clean)
    )
  }
  return { ok: true }
}

export function isContactVerified(identifier: string) {
  const clean = identifier.trim().toLowerCase()
  return otpStore.get(clean)?.verified ?? false
}

export function resetContactVerification(identifier: string) {
  const clean = identifier.trim().toLowerCase()
  otpStore.delete(clean)
}

export function submitPublicComplaint(input: {
  complainant_name: string
  complainant_type: ComplainantType
  complainant_email: string
  complainant_mobile: string
  institution_id: string
  complaint_category: Category
  sub_category?: string
  incident_date?: string
  subject: string
  description: string
  priority: Priority
  documents?: { name: string; type: string; dataUrl?: string }[]
}) {
  const inst = state.institutions.find((i) => i.id === input.institution_id)
  if (!inst) throw new Error('Selected institution does not exist.')

  // Bureau routing logic
  let targetBureau = state.bureaus.find((b) => b.code === 'RB') || state.bureaus[0]
  if (['Ragging / Harassment', 'Student Welfare', 'Hostel', 'Child Safety', 'Cyber / Online Harassment', 'Women Safety'].includes(input.complaint_category)) {
    const pgrc = state.bureaus.find((b) => b.code === 'PGRC')
    if (pgrc) targetBureau = pgrc
  } else if (input.complaint_category === 'Accreditation / Approval') {
    const ab = state.bureaus.find((b) => b.code === 'AB') || state.bureaus.find((b) => b.code === 'RB')
    if (ab) targetBureau = ab
  } else if (input.complaint_category === 'Infrastructure' && inst.region) {
    const ro = state.bureaus.find((b) => b.code === 'RO')
    if (ro) targetBureau = ro
  }

  const seq = 1000 + state.cases.length + 1
  const caseId = `${targetBureau.code}-2026-${seq}`
  const now = nowIso()

  const c: ComplaintCase = {
    id: uid('case'),
    case_id: caseId,
    institution_id: inst.id,
    bureau_id: targetBureau.id,
    assigned_officer_id: null,
    complainant_type: input.complainant_type,
    complainant_name: input.complainant_name,
    complainant_reference: `REF-2026-${inst.state.slice(0, 2).toUpperCase()}-${seq}`,
    complainant_email: input.complainant_email,
    complainant_mobile: input.complainant_mobile,
    complaint_category: input.complaint_category,
    sub_category: input.sub_category,
    incident_date: input.incident_date,
    subject: input.subject,
    description: input.description,
    priority: input.priority,
    status: 'NEW',
    received_date: now,
    last_action_date: now,
    expected_disposal_date: expectedDisposal(input.complaint_category, input.priority, now),
    actual_disposal_date: null,
    source: 'AICTE Public Complaint Portal',
    verification_status: 'VERIFIED',
    overlap_status: 'NONE',
    pending_transfer_bureau_id: null,
    mobile_verified: true,
    email_verified: true,
    documents_received: (input.documents?.length ?? 0) > 0,
    institution_response_received: false,
    created_at: now,
    updated_at: now,
  }

  const embedding: ComplaintEmbedding = {
    id: uid('emb'),
    case_id: c.id,
    embedding: embedText(complaintText(c)),
    created_at: now,
  }

  mutate((s) => {
    s.cases.unshift(c)
    s.embeddings.push(embedding)

    s.actions.unshift({
      id: uid('act'),
      case_id: c.id,
      action_type: 'RECEIVED',
      action_description: `Complaint submitted via Public Portal and routed to ${targetBureau.name} (${targetBureau.code}).`,
      performed_by: 'system',
      from_bureau_id: null,
      to_bureau_id: targetBureau.id,
      created_at: now,
    })

    if (input.documents?.length) {
      for (const d of input.documents) {
        s.documents.unshift({
          id: uid('doc'),
          case_id: c.id,
          document_name: d.name,
          document_type: d.type || 'Supporting Evidence',
          storage_path: `public_uploads/${c.id}/${d.name}`,
          uploaded_by: 'Complainant',
          verification_status: 'UNDER_REVIEW',
          uploaded_at: now,
          data_url: d.dataUrl,
        })
      }
    }

    const newLinks = detectOverlaps({
      cases: s.cases,
      institutions: s.institutions,
      embeddings: s.embeddings,
      actorId: 'system',
      thresholds: s.settings.overlapThresholds,
      existing: s.links,
    }).filter((l) => l.source_case_id === c.id || l.target_case_id === c.id)

    s.links.push(...newLinks)
    if (newLinks.length) {
      const best = newLinks.sort((a, b) => b.similarity_score - a.similarity_score)[0]
      c.overlap_status = overlapLabel(best.similarity_score, s.settings.overlapThresholds)
    }

    const bureauHead = s.profiles.find((p) => p.role === 'BUREAU_HEAD' && p.bureau_id === targetBureau.id)
    if (bureauHead) {
      notify(bureauHead.id, 'New Complaint Received', `Case ${c.case_id} registered against ${inst.institution_name}.`, c.id, 'NEW_CASE', c.priority)
    }
  })

  if (supabaseEnabled && supabase) {
    fireAndForget(
      supabase.from('complaint_cases').insert({
        id: c.id,
        case_id: c.case_id,
        institution_id: c.institution_id,
        bureau_id: c.bureau_id,
        assigned_officer_id: null,
        complainant_name: c.complainant_name,
        complainant_type: c.complainant_type,
        complainant_reference: c.complainant_reference,
        complainant_email: c.complainant_email,
        complainant_mobile: c.complainant_mobile,
        complaint_category: c.complaint_category,
        sub_category: c.sub_category,
        incident_date: c.incident_date,
        subject: c.subject,
        description: c.description,
        priority: c.priority,
        status: c.status,
        received_date: c.received_date,
        last_action_date: c.last_action_date,
        expected_disposal_date: c.expected_disposal_date,
        source: c.source,
        verification_status: c.verification_status,
        overlap_status: c.overlap_status,
        mobile_verified: true,
        email_verified: true,
        documents_received: c.documents_received,
        institution_response_received: false,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })
    )
  }

  return c
}

export function getPublicTracking(caseIdOrRef: string, contactIdentifier: string) {
  const query = caseIdOrRef.trim().toUpperCase()
  const contact = contactIdentifier.trim().toLowerCase()
  const cleanContactDigits = contact.replace(/\D/g, '')

  const c = state.cases.find((x) => x.case_id.toUpperCase() === query || x.complainant_reference.toUpperCase() === query)
  if (!c) {
    return { ok: false as const, error: 'No complaint found matching this Complaint ID or Reference number.' }
  }

  const emailMatch = c.complainant_email && c.complainant_email.toLowerCase() === contact
  const phoneMatch = c.complainant_mobile && c.complainant_mobile.replace(/\D/g, '').endsWith(cleanContactDigits) && cleanContactDigits.length >= 8

  // If complainant contact is recorded, verify it
  if (c.complainant_email || c.complainant_mobile) {
    if (!emailMatch && !phoneMatch && contact !== '') {
      return { ok: false as const, error: 'The provided Email / Mobile does not match the complainant records for this Case ID.' }
    }
  }

  const inst = state.institutions.find((i) => i.id === c.institution_id)
  const bureau = state.bureaus.find((b) => b.id === c.bureau_id)

  let currentStage = 'Intake & Verification'
  if (c.status === 'UNDER_REVIEW') currentStage = 'Bureau Review'
  else if (c.status === 'UNDER_PROCESS') currentStage = 'Active Inquiry & Document Review'
  else if (c.status === 'PENDING_INFORMATION') currentStage = 'Awaiting Institution Response'
  else if (c.status === 'ESCALATED') currentStage = 'Senior Regulatory Review'
  else if (c.status === 'RESOLVED') currentStage = 'Redressal Formally Issued'
  else if (c.status === 'DISPOSED' || c.status === 'CLOSED') currentStage = 'Disposed & Closed'

  const timeline = [
    { title: 'Complaint Received', description: 'Complaint successfully registered in AICTE CaseSync system.', completed: true, date: c.received_date },
    { title: 'Contact Verification', description: 'Dual Email and Mobile verification authenticated.', completed: c.mobile_verified, date: c.received_date },
    { title: 'Bureau Jurisdiction', description: `Assigned to ${bureau?.name || 'AICTE Bureau'}.`, completed: true, date: c.received_date },
    { title: 'Official Review & Inquiry', description: 'Authorized bureau officials examining institutional records.', completed: c.status !== 'NEW' && c.status !== 'PENDING_VERIFICATION', date: c.last_action_date },
    { title: 'Institution Response / Clarification', description: 'Institution explanation on record.', completed: c.institution_response_received, date: c.institution_response_received ? c.last_action_date : null },
    { title: 'Final Redressal / Disposal', description: 'Inquiry concluded with formal order.', completed: c.status === 'RESOLVED' || c.status === 'DISPOSED' || c.status === 'CLOSED', date: c.actual_disposal_date },
  ]

  return {
    ok: true as const,
    case: {
      case_id: c.case_id,
      complainant_reference: c.complainant_reference,
      institution_name: inst?.institution_name ?? 'Technical Institution',
      aicte_permanent_id: inst?.aicte_permanent_id ?? '—',
      category: c.complaint_category,
      sub_category: c.sub_category,
      subject: c.subject,
      status: c.status,
      current_stage: currentStage,
      target_bureau: bureau?.name ?? 'AICTE Bureau',
      submitted_date: c.received_date,
      last_updated: c.last_action_date,
      expected_disposal_date: c.expected_disposal_date,
      next_action: NEXT_ACTIONS[c.status] || 'Under Bureau Consideration',
      timeline,
    },
  }
}

