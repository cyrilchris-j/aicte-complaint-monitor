/**
 * Institutional Risk Index (IRI) for AICTE CaseSync
 * Computes a 0–100 risk score for each institution based on:
 *   - Complaint volume (30%)
 *   - SLA overdue rate (25%)
 *   - Category severity flags (20%)
 *   - Institution response delay (15%)
 *   - Cross-bureau overlap presence (10%)
 */

import type { ComplaintCase, Institution, CaseLink } from '../types'

export type RiskTier = 'GREEN' | 'AMBER' | 'RED'

export interface IriBreakdown {
  volumeScore: number       // 0–30
  slaScore: number          // 0–25
  severityScore: number     // 0–20
  responseScore: number     // 0–15
  overlapScore: number      // 0–10
  total: number             // 0–100
}

export interface InstitutionRiskProfile {
  institution: Institution
  iri: number               // 0–100
  tier: RiskTier
  breakdown: IriBreakdown
  riskLabel: string
  actionRequired: string
  dominantCategory: string | null
  overdueCount: number
  totalActive: number
  crossBureauCount: number
  lastActivityDate: string | null
}

const HIGH_SEVERITY_CATEGORIES = new Set([
  'Ragging / Harassment',
  'Women Safety',
  'Child Safety',
  'Cyber / Online Harassment',
])

const MEDIUM_SEVERITY_CATEGORIES = new Set([
  'Fees / Financial Issues',
  'Admission',
  'Student Welfare',
  'Accreditation / Approval',
])

/** Classify a SLA state without importing from utils to avoid cycles. */
function isOverdue(c: ComplaintCase): boolean {
  if (!c.expected_disposal_date) return false
  return new Date(c.expected_disposal_date) < new Date() &&
    c.status !== 'DISPOSED' && c.status !== 'CLOSED'
}

function isPending(c: ComplaintCase): boolean {
  return !['DISPOSED', 'CLOSED'].includes(c.status)
}

export function computeIri(
  institution: Institution,
  allCases: ComplaintCase[],
  links: CaseLink[],
): InstitutionRiskProfile {
  const cases = allCases.filter(c => c.institution_id === institution.id)
  const active = cases.filter(isPending)
  const overdue = cases.filter(isOverdue)
  const total = cases.length

  // ── Volume Score (0–30) ────────────────────────────────────────────────────
  // 1 case = 1pt, capped at 30. Normalised against a "high-risk" benchmark of 30 cases.
  const volumeScore = Math.min(30, Math.round((total / 30) * 30))

  // ── SLA Overdue Score (0–25) ───────────────────────────────────────────────
  const overdueRate = active.length > 0 ? overdue.length / active.length : 0
  const slaScore = Math.min(25, Math.round(overdueRate * 25))

  // ── Category Severity Score (0–20) ────────────────────────────────────────
  let severityScore = 0
  for (const c of active) {
    if (HIGH_SEVERITY_CATEGORIES.has(c.complaint_category)) severityScore += 4
    else if (MEDIUM_SEVERITY_CATEGORIES.has(c.complaint_category)) severityScore += 2
    else severityScore += 1
  }
  severityScore = Math.min(20, severityScore)

  // ── Institution Response Delay Score (0–15) ───────────────────────────────
  const awaitingResponse = active.filter(c => !c.institution_response_received)
  const responseRate = active.length > 0 ? awaitingResponse.length / active.length : 0
  const responseScore = Math.min(15, Math.round(responseRate * 15))

  // ── Cross-Bureau Overlap Score (0–10) ─────────────────────────────────────
  const caseIds = new Set(cases.map(c => c.id))
  const crossBureauLinks = links.filter(
    l =>
      !l.dismissed &&
      l.relationship_type === 'CROSS_BUREAU_OVERLAP' &&
      (caseIds.has(l.source_case_id) || caseIds.has(l.target_case_id)),
  )
  const overlapScore = Math.min(10, crossBureauLinks.length * 3)

  const iriTotal = volumeScore + slaScore + severityScore + responseScore + overlapScore

  // ── Tier Classification ────────────────────────────────────────────────────
  let tier: RiskTier
  let riskLabel: string
  let actionRequired: string
  if (iriTotal >= 60) {
    tier = 'RED'
    riskLabel = 'High Regulatory Risk'
    actionRequired = 'Immediate regulatory review. Consider show-cause / surprise inspection.'
  } else if (iriTotal >= 30) {
    tier = 'AMBER'
    riskLabel = 'Under Watch'
    actionRequired = 'Assign senior case officer. Escalate overdue matters.'
  } else {
    tier = 'GREEN'
    riskLabel = 'Compliant'
    actionRequired = 'Standard monitoring. No immediate action required.'
  }

  // ── Dominant complaint category ────────────────────────────────────────────
  const catCounts: Record<string, number> = {}
  for (const c of active) catCounts[c.complaint_category] = (catCounts[c.complaint_category] ?? 0) + 1
  const dominantCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const lastActivityDate = cases.map(c => c.last_action_date).sort().at(-1) ?? null

  return {
    institution,
    iri: iriTotal,
    tier,
    breakdown: { volumeScore, slaScore, severityScore, responseScore, overlapScore, total: iriTotal },
    riskLabel,
    actionRequired,
    dominantCategory,
    overdueCount: overdue.length,
    totalActive: active.length,
    crossBureauCount: crossBureauLinks.length,
    lastActivityDate,
  }
}

export function computeAllIri(
  institutions: Institution[],
  cases: ComplaintCase[],
  links: CaseLink[],
): InstitutionRiskProfile[] {
  return institutions
    .map(i => computeIri(i, cases, links))
    .sort((a, b) => b.iri - a.iri)
}

/** Tier badge colours for UI rendering */
export const TIER_STYLES: Record<RiskTier, { badge: string; row: string; bar: string }> = {
  RED: {
    badge: 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]',
    row: 'border-l-4 border-l-[#b91c1c]',
    bar: 'bg-[#b91c1c]',
  },
  AMBER: {
    badge: 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]',
    row: 'border-l-4 border-l-[#f59e0b]',
    bar: 'bg-[#f59e0b]',
  },
  GREEN: {
    badge: 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]',
    row: 'border-l-4 border-l-[#22c55e]',
    bar: 'bg-[#22c55e]',
  },
}

