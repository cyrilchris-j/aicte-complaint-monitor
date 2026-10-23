export const ROLES = [
  'SUPER_ADMIN',
  'SENIOR_MANAGEMENT',
  'BUREAU_HEAD',
  'CASE_OFFICER',
  'REGIONAL_OFFICER',
] as const

export type Role = (typeof ROLES)[number]

export const CASE_STATUSES = [
  'NEW',
  'PENDING_VERIFICATION',
  'UNDER_REVIEW',
  'VERIFIED',
  'UNDER_PROCESS',
  'PENDING_INFORMATION',
  'TRANSFERRED',
  'ESCALATED',
  'RESOLVED',
  'DISPOSED',
  'CLOSED',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type Priority = (typeof PRIORITIES)[number]

export const VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'UNDER_REVIEW',
  'EVIDENCE_REQUIRED',
  'INSTITUTION_RESPONSE_REQUIRED',
  'VERIFIED',
  'CLOSED',
] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const OVERLAP_STATUSES = [
  'NONE',
  'POTENTIAL_DUPLICATE',
  'POTENTIALLY_RELATED',
  'WEAK_RELATION',
  'CONFIRMED_RELATED',
  'UNRELATED',
] as const
export type OverlapStatus = (typeof OVERLAP_STATUSES)[number]

export const RELATIONSHIP_TYPES = [
  'POTENTIAL_DUPLICATE',
  'RELATED_CASE',
  'CROSS_BUREAU_OVERLAP',
  'SAME_INSTITUTION',
  'REQUIRES_COORDINATION',
] as const
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

export const CATEGORIES = [
  'Academic / Examination',
  'Admission',
  'Fees / Financial Issues',
  'Infrastructure',
  'Student Welfare',
  'Ragging / Harassment',
  'Women Safety',
  'Child Safety',
  'Cyber / Online Harassment',
  'Faculty / Staff Issues',
  'Hostel',
  'Scholarship',
  'Accreditation / Approval',
  'Other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const COMPLAINANT_TYPES = [
  'Student',
  'Faculty',
  'Parent',
  'Staff',
  'Other Stakeholder',
  'Anonymous / Confidential',
] as const
export type ComplainantType = (typeof COMPLAINANT_TYPES)[number]

export const SLA_STATES = ['WITHIN', 'APPROACHING', 'OVERDUE'] as const
export type SlaState = (typeof SLA_STATES)[number]


export interface Bureau {
  id: string
  name: string
  code: string
  description: string
  active: boolean
  created_at: string
}

export interface Institution {
  id: string
  aicte_permanent_id: string
  institution_name: string
  institution_type: string
  address: string
  city: string
  district: string
  state: string
  region: string
  pincode: string
  contact_email: string
  contact_phone: string
  status: 'Active' | 'Inactive' | 'Under Review'
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  role: Role
  bureau_id: string | null
  region: string | null
  designation: string
  phone: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface ComplaintCase {
  id: string
  case_id: string
  institution_id: string
  bureau_id: string
  assigned_officer_id: string | null
  complainant_type: ComplainantType
  complainant_name: string
  complainant_reference: string
  complainant_email?: string
  complainant_mobile?: string
  complaint_category: Category
  sub_category?: string
  incident_date?: string
  subject: string
  description: string
  priority: Priority
  status: CaseStatus
  received_date: string
  last_action_date: string
  expected_disposal_date: string
  actual_disposal_date: string | null
  source: string
  verification_status: VerificationStatus
  overlap_status: OverlapStatus
  pending_transfer_bureau_id: string | null
  mobile_verified: boolean
  email_verified?: boolean
  documents_received: boolean
  institution_response_received: boolean
  created_at: string
  updated_at: string
}

export interface OTPRecord {
  id: string
  identifier: string // email or mobile
  type: 'email' | 'mobile'
  otpHash: string
  expiresAt: number
  attempts: number
  verified: boolean
}

export interface CoordinationMessage {
  id: string
  link_id: string
  sender_profile_id: string
  message: string
  created_at: string
}


export interface CaseAction {
  id: string
  case_id: string
  action_type: string
  action_description: string
  performed_by: string
  from_bureau_id: string | null
  to_bureau_id: string | null
  created_at: string
}

export interface CaseDocument {
  id: string
  case_id: string
  document_name: string
  document_type: string
  storage_path: string
  uploaded_by: string
  verification_status: VerificationStatus
  uploaded_at: string
  data_url?: string
}

export interface CaseLink {
  id: string
  source_case_id: string
  target_case_id: string
  relationship_type: RelationshipType
  similarity_score: number
  reason: string
  reasons: string[]
  breakdown: OverlapBreakdown
  created_by: string
  created_at: string
  confirmed: boolean
  dismissed: boolean
  coordination_requested: boolean
}

export interface OverlapBreakdown {
  institution: number
  semantic: number
  category: number
  temporal: number
  total: number
}

export interface ComplaintEmbedding {
  id: string
  case_id: string
  embedding: number[]
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  case_id: string | null
  notification_type: string
  title: string
  message: string
  priority: Priority
  read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: string | null
  new_value: string | null
  ip_reference: string
  created_at: string
}

export interface SlaRule {
  id: string
  category: Category | 'Any'
  priority: Priority | 'Any'
  allowed_days: number
  warning_days: number
  active: boolean
}

export interface OverlapThresholds {
  potentialDuplicate: number
  potentiallyRelated: number
  weakRelation: number
}

export interface AppSettings {
  overlapThresholds: OverlapThresholds
  prototypeNotice: string
}

export interface DemoAccount {
  email: string
  password: string
  profileId: string
}

export interface SuspiciousPattern {
  id: string
  institution_id: string
  related_case_ids: string[]
  average_similarity: number
  submission_window_minutes: number
  pattern: string
  created_at: string
}

export interface AppState {
  bureaus: Bureau[]
  institutions: Institution[]
  profiles: Profile[]
  cases: ComplaintCase[]
  actions: CaseAction[]
  documents: CaseDocument[]
  links: CaseLink[]
  embeddings: ComplaintEmbedding[]
  notifications: Notification[]
  auditLogs: AuditLog[]
  slaRules: SlaRule[]
  settings: AppSettings
  accounts: DemoAccount[]
  suspiciousPatterns: SuspiciousPattern[]
  sessionProfileId: string | null
}

export interface DashboardStats {
  total: number
  pending: number
  underProcess: number
  disposed: number
  overdue: number
  overlaps: number
  monthDeltaPct: number
  pendingOverdue: number
  highPriorityOverlaps: number
  crossBureau: number
  awaitingCoordination: number
  byStatus: Record<string, number>
  byBureau: { code: string; name: string; count: number }[]
  monthlyTrend: { month: string; received: number; disposed: number }[]
  ageing: { bucket: string; count: number }[]
}
