import type { Category, Priority, Role } from '../types'

export const PRODUCT_NAME = 'AICTE CaseSync'
export const PRODUCT_SUBTITLE =
  'Integrated Institution Complaint Monitoring & Coordination Platform'
export const PROTOTYPE_LABEL = 'SIH 2026 Prototype'

export const DEMO_PASSWORD = 'Demo@SIH2026'

export const DEFAULT_THRESHOLDS = {
  potentialDuplicate: 85,
  potentiallyRelated: 70,
  weakRelation: 50,
}

export const OVERLAP_WEIGHTS = {
  institution: 0.4,
  semantic: 0.35,
  category: 0.15,
  temporal: 0.1,
}

export const NAV_ITEMS: {
  to: string
  label: string
  roles: Role[]
  section?: string
}[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: ['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER'],
  },
  {
    to: '/institutions',
    label: 'Institutions',
    roles: ['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER'],
  },
  {
    to: '/complaints',
    label: 'Complaints',
    roles: ['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER'],
  },
  {
    to: '/overlap',
    label: 'Overlap & Coordination',
    roles: ['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD'],
  },
  {
    to: '/verification',
    label: 'Verification Queue',
    roles: ['SUPER_ADMIN', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER'],
  },
  {
    to: '/assigned',
    label: 'My Assigned Cases',
    roles: ['SUPER_ADMIN', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER'],
  },
  {
    to: '/reports',
    label: 'Reports & Analytics',
    roles: ['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD'],
    section: 'Reports & Analytics',
  },
  {
    to: '/notifications',
    label: 'Notifications',
    roles: ['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER'],
  },
  {
    to: '/users',
    label: 'Users & Roles',
    roles: ['SUPER_ADMIN'],
    section: 'Administration',
  },
  { to: '/audit', label: 'Audit Logs', roles: ['SUPER_ADMIN'] },
  { to: '/settings', label: 'Settings', roles: ['SUPER_ADMIN'] },
]

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  SENIOR_MANAGEMENT: 'Senior Management',
  BUREAU_HEAD: 'Bureau Head',
  CASE_OFFICER: 'Case Officer',
  REGIONAL_OFFICER: 'Regional Officer',
}

export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Fees: ['fee', 'fees', 'tuition', 'capitation', 'charge', 'payment'],
  Admission: ['admission', 'seat', 'counselling', 'counseling', 'allotment'],
  Faculty: ['faculty', 'teacher', 'professor', 'staff shortage'],
  Infrastructure: ['lab', 'hostel', 'library', 'infrastructure', 'building', 'facility'],
  'Course/Programme': ['course', 'programme', 'program', 'curriculum', 'branch'],
  'Approval/Compliance': ['approval', 'affiliation', 'compliance', 'inspection', 'aicte approval'],
  Examination: ['exam', 'examination', 'result', 'revaluation', 'marks'],
  'Scholarship/Student Benefits': ['scholarship', 'stipend', 'fellowship', 'benefit'],
  'Institutional Administration': ['administration', 'management', 'registrar', 'principal'],
  Other: [],
}

export const NEXT_ACTIONS: Record<string, string> = {
  NEW: 'Begin review and assign an officer.',
  UNDER_REVIEW: 'Complete verification of complainant, evidence and institution particulars.',
  VERIFIED: 'Move the case into processing and plan the first official action.',
  UNDER_PROCESS: 'Record the next official action or seek institution response if pending.',
  PENDING_INFORMATION: 'Follow up on requested information and resume processing when received.',
  TRANSFERRED: 'Receiving Bureau should accept or return the transfer.',
  ESCALATED: 'Bureau Head / Senior Management to review and decide.',
  DISPOSED: 'Issue closure communication and close the case file.',
  CLOSED: 'No further action. Record remains available for Institution 360°.',
}

export function slaDays(category: Category, priority: Priority): { allowed: number; warning: number } {
  const base = priority === 'CRITICAL' ? 7 : priority === 'HIGH' ? 15 : priority === 'MEDIUM' ? 30 : 45
  const extra = category === 'Approval/Compliance' ? 10 : 0
  return { allowed: base + extra, warning: Math.max(2, Math.round((base + extra) * 0.25)) }
}
