/**
 * Gemini AI Integration for AICTE CaseSync
 * Provides: complaint summarization, APH clause tagging, and show-cause notice drafting.
 * The API key is read from VITE_AI_API_KEY. All calls are client-side for the prototype;
 * in production, route through the Supabase Edge Function to hide the key.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-1.5-flash'

function getApiKey(): string | null {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) as Record<string, string> | undefined
  return env?.VITE_AI_API_KEY ?? null
}

async function callGemini(prompt: string): Promise<string> {
  const key = getApiKey()
  if (!key) throw new Error('VITE_AI_API_KEY is not set.')
  const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── APH Clause Database (Approval Process Handbook) ─────────────────────────
export const APH_CLAUSES = [
  { id: 'APH-6.1', title: 'Fee Regulation & Collection', description: 'Prohibits charging of capitation, unauthorized, or excess fees.' },
  { id: 'APH-6.3', title: 'Fee Refund Policy', description: 'Mandates refund of fees upon cancellation of admission.' },
  { id: 'APH-8.2', title: 'Admission Irregularities', description: 'Covers eligibility violations, seat blocking, and quota fraud.' },
  { id: 'APH-9.1', title: 'Infrastructure Standards', description: 'Minimum infrastructure and amenity requirements for approved institutions.' },
  { id: 'APH-10.1', title: 'Compliance & Show Cause', description: 'Procedure for issuing show cause notice under regulatory violation.' },
  { id: 'APH-10.4', title: 'Disciplinary Action & Penalty', description: 'Grounds for reduction of intake, withdrawal of approval.' },
  { id: 'APH-11.2', title: 'Anti-Ragging Provisions', description: 'Zero-tolerance mandate, UGC Regulation 2009, immediate FIR requirement.' },
  { id: 'APH-12.1', title: 'Faculty Qualification & Service', description: 'Minimum qualification, pay scale, and service condition requirements.' },
  { id: 'APH-13.3', title: 'Student Welfare & Grievance Cell', description: 'Mandatory student welfare officers and grievance redressal mechanism.' },
  { id: 'APH-15.1', title: 'Hostel Safety & Standards', description: 'Infrastructure, safety, and warden appointment rules for hostels.' },
  { id: 'APH-16.2', title: 'Scholarship & Financial Aid', description: 'Obligations related to scholarship disbursement and financial assistance.' },
  { id: 'APH-17.0', title: 'NAAC/NBA Accreditation Compliance', description: 'Quality standards and accreditation renewal obligations.' },
]

// ─── 1. Complaint Summarization ───────────────────────────────────────────────
export interface ComplaintSummary {
  oneLineSummary: string
  keyAllegations: string[]
  monetaryAmount: string | null
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  suggestedCategory: string
  suggestedSubCategory: string
}

export async function summarizeComplaint(args: {
  category: string
  subject: string
  description: string
  complainantType: string
  institutionName: string
}): Promise<ComplaintSummary> {
  const prompt = `
You are an AI assistant for AICTE (All India Council for Technical Education), the Indian regulatory body for technical education. Analyze this complaint and respond ONLY with a JSON object (no markdown).

Complaint Category: ${args.category}
Subject: ${args.subject}
Description: ${args.description}
Complainant Type: ${args.complainantType}
Institution: ${args.institutionName}

Respond with this exact JSON structure:
{
  "oneLineSummary": "<25-word summary of the complaint>",
  "keyAllegations": ["<allegation 1>", "<allegation 2>", "<allegation 3>"],
  "monetaryAmount": "<amount like '₹14,500' or null if no amount mentioned>",
  "urgencyLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "suggestedCategory": "<best matching AICTE category>",
  "suggestedSubCategory": "<specific sub-category>"
}
`.trim()

  const raw = await callGemini(prompt)
  const json = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(json) as ComplaintSummary
}

// ─── 2. APH Clause Tagging ────────────────────────────────────────────────────
export interface AphTagResult {
  primaryClause: { id: string; title: string; relevance: string }
  additionalClauses: { id: string; title: string; relevance: string }[]
  violationSeverity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'SEVERE'
  complianceRiskNote: string
}

export async function tagAphClauses(args: {
  category: string
  subject: string
  description: string
}): Promise<AphTagResult> {
  const clauseList = APH_CLAUSES.map(c => `${c.id}: ${c.title} — ${c.description}`).join('\n')
  const prompt = `
You are a regulatory compliance expert for AICTE. Given this complaint, identify which sections of the AICTE Approval Process Handbook (APH) are potentially violated. Respond ONLY with JSON (no markdown).

Complaint Category: ${args.category}
Subject: ${args.subject}
Description: ${args.description}

Available APH Clauses:
${clauseList}

Respond with this exact JSON:
{
  "primaryClause": { "id": "<APH-X.X>", "title": "<title>", "relevance": "<why this clause applies in 1-2 sentences>" },
  "additionalClauses": [
    { "id": "<APH-X.X>", "title": "<title>", "relevance": "<why>" }
  ],
  "violationSeverity": "<MINOR|MODERATE|SERIOUS|SEVERE>",
  "complianceRiskNote": "<2 sentences on regulatory risk and recommended next step>"
}
`.trim()

  const raw = await callGemini(prompt)
  const json = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(json) as AphTagResult
}

// ─── 3. Show Cause Notice AI Draft ────────────────────────────────────────────
export interface NoticeDraftResult {
  subject: string
  recitals: string
  directives: string
  legalBasis: string
  responseDeadlineDays: number
}

export async function draftShowCauseNotice(args: {
  caseId: string
  institutionName: string
  noticeType: string
  category: string
  subject: string
  description: string
  aphClause: string
  issuingBureau: string
}): Promise<NoticeDraftResult> {
  const prompt = `
You are a senior regulatory officer at AICTE drafting an official ${args.noticeType} under the AICTE Act 1987 and Approval Process Handbook (APH) ${args.aphClause}. Draft formal, authoritative government language. Respond ONLY with JSON (no markdown).

Case Reference: ${args.caseId}
Institution: ${args.institutionName}
Issuing Bureau: ${args.issuingBureau}
Complaint Category: ${args.category}
Complaint Subject: ${args.subject}
Complaint Details: ${args.description}

Respond with this exact JSON:
{
  "subject": "<formal subject line for the notice>",
  "recitals": "<2-3 formal paragraphs: what AICTE has received/observed, quoting the complaint substance>",
  "directives": "<3 numbered specific directives the institution must comply with, citing APH ${args.aphClause}>",
  "legalBasis": "<1 paragraph citing AICTE Act 1987, APH section, and consequences of non-compliance>",
  "responseDeadlineDays": <7 or 14 or 21 as appropriate for severity>
}
`.trim()

  const raw = await callGemini(prompt)
  const json = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(json) as NoticeDraftResult
}

// ─── 4. AI Case Dossier Summary ───────────────────────────────────────────────
export interface CaseDossierSummary {
  executiveSummary: string
  keyFindings: string[]
  riskFactors: string[]
  recommendedActions: string[]
  disposalRecommendation: string
}

export async function generateCaseDossier(args: {
  caseId: string
  category: string
  subject: string
  description: string
  status: string
  priority: string
  daysPending: number
  relatedCasesCount: number
  institutionName: string
  complainantType: string
  hasDocuments: boolean
  hasInstitutionResponse: boolean
}): Promise<CaseDossierSummary> {
  const prompt = `
You are an AI case officer assistant for AICTE. Generate a professional case dossier summary for an AICTE regulatory case. Respond ONLY with JSON (no markdown).

Case Reference: ${args.caseId}
Institution: ${args.institutionName}
Category: ${args.category}
Subject: ${args.subject}
Description: ${args.description}
Status: ${args.status}
Priority: ${args.priority}
Days Pending: ${args.daysPending}
Related Cases: ${args.relatedCasesCount}
Complainant Type: ${args.complainantType}
Documents Submitted: ${args.hasDocuments ? 'Yes' : 'No'}
Institution Response: ${args.hasInstitutionResponse ? 'Received' : 'Pending'}

Respond with this exact JSON:
{
  "executiveSummary": "<3-4 sentence formal summary suitable for a senior AICTE official>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "recommendedActions": ["<action 1>", "<action 2>", "<action 3>"],
  "disposalRecommendation": "<DISPOSE_SATISFIED|ESCALATE|TRANSFER|FURTHER_INQUIRY|PENALTY_RECOMMENDED> with brief reason"
}
`.trim()

  const raw = await callGemini(prompt)
  const json = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(json) as CaseDossierSummary
}

