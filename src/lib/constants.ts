import type { Category, Priority, Role } from '../types'

export const PRODUCT_NAME = 'AICTE CaseSync'
export const PRODUCT_SUBTITLE =
  'Integrated Institution Complaint Monitoring & Coordination Platform'
export const PROTOTYPE_LABEL = 'Official Portal'

export const DEMO_PASSWORD = 'AICTE@Admin2026'

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
  SUPER_ADMIN: 'Super Administrator',
  SENIOR_MANAGEMENT: 'Senior Management (Advisor)',
  BUREAU_HEAD: 'Bureau Head',
  CASE_OFFICER: 'Case Officer',
  REGIONAL_OFFICER: 'Regional Officer',
}

export const CATEGORY_SUB_CATEGORIES: Record<Category, string[]> = {
  'Academic / Examination': [
    'Curriculum & Syllabus Non-compliance',
    'Examination Irregularities / Marks Delay',
    'Withholding of Degree / Marksheets',
    'Unfair Evaluation / Malpractice',
  ],
  Admission: [
    'Capitation Fee / Seat Blocking',
    'Eligibility & Quota Violations',
    'Refusal of Fee Refund upon Cancellation',
    'Misleading Advertisement for Admissions',
  ],
  'Fees / Financial Issues': [
    'Unauthorized Additional Examination / Misc Fee',
    'Fee Hike Beyond Approved Regulatory Cap',
    'Withholding Original Documents for Fee Coercion',
    'Hostel / Bus Fee Exploitation',
  ],
  Infrastructure: [
    'Laboratories Equipment Deficiency',
    'Classroom, Ventilation & Library Shortages',
    'Fire Safety & Building Structural Violations',
    'Disabled-Friendly Ramp & Facility Absences',
  ],
  'Student Welfare': [
    'Canteen Hygiene & Clean Drinking Water',
    'Emergency First Aid & Health Center Inaction',
    'Internal Grievance Committee Redressal Inaction',
    'Sports & Recreational Facilities Deprivation',
  ],
  'Ragging / Harassment': [
    'Senior Student Hazing / Physical Assault',
    'Mental Harassment / Coercive Bullying',
    'Hostel Intimidation / Late Night Hazing',
    'Institute Anti-Ragging Committee Non-function',
  ],
  'Women Safety': [
    'Internal Complaints Committee (ICC) Non-compliance',
    'Campus & Hostel Sexual Harassment',
    'Inadequate CCTV & Campus Security Guarding',
    'Discriminatory Curfew / Female Scholar Restrictions',
  ],
  'Child Safety': [
    'Minor Safety Standards in Polytechnic Campuses',
    'POCSO Act Safeguard Non-compliance',
    'Unregulated Visitor / Vendor Access',
  ],
  'Cyber / Online Harassment': [
    'Unauthorized Digital Recording / Video Leaks',
    'Social Media Slander / Cyberstalking in Campus',
    'Phishing & Impersonation on College Networks',
  ],
  'Faculty / Staff Issues': [
    'Salary Non-payment / Irregular Disbursements',
    'Severe Faculty Shortage / Phantom Faculty Roster',
    'Violation of AICTE 7th CPC Scales',
    'Non-deposit of PF, ESI & Gratuity Benefits',
  ],
  Hostel: [
    'Substandard / Unhygienic Living Quarters',
    'Overcrowded Dormitories Beyond Capacity',
    'Contaminated Water & Mess Food Poisoning',
    'Arbitrary Fines & Warden Misconduct',
  ],
  Scholarship: [
    'PMSSS Scholarship Disbursement Delay',
    'Pragati / Saksham Scheme Fund Delay',
    'Institute Deducting / Withholding Welfare Grants',
  ],
  'Accreditation / Approval': [
    'Operating Without AICTE Mandatory Approval',
    'Unapproved Course Launch / Supernumerary Seats',
    'Misrepresentation of NBA / NAAC Status',
    'Deemed University AICTE Non-compliance',
  ],
  Other: [
    'General Institutional Administrative Dispute',
    'Policy & Regulation Clarification Required',
    'Public Stakeholder Representation',
  ],
}

export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'Academic / Examination': ['exam', 'examination', 'result', 'revaluation', 'marks', 'degree', 'syllabus', 'curriculum', 'evaluation'],
  Admission: ['admission', 'seat', 'counselling', 'counseling', 'allotment', 'capitation', 'quota', 'refund', 'cancellation'],
  'Fees / Financial Issues': ['fee', 'fees', 'tuition', 'capitation', 'charge', 'payment', 'money', 'extra', 'unauthorized', 'hike'],
  Infrastructure: ['lab', 'hostel', 'library', 'infrastructure', 'building', 'facility', 'equipment', 'fire safety', 'ramp'],
  'Student Welfare': ['welfare', 'hygiene', 'canteen', 'health', 'amenity', 'first aid', 'grievance'],
  'Ragging / Harassment': ['ragging', 'hazing', 'harassment', 'bullying', 'abuse', 'assault', 'intimidation'],
  'Women Safety': ['women', 'girl', 'icc', 'sexual harassment', 'female', 'safety', 'security', 'curfew'],
  'Child Safety': ['child', 'minor', 'polytechnic minor', 'pocso', 'underage'],
  'Cyber / Online Harassment': ['cyber', 'online', 'social media', 'video', 'recording', 'leak', 'stalking'],
  'Faculty / Staff Issues': ['faculty', 'teacher', 'professor', 'salary', 'staff', 'shortage', 'pf', 'gratuity', 'pay scale'],
  Hostel: ['hostel', 'mess', 'food', 'warden', 'room', 'water', 'hygiene'],
  Scholarship: ['scholarship', 'stipend', 'fellowship', 'pmsss', 'pragati', 'saksham', 'benefit', 'grant'],
  'Accreditation / Approval': ['approval', 'affiliation', 'compliance', 'inspection', 'aicte approval', 'nba', 'naac', 'unapproved'],
  Other: ['other', 'general', 'misc'],
}

export const NEXT_ACTIONS: Record<string, string> = {
  NEW: 'Begin preliminary intake review and assign an authorized officer.',
  UNDER_REVIEW: 'Complete verification of complainant contact, evidence documents and institution particulars.',
  VERIFIED: 'Move case into active processing and draft the first official inquiry communication.',
  UNDER_PROCESS: 'Record official case actions and review institution submission or rejoinder.',
  PENDING_INFORMATION: 'Follow up on clarification sought from complainant or institution.',
  TRANSFERRED: 'Receiving Bureau / Cell Head to review and formally accept jurisdiction.',
  ESCALATED: 'Bureau Head / Senior Management to review and pass authoritative directives.',
  RESOLVED: 'Formal resolution notice communicated to complainant and institution.',
  DISPOSED: 'Issue final closure order and archive case in institutional history.',
  CLOSED: 'Case permanently closed. Record remains accessible for Institution 360° analytics.',
}

export function slaDays(category: Category, priority: Priority): { allowed: number; warning: number } {
  const base = priority === 'CRITICAL' ? 7 : priority === 'HIGH' ? 15 : priority === 'MEDIUM' ? 30 : 45
  const extra = category === 'Accreditation / Approval' ? 10 : category === 'Ragging / Harassment' ? -7 : 0
  const allowed = Math.max(3, base + extra)
  return { allowed, warning: Math.max(2, Math.round(allowed * 0.25)) }
}

