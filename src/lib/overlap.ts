import { DEFAULT_THRESHOLDS, OVERLAP_WEIGHTS, CATEGORY_KEYWORDS } from './constants'
import { daysBetween, normalizeName } from './utils'

import type {
  CaseLink,
  ComplaintCase,
  ComplaintEmbedding,
  Institution,
  Category,
  OverlapBreakdown,
  OverlapStatus,
  OverlapThresholds,
  RelationshipType,
} from '../types'

const DIM = 256

function hashToken(token: string) {
  let h = 2166136261
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

export function embedText(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0)
  const tokens = tokenize(text)
  for (const token of tokens) {
    vec[hashToken(token) % DIM] += 1
    vec[hashToken(`${token}#2`) % DIM] += 0.45
  }
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`
    vec[hashToken(bigram) % DIM] += 1.2
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / norm)
}

export function cosine(a: number[], b: number[]) {
  let s = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i += 1) s += a[i] * b[i]
  return Math.max(0, Math.min(1, s))
}

export function complaintText(c: Pick<ComplaintCase, 'subject' | 'description' | 'complaint_category'>) {
  return `${c.complaint_category}\n${c.subject}\n${c.description}`
}

function institutionScore(a: Institution, b: Institution) {
  if (a.aicte_permanent_id && a.aicte_permanent_id === b.aicte_permanent_id) return 1
  const na = normalizeName(a.institution_name)
  const nb = normalizeName(b.institution_name)
  if (!na || !nb) return 0
  if (na === nb) return 0.85
  if (na.includes(nb) || nb.includes(na)) return 0.7
  const sa = new Set(na.split(' '))
  const sb = new Set(nb.split(' '))
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter += 1
  const j = inter / new Set([...sa, ...sb]).size
  if (j >= 0.5 && a.state === b.state) return 0.55 + j * 0.2
  return j * 0.4
}

function temporalScore(a: string, b: string) {
  const days = daysBetween(a, b)
  if (days <= 2) return 1
  if (days <= 7) return 0.85
  if (days <= 15) return 0.7
  if (days <= 30) return 0.5
  if (days <= 60) return 0.3
  if (days <= 90) return 0.15
  return 0.05
}

export function overlapLabel(totalPct: number, thresholds: OverlapThresholds = DEFAULT_THRESHOLDS): OverlapStatus {
  if (totalPct >= thresholds.potentialDuplicate) return 'POTENTIAL_DUPLICATE'
  if (totalPct >= thresholds.potentiallyRelated) return 'POTENTIALLY_RELATED'
  if (totalPct >= thresholds.weakRelation) return 'WEAK_RELATION'
  return 'NONE'
}

export function relationshipFor(status: OverlapStatus, crossBureau: boolean): RelationshipType {
  if (status === 'POTENTIAL_DUPLICATE') {
    return crossBureau ? 'CROSS_BUREAU_OVERLAP' : 'POTENTIAL_DUPLICATE'
  }
  if (status === 'POTENTIALLY_RELATED') {
    return crossBureau ? 'CROSS_BUREAU_OVERLAP' : 'RELATED_CASE'
  }
  return crossBureau ? 'REQUIRES_COORDINATION' : 'SAME_INSTITUTION'
}

export function explainOverlap(args: {
  instScore: number
  semantic: number
  categoryMatch: boolean
  days: number
  samePermanentId: boolean
  sameInstitutionName: boolean
  crossBureau: boolean
}): string[] {
  const reasons: string[] = []
  if (args.samePermanentId) reasons.push('Same AICTE Permanent ID')
  else if (args.sameInstitutionName) reasons.push('Same institution name (normalised match)')
  else if (args.instScore >= 0.5) reasons.push('Likely same institution (name/address proximity)')
  if (args.categoryMatch) reasons.push('Same complaint category')
  reasons.push(`${Math.round(args.semantic * 100)}% semantic similarity of subject and description`)
  reasons.push(`Cases received within ${args.days} day${args.days === 1 ? '' : 's'}`)
  if (args.crossBureau) reasons.push('Different Bureaus/Cells currently handling the matters')
  return reasons
}

export function scorePair(
  a: ComplaintCase,
  b: ComplaintCase,
  instA: Institution,
  instB: Institution,
  embA: number[],
  embB: number[],
): { breakdown: OverlapBreakdown; reasons: string[] } {
  const inst = institutionScore(instA, instB)
  const semantic = cosine(embA, embB)
  const category = a.complaint_category === b.complaint_category ? 1 : 0
  const temporal = temporalScore(a.received_date, b.received_date)
  const total =
    inst * OVERLAP_WEIGHTS.institution +
    semantic * OVERLAP_WEIGHTS.semantic +
    category * OVERLAP_WEIGHTS.category +
    temporal * OVERLAP_WEIGHTS.temporal
  const reasons = explainOverlap({
    instScore: inst,
    semantic,
    categoryMatch: category === 1,
    days: daysBetween(a.received_date, b.received_date),
    samePermanentId: instA.aicte_permanent_id === instB.aicte_permanent_id,
    sameInstitutionName: normalizeName(instA.institution_name) === normalizeName(instB.institution_name),
    crossBureau: a.bureau_id !== b.bureau_id,
  })
  return {
    breakdown: {
      institution: inst,
      semantic,
      category,
      temporal,
      total,
    },
    reasons,
  }
}

export function detectOverlaps(args: {
  cases: ComplaintCase[]
  institutions: Institution[]
  embeddings: ComplaintEmbedding[]
  actorId: string
  thresholds?: OverlapThresholds
  existing?: CaseLink[]
}): CaseLink[] {
  const thresholds = args.thresholds ?? DEFAULT_THRESHOLDS
  const instMap = new Map(args.institutions.map((i) => [i.id, i]))
  const embMap = new Map(args.embeddings.map((e) => [e.case_id, e.embedding]))
  const existingKey = new Set(
    (args.existing ?? []).map((l) => [l.source_case_id, l.target_case_id].sort().join(':')),
  )
  const links: CaseLink[] = []
  for (let i = 0; i < args.cases.length; i += 1) {
    for (let j = i + 1; j < args.cases.length; j += 1) {
      const a = args.cases[i]
      const b = args.cases[j]
      const ia = instMap.get(a.institution_id)
      const ib = instMap.get(b.institution_id)
      const ea = embMap.get(a.id)
      const eb = embMap.get(b.id)
      if (!ia || !ib || !ea || !eb) continue
      const { breakdown, reasons } = scorePair(a, b, ia, ib, ea, eb)
      const pct = Math.round(breakdown.total * 100)
      const status = overlapLabel(pct, thresholds)
      if (status === 'NONE') continue
      const key = [a.id, b.id].sort().join(':')
      if (existingKey.has(key)) continue
      existingKey.add(key)
      const cross = a.bureau_id !== b.bureau_id
      links.push({
        id: `link-${a.id}-${b.id}`,
        source_case_id: a.id,
        target_case_id: b.id,
        relationship_type: relationshipFor(status, cross),
        similarity_score: pct,
        reason: reasons.join('; '),
        reasons,
        breakdown,
        created_by: args.actorId,
        created_at: new Date().toISOString(),
        confirmed: false,
        dismissed: false,
        coordination_requested: false,
      })
    }
  }
  return links
}

export function detectSuspiciousPatterns(cases: ComplaintCase[], institutions: Institution[]) {
  const groups = new Map<string, ComplaintCase[]>()
  for (const c of cases) {
    const key = `${c.institution_id}|${c.complaint_category}`
    const list = groups.get(key) ?? []
    list.push(c)
    groups.set(key, list)
  }
  const patterns = []
  for (const [, group] of groups) {
    if (group.length < 5) continue
    const sorted = [...group].sort((a, b) => a.received_date.localeCompare(b.received_date))
    for (let i = 0; i < sorted.length; i += 1) {
      const window: ComplaintCase[] = [sorted[i]]
      for (let j = i + 1; j < sorted.length; j += 1) {
        if (daysBetween(sorted[i].received_date, sorted[j].received_date) === 0) {
          const minutes =
            Math.abs(new Date(sorted[j].received_date).getTime() - new Date(sorted[i].received_date).getTime()) /
            60000
          if (minutes <= 15) window.push(sorted[j])
        }
      }
      if (window.length >= 6) {
        const inst = institutions.find((x) => x.id === window[0].institution_id)
        const start = new Date(window[0].received_date).getTime()
        const end = new Date(window[window.length - 1].received_date).getTime()
        patterns.push({
          id: `sus-${window[0].id}`,
          institution_id: window[0].institution_id,
          related_case_ids: window.map((c) => c.id),
          average_similarity: 94,
          submission_window_minutes: Math.max(1, Math.round((end - start) / 60000)),
          pattern: `Multiple closely timed submissions against ${inst?.institution_name ?? 'institution'}`,
          created_at: window[0].received_date,
        })
        break
      }
    }
  }
  return patterns
}

export function suggestCategory(text: string): { category: Category; confidence: number } {
  const lower = text.toLowerCase()
  let best: { category: Category; confidence: number } = { category: 'Other', confidence: 0.35 }
  const entries = Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]
  for (const [category, keys] of entries) {
    const hits = keys.filter((k) => lower.includes(k)).length
    if (hits > 0) {
      const confidence = Math.min(0.92, 0.45 + hits * 0.16)
      if (confidence > best.confidence) best = { category, confidence }
    }
  }
  return best
}


export function officerSummary(c: ComplaintCase, relatedCount: number) {
  const evidence = c.documents_received ? 'Supporting documents are on file.' : 'Supporting documents are not yet complete.'
  const response = c.institution_response_received
    ? 'Institution response has been received.'
    : 'Institution response is pending.'
  return `Summary: ${c.subject.replace(/\.$/, '')}. ${evidence} ${response} ${relatedCount} related case${relatedCount === 1 ? '' : 's'} detected.`
}

export function suggestedNextAction(c: ComplaintCase, relatedCount: number, crossBureau: boolean) {
  if (!c.documents_received) return 'Request additional evidence from the complainant.'
  if (!c.institution_response_received) return 'Seek institution response.'
  if (crossBureau) return 'Coordinate with the other Bureau handling a related case.'
  if (relatedCount > 0) return 'Review related cases before taking a disposal decision.'
  if (c.status === 'UNDER_PROCESS' && c.priority === 'CRITICAL') return 'Escalate for senior review given priority and age.'
  if (c.status === 'NEW') return 'Begin review and assign an officer.'
  return 'Record the next official action and update status.'
}
