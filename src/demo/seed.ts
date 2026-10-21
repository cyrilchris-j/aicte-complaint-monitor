import { DEMO_PASSWORD, DEFAULT_THRESHOLDS, slaDays } from '../lib/constants'
import { addDaysIso, uid } from '../lib/utils'
import {
  complaintText,
  detectOverlaps,
  detectSuspiciousPatterns,
  embedText,
} from '../lib/overlap'
import type {
  AppState,
  Bureau,
  CaseAction,
  CaseDocument,
  Category,
  ComplaintCase,
  ComplainantType,
  CaseStatus,
  Institution,
  Notification,
  Priority,
  Profile,
  VerificationStatus,
} from '../types'

const T0 = '2026-10-21T10:00:00.000Z'

function at(daysBefore: number, hour = 10, minute = 0) {
  const d = new Date(T0)
  d.setDate(d.getDate() - daysBefore)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const BUREAUS: Bureau[] = [
  {
    id: 'bureau-rb',
    name: 'Regulation Bureau',
    code: 'RB',
    description: 'Regulation, compliance and institutional disciplinary matters.',
    active: true,
    created_at: at(400),
  },
  {
    id: 'bureau-pgrc',
    name: 'Public Grievance Redressal Cell',
    code: 'PGRC',
    description: 'Public grievances received from students, parents and stakeholders.',
    active: true,
    created_at: at(400),
  },
  {
    id: 'bureau-other',
    name: 'Other Bureau / Cell',
    code: 'OTHER',
    description: 'Matters handled by other AICTE Bureaus and specialised cells.',
    active: true,
    created_at: at(400),
  },
  {
    id: 'bureau-ro',
    name: 'Regional Office / Centre',
    code: 'RO',
    description: 'Regional Offices and Centres coordinating field verification.',
    active: true,
    created_at: at(400),
  },
]

const LOCATIONS = [
  { state: 'Tamil Nadu', region: 'Southern', city: 'Chennai', district: 'Chennai' },
  { state: 'Karnataka', region: 'South-West', city: 'Bengaluru', district: 'Bengaluru Urban' },
  { state: 'Maharashtra', region: 'Western', city: 'Pune', district: 'Pune' },
  { state: 'Delhi', region: 'Northern', city: 'New Delhi', district: 'New Delhi' },
  { state: 'Uttar Pradesh', region: 'Northern', city: 'Lucknow', district: 'Lucknow' },
  { state: 'West Bengal', region: 'Eastern', city: 'Kolkata', district: 'Kolkata' },
  { state: 'Telangana', region: 'South-Central', city: 'Hyderabad', district: 'Hyderabad' },
  { state: 'Gujarat', region: 'Central', city: 'Ahmedabad', district: 'Ahmedabad' },
  { state: 'Rajasthan', region: 'North-West', city: 'Jaipur', district: 'Jaipur' },
  { state: 'Kerala', region: 'South-West', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram' },
  { state: 'Madhya Pradesh', region: 'Central', city: 'Bhopal', district: 'Bhopal' },
  { state: 'Odisha', region: 'Eastern', city: 'Bhubaneswar', district: 'Khordha' },
  { state: 'Punjab', region: 'North-West', city: 'Chandigarh', district: 'Chandigarh' },
  { state: 'Andhra Pradesh', region: 'South-Central', city: 'Vijayawada', district: 'NTR' },
  { state: 'Haryana', region: 'Northern', city: 'Gurugram', district: 'Gurugram' },
]

const INST_NAMES = [
  'ABC Engineering College',
  'ABC Institute of Technology',
  'National College of Engineering',
  'Sri Venkateswara Institute of Technology',
  'Bharat Institute of Engineering',
  'Eastern Ghats Polytechnic',
  'Western Plains College of Pharmacy',
  'Himalaya Institute of Management',
  'Coastal Institute of Engineering',
  'Deccan College of Technology',
  'Riverdale Institute of Science',
  'Greenfield College of Engineering',
  'Sapphire Institute of Technology',
  'Vidya Mandir Polytechnic',
  'Apex School of Architecture',
  'Summit Institute of Engineering',
  'Lakshmi College of Technology',
  'Northern Star Engineering College',
  'Pearl Institute of Management',
  'Cauvery College of Engineering',
  'Narmada Institute of Technology',
  'Aravalli Polytechnic',
  'Sundarban College of Engineering',
  'Malabar Institute of Technology',
  'Godavari Engineering College',
  'Yamuna Institute of Applied Sciences',
  'Kaveri School of Computing',
  'Indus College of Engineering',
  'Sahyadri Institute of Technology',
  'Vindhya Polytechnic',
  'Eastern Seaboard Institute',
  'Central India College of Engineering',
  'Pacific Institute of Technology',
  'Horizon College of Pharmacy',
  'Unity Institute of Engineering',
  'Pragati Polytechnic',
  'Shiksha Institute of Technology',
  'Bharani College of Engineering',
  'Rapid Tech Polytechnic',
  'Lotus Valley Institute',
  'Silver Oak Engineering College',
  'Ananda Institute of Technology',
  'Maitri College of Engineering',
  'Navya Polytechnic',
  'Uday Institute of Management',
  'Kalaignar College of Technology',
  'Saraswati Institute of Engineering',
  'Triveni College of Pharmacy',
  'Pinnacle Institute of Technology',
  'Gyanodaya Engineering College',
  'Sagar Institute of Science',
  'Meenakshi College of Engineering',
  'Vivek Polytechnic',
  'Chaitanya Institute of Technology',
  'Dhruva College of Engineering',
]

function makeInstitutions(): Institution[] {
  return INST_NAMES.map((name, i) => {
    const loc = LOCATIONS[i % LOCATIONS.length]
    const n = String(10001 + i).padStart(5, '0')
    return {
      id: `inst-${i + 1}`,
      aicte_permanent_id: `AICTE-PERM-${n}`,
      institution_name: name,
      institution_type: i % 7 === 0 ? 'Polytechnic' : i % 5 === 0 ? 'Pharmacy' : 'Engineering',
      address: `${12 + i} Education Avenue, ${loc.city}`,
      city: loc.city,
      district: loc.district,
      state: loc.state,
      region: loc.region,
      pincode: String(400001 + i * 17).slice(0, 6),
      contact_email: `registrar.${i + 1}@example.edu.in`,
      contact_phone: `044-22${String(10000 + i).slice(-5)}`,
      status: i % 23 === 0 ? 'Under Review' : 'Active',
      created_at: at(360 - i),
      updated_at: at(20),
    }
  })
}

function makeProfiles(): Profile[] {
  const mk = (
    n: number,
    name: string,
    email: string,
    role: Profile['role'],
    bureau_id: string | null,
    region: string | null,
    designation: string,
  ): Profile => ({
    id: `user-${n}`,
    auth_user_id: `auth-${n}`,
    full_name: name,
    email,
    role,
    bureau_id,
    region,
    designation,
    phone: `011-26${String(10000 + n).slice(-5)}`,
    active: true,
    created_at: at(500),
    updated_at: at(10),
  })
  return [
    mk(1, 'A. Sharma', 'admin@aicte.gov.in', 'SUPER_ADMIN', null, null, 'System Administrator'),
    mk(2, 'Dr. N. Banerjee', 'director@aicte.gov.in', 'SENIOR_MANAGEMENT', null, null, 'Advisor (Regulation)'),
    mk(3, 'S. Krishnan', 'rb.head@aicte.gov.in', 'BUREAU_HEAD', 'bureau-rb', null, 'Bureau Head, Regulation'),
    mk(4, 'P. Desai', 'pgrc.head@aicte.gov.in', 'BUREAU_HEAD', 'bureau-pgrc', null, 'Head, PGRC'),
    mk(5, 'R. Iyer', 'officer.pgrc@aicte.gov.in', 'CASE_OFFICER', 'bureau-pgrc', null, 'Case Officer, PGRC'),
    mk(6, 'K. Mehta', 'officer.rb@aicte.gov.in', 'CASE_OFFICER', 'bureau-rb', null, 'Case Officer, Regulation'),
    mk(7, 'M. Rao', 'south.ro@aicte.gov.in', 'REGIONAL_OFFICER', 'bureau-ro', 'Southern', 'Regional Officer, Southern'),
    mk(8, 'A. Kapoor', 'north.ro@aicte.gov.in', 'REGIONAL_OFFICER', 'bureau-ro', 'Northern', 'Regional Officer, Northern'),
    mk(9, 'L. Fernandes', 'officer.other@aicte.gov.in', 'CASE_OFFICER', 'bureau-other', null, 'Case Officer, Other Cells'),
    mk(10, 'V. Nair', 'west.ro@aicte.gov.in', 'REGIONAL_OFFICER', 'bureau-ro', 'Western', 'Regional Officer, Western'),
    mk(11, 'H. Patel', 'officer.pgrc2@aicte.gov.in', 'CASE_OFFICER', 'bureau-pgrc', null, 'Case Officer, PGRC'),
    mk(12, 'T. Singh', 'other.head@aicte.gov.in', 'BUREAU_HEAD', 'bureau-other', null, 'Bureau Head, Other Cells'),
  ]
}

const CATEGORIES: Category[] = [
  'Fees',
  'Admission',
  'Faculty',
  'Infrastructure',
  'Course/Programme',
  'Approval/Compliance',
  'Examination',
  'Scholarship/Student Benefits',
  'Institutional Administration',
  'Other',
]

const SUBJECTS: Record<Category, string[]> = {
  Fees: [
    'Unauthorised additional fee collection',
    'Capitation fee alleged during admission',
    'Delay in refund of excess fees',
  ],
  Admission: [
    'Admission denied despite allotment',
    'Irregularity in management quota admission',
    'Withholding of original certificates',
  ],
  Faculty: [
    'Shortage of qualified faculty',
    'Faculty attendance irregularity',
    'Unqualified visiting faculty alleged',
  ],
  Infrastructure: [
    'Inadequate laboratory facilities',
    'Hostel conditions not as represented',
    'Library resources below required level',
  ],
  'Course/Programme': [
    'Programme offered without approval',
    'Curriculum not as advertised',
    'Sudden closure of an approved course',
  ],
  'Approval/Compliance': [
    'Functioning beyond approved intake',
    'Non-compliance with inspection observations',
    'Misleading claim of AICTE approval',
  ],
  Examination: [
    'Delay in declaration of results',
    'Irregularity in internal assessment',
    'Revaluation not processed',
  ],
  'Scholarship/Student Benefits': [
    'Scholarship amount not disbursed',
    'Delay in student welfare benefit',
    'Ineligible deduction from stipend',
  ],
  'Institutional Administration': [
    'Non-responsive grievance cell in the institution',
    'Irregularity in office records',
    'Harassment complaint against administration',
  ],
  Other: ['General grievance regarding institutional conduct', 'Miscellaneous representation'],
}

const DESCS: Record<Category, string> = {
  Fees: 'The representation states that the institution collected amounts over and above the published fee structure and did not issue a complete receipt.',
  Admission: 'The complainant states that admission-related documents were withheld and the process was not aligned with the published counselling instructions.',
  Faculty: 'The representation alleges that sanctioned faculty positions remain unfilled and classes are being handled by under-qualified personnel.',
  Infrastructure: 'The complainant reports that laboratories, classrooms or hostel facilities shown during admission are not actually available to students.',
  'Course/Programme': 'The matter relates to the offering, closure or delivery of a programme in a manner inconsistent with the stated approval.',
  'Approval/Compliance': 'The complaint concerns alleged deviation from approved intake, affiliation conditions or inspection directions.',
  Examination: 'The complainant reports delay or irregularity in examination, evaluation or result processing.',
  'Scholarship/Student Benefits': 'The representation concerns non-disbursement or irregular deduction of a student benefit.',
  'Institutional Administration': 'The complaint concerns the conduct of institutional administration and internal grievance handling.',
  Other: 'A general representation has been received regarding institutional practices requiring verification.',
}

const STATUSES: CaseStatus[] = [
  'NEW',
  'UNDER_REVIEW',
  'VERIFIED',
  'UNDER_PROCESS',
  'PENDING_INFORMATION',
  'TRANSFERRED',
  'ESCALATED',
  'DISPOSED',
  'CLOSED',
]

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const COMP_TYPES: ComplainantType[] = [
  'Student',
  'Faculty',
  'Parent/Guardian',
  'Stakeholder',
  'Other',
  'Anonymous/Confidential',
]
const SOURCES = ['CPGRAMS', 'Email', 'PGRC Portal', 'Regional Office', 'Walk-in / Dak', 'Ministerial Reference']

function bureauForIndex(i: number) {
  const codes = ['bureau-pgrc', 'bureau-rb', 'bureau-other', 'bureau-ro']
  return codes[i % codes.length]
}

function officerForBureau(bureauId: string, profiles: Profile[], i: number) {
  const officers = profiles.filter((p) => p.bureau_id === bureauId && p.role === 'CASE_OFFICER')
  if (officers.length === 0) return null
  return officers[i % officers.length].id
}

function caseNumber(bureauCode: string, year: number, n: number) {
  return `${bureauCode}-${year}-${String(n).padStart(4, '0')}`
}

function makeCase(args: {
  n: number
  institution: Institution
  bureau: Bureau
  officerId: string | null
  category: Category
  status: CaseStatus
  priority: Priority
  receivedDaysAgo: number
  subject: string
  description: string
  complainantType?: ComplainantType
  source?: string
  verification?: VerificationStatus
  mobile?: boolean
  docs?: boolean
  instResp?: boolean
  hour?: number
  minute?: number
  caseId?: string
}): ComplaintCase {
  const received = at(args.receivedDaysAgo, args.hour ?? 10, args.minute ?? (args.n % 50))
  const sla = slaDays(args.category, args.priority)
  const expected = addDaysIso(received, sla.allowed)
  const closed = args.status === 'DISPOSED' || args.status === 'CLOSED'
  return {
    id: `case-${args.n}`,
    case_id: args.caseId ?? caseNumber(args.bureau.code, 2026, 1000 + args.n),
    institution_id: args.institution.id,
    bureau_id: args.bureau.id,
    assigned_officer_id: args.officerId,
    complainant_type: args.complainantType ?? COMP_TYPES[args.n % COMP_TYPES.length],
    complainant_name:
      args.complainantType === 'Anonymous/Confidential' ? 'Confidential' : `Complainant ${args.n}`,
    complainant_reference: `REF-2026-${String(args.n).padStart(5, '0')}`,
    complaint_category: args.category,
    subject: args.subject,
    description: args.description,
    priority: args.priority,
    status: args.status,
    received_date: received,
    last_action_date: at(Math.max(0, args.receivedDaysAgo - 2), 15, 20),
    expected_disposal_date: expected,
    actual_disposal_date: closed ? at(Math.max(0, args.receivedDaysAgo - sla.allowed + 3)) : null,
    source: args.source ?? SOURCES[args.n % SOURCES.length],
    verification_status: args.verification ?? (closed ? 'VERIFIED' : args.status === 'NEW' ? 'UNVERIFIED' : 'UNDER_REVIEW'),
    overlap_status: 'NONE',
    pending_transfer_bureau_id: args.status === 'TRANSFERRED' ? 'bureau-rb' : null,
    mobile_verified: args.mobile ?? args.n % 3 !== 0,
    documents_received: args.docs ?? args.n % 4 !== 0,
    institution_response_received: args.instResp ?? (args.status === 'DISPOSED' || args.status === 'CLOSED'),
    created_at: received,
    updated_at: at(Math.max(0, args.receivedDaysAgo - 1)),
  }
}

export function buildSeedState(): AppState {
  const institutions = makeInstitutions()
  const profiles = makeProfiles()
  const bureauMap = Object.fromEntries(BUREAUS.map((b) => [b.id, b])) as Record<string, Bureau>
  const abc = institutions[0]
  const abcTech = institutions[1]
  const rapid = institutions.find((i) => i.institution_name === 'Rapid Tech Polytechnic')!

  const cases: ComplaintCase[] = []
  let n = 1

  const pgrc = bureauMap['bureau-pgrc']
  const rb = bureauMap['bureau-rb']

  cases.push(
    makeCase({
      n: n++,
      institution: abc,
      bureau: pgrc,
      officerId: 'user-5',
      category: 'Fees',
      status: 'UNDER_PROCESS',
      priority: 'HIGH',
      receivedDaysAgo: 18,
      subject: 'Additional fees beyond the stated fee structure',
      description:
        'The institution is collecting additional fees from students beyond the stated fee structure. Students report that extra charges are being demanded after admission without a corresponding approved head of account.',
      complainantType: 'Student',
      source: 'PGRC Portal',
      verification: 'UNDER_REVIEW',
      mobile: true,
      docs: true,
      instResp: false,
      caseId: 'PGRC-2026-1042',
    }),
    makeCase({
      n: n++,
      institution: abc,
      bureau: rb,
      officerId: 'user-6',
      category: 'Fees',
      status: 'UNDER_PROCESS',
      priority: 'HIGH',
      receivedDaysAgo: 14,
      subject: 'Unauthorised fee complaint against the institution',
      description:
        'Unauthorised additional fee collection from students contrary to the approved fee structure has been reported. The matter appears to concern the same institution and the same fee-related practice.',
      complainantType: 'Parent/Guardian',
      source: 'Email',
      verification: 'UNDER_REVIEW',
      mobile: true,
      docs: true,
      instResp: false,
      caseId: 'RB-2026-7821',
    }),
    makeCase({
      n: n++,
      institution: abcTech,
      bureau: pgrc,
      officerId: 'user-5',
      category: 'Fees',
      status: 'UNDER_REVIEW',
      priority: 'MEDIUM',
      receivedDaysAgo: 9,
      subject: 'Fee-related complaint',
      description:
        'Fee-related complaint: students of ABC Institute of Technology allege collection of amounts not reflected in the prospectus.',
      caseId: 'PGRC-2026-1108',
    }),
    makeCase({
      n: n++,
      institution: abc,
      bureau: bureauMap['bureau-other'],
      officerId: 'user-9',
      category: 'Admission',
      status: 'PENDING_INFORMATION',
      priority: 'MEDIUM',
      receivedDaysAgo: 40,
      subject: 'Original certificates withheld after admission',
      description: DESCS.Admission,
    }),
  )

  const feeText =
    'The institution is collecting additional fees from students beyond the stated fee structure and similar extra charges are being demanded in a short time window.'
  for (let i = 0; i < 10; i += 1) {
    cases.push(
      makeCase({
        n: n++,
        institution: rapid,
        bureau: pgrc,
        officerId: 'user-11',
        category: 'Fees',
        status: 'NEW',
        priority: 'HIGH',
        receivedDaysAgo: 2,
        hour: 9,
        minute: i,
        subject: 'Additional fee collection reported by newly registered complainant',
        description: `${feeText} Submission cluster ${i + 1}.`,
        complainantType: 'Anonymous/Confidential',
        source: 'PGRC Portal',
        verification: 'UNVERIFIED',
        mobile: false,
        docs: false,
        instResp: false,
      }),
    )
  }

  for (let i = 0; i < 170; i += 1) {
    const inst = institutions[(i * 3) % institutions.length]
    const bureau = bureauMap[bureauForIndex(i)]
    const category = CATEGORIES[i % CATEGORIES.length]
    const status = STATUSES[i % STATUSES.length]
    const priority = PRIORITIES[i % PRIORITIES.length]
    const receivedDaysAgo = 3 + ((i * 5) % 120)
    cases.push(
      makeCase({
        n: n++,
        institution: inst,
        bureau,
        officerId: officerForBureau(bureau.id, profiles, i),
        category,
        status,
        priority,
        receivedDaysAgo,
        subject: SUBJECTS[category][i % SUBJECTS[category].length],
        description: `${DESCS[category]} Institution cited: ${inst.institution_name}.`,
      }),
    )
  }

  const embeddings = cases.map((c) => ({
    id: `emb-${c.id}`,
    case_id: c.id,
    embedding: embedText(complaintText(c)),
    created_at: c.created_at,
  }))

  const actions: CaseAction[] = []
  const documents: CaseDocument[] = []
  for (const c of cases) {
    actions.push({
      id: uid('act'),
      case_id: c.id,
      action_type: 'RECEIVED',
      action_description: `Complaint received by ${bureauMap[c.bureau_id].code}`,
      performed_by: 'user-1',
      from_bureau_id: null,
      to_bureau_id: c.bureau_id,
      created_at: c.received_date,
    })
    if (c.assigned_officer_id) {
      actions.push({
        id: uid('act'),
        case_id: c.id,
        action_type: 'ASSIGNED',
        action_description: 'Case assigned to officer for processing',
        performed_by: c.bureau_id === 'bureau-pgrc' ? 'user-4' : 'user-3',
        from_bureau_id: c.bureau_id,
        to_bureau_id: c.bureau_id,
        created_at: addDaysIso(c.received_date, 0),
      })
    }
    if (c.documents_received) {
      documents.push({
        id: uid('doc'),
        case_id: c.id,
        document_name: 'Supporting representation.pdf',
        document_type: 'application/pdf',
        storage_path: `complaint-documents/${c.id}/representation.pdf`,
        uploaded_by: c.assigned_officer_id ?? 'user-1',
        verification_status: c.verification_status,
        uploaded_at: addDaysIso(c.received_date, 1),
      })
      actions.push({
        id: uid('act'),
        case_id: c.id,
        action_type: 'DOCUMENT_UPLOADED',
        action_description: 'Supporting document placed on record',
        performed_by: c.assigned_officer_id ?? 'user-1',
        from_bureau_id: c.bureau_id,
        to_bureau_id: c.bureau_id,
        created_at: addDaysIso(c.received_date, 1),
      })
    }
    if (c.status === 'PENDING_INFORMATION') {
      actions.push({
        id: uid('act'),
        case_id: c.id,
        action_type: 'INFORMATION_REQUESTED',
        action_description: 'Additional information requested from the institution / complainant',
        performed_by: c.assigned_officer_id ?? 'user-5',
        from_bureau_id: c.bureau_id,
        to_bureau_id: c.bureau_id,
        created_at: c.last_action_date,
      })
    }
    if (c.status === 'ESCALATED') {
      actions.push({
        id: uid('act'),
        case_id: c.id,
        action_type: 'ESCALATED',
        action_description: 'Case escalated for senior review',
        performed_by: c.assigned_officer_id ?? 'user-5',
        from_bureau_id: c.bureau_id,
        to_bureau_id: c.bureau_id,
        created_at: c.last_action_date,
      })
    }
    if (c.status === 'TRANSFERRED') {
      actions.push({
        id: uid('act'),
        case_id: c.id,
        action_type: 'TRANSFER_REQUESTED',
        action_description: 'Transfer requested to Regulation Bureau',
        performed_by: c.assigned_officer_id ?? 'user-5',
        from_bureau_id: c.bureau_id,
        to_bureau_id: 'bureau-rb',
        created_at: c.last_action_date,
      })
    }
    if (c.status === 'DISPOSED' || c.status === 'CLOSED') {
      actions.push({
        id: uid('act'),
        case_id: c.id,
        action_type: 'DISPOSED',
        action_description: 'Case disposed after examination of the record',
        performed_by: c.assigned_officer_id ?? 'user-3',
        from_bureau_id: c.bureau_id,
        to_bureau_id: c.bureau_id,
        created_at: c.actual_disposal_date ?? c.last_action_date,
      })
    }
  }

  const admin = 'user-1'
  const rawLinks = detectOverlaps({
    cases,
    institutions,
    embeddings,
    actorId: admin,
  })
  const overlapIds = new Set<string>()
  for (const link of rawLinks) {
    overlapIds.add(link.source_case_id)
    overlapIds.add(link.target_case_id)
  }
  for (const c of cases) {
    if (overlapIds.has(c.id)) {
      const best = rawLinks
        .filter((l) => l.source_case_id === c.id || l.target_case_id === c.id)
        .sort((a, b) => b.similarity_score - a.similarity_score)[0]
      c.overlap_status =
        best && best.similarity_score >= 85
          ? 'POTENTIAL_DUPLICATE'
          : best && best.similarity_score >= 70
            ? 'POTENTIALLY_RELATED'
            : 'WEAK_RELATION'
    }
  }

  const suspiciousPatterns = detectSuspiciousPatterns(cases, institutions)

  const notifications: Notification[] = [
    {
      id: uid('ntf'),
      user_id: 'user-5',
      case_id: cases[0].id,
      notification_type: 'OVERLAP',
      title: 'Potential overlap detected',
      message: 'PGRC-2026-1042 may overlap with RB-2026-7821 (same institution, fee-related).',
      priority: 'HIGH' as const,
      read: false,
      created_at: at(14, 11, 5),
    },
    {
      id: uid('ntf'),
      user_id: 'user-3',
      case_id: cases[1].id,
      notification_type: 'OVERLAP',
      title: 'Cross-bureau overlap',
      message: 'RB-2026-7821 requires coordination with PGRC on ABC Engineering College.',
      priority: 'HIGH' as const,
      read: false,
      created_at: at(14, 11, 6),
    },
    {
      id: uid('ntf'),
      user_id: 'user-4',
      case_id: null,
      notification_type: 'SLA',
      title: 'Cases approaching SLA',
      message: '3 cases in PGRC are approaching the configured disposal timeline.',
      priority: 'MEDIUM' as const,
      read: false,
      created_at: at(0, 8, 15),
    },
    {
      id: uid('ntf'),
      user_id: 'user-6',
      case_id: null,
      notification_type: 'SLA',
      title: 'Overdue cases',
      message: '2 cases assigned to Regulation Bureau are overdue against configured SLA.',
      priority: 'CRITICAL' as const,
      read: false,
      created_at: at(0, 8, 16),
    },
    {
      id: uid('ntf'),
      user_id: 'user-5',
      case_id: cases[3].id,
      notification_type: 'RESPONSE',
      title: 'Institution response pending',
      message: 'Follow-up is due on a pending information request.',
      priority: 'MEDIUM' as const,
      read: true,
      created_at: at(3, 16, 40),
    },
  ]

  for (const p of profiles) {
    notifications.push({
      id: uid('ntf'),
      user_id: p.id,
      case_id: cases[0].id,
      notification_type: 'SYSTEM',
      title: 'Demo data loaded',
      message: 'SIH 2026 prototype dataset is active, including the ABC Engineering College overlap scenario.',
      priority: 'LOW',
      read: p.role === 'SUPER_ADMIN',
      created_at: at(0, 7, 0),
    })
  }

  const auditLogs = [
    {
      id: uid('aud'),
      user_id: 'user-5',
      action: 'Updated case status',
      entity_type: 'complaint_case',
      entity_id: cases[0].id,
      old_value: 'UNDER_REVIEW',
      new_value: 'UNDER_PROCESS',
      ip_reference: '10.20.0.12',
      created_at: at(16, 10, 42),
    },
    {
      id: uid('aud'),
      user_id: 'user-3',
      action: 'Noted cross-bureau overlap',
      entity_type: 'case_link',
      entity_id: 'PGRC-2026-1042',
      old_value: null,
      new_value: 'RB-2026-7821',
      ip_reference: '10.20.0.18',
      created_at: at(14, 11, 5),
    },
  ]

  return {
    bureaus: BUREAUS,
    institutions,
    profiles,
    cases,
    actions,
    documents,
    links: rawLinks,
    embeddings,
    notifications,
    auditLogs,
    slaRules: [
      { id: 'sla-1', category: 'Any', priority: 'CRITICAL', allowed_days: 7, warning_days: 2, active: true },
      { id: 'sla-2', category: 'Any', priority: 'HIGH', allowed_days: 15, warning_days: 4, active: true },
      { id: 'sla-3', category: 'Any', priority: 'MEDIUM', allowed_days: 30, warning_days: 7, active: true },
      { id: 'sla-4', category: 'Any', priority: 'LOW', allowed_days: 45, warning_days: 10, active: true },
      {
        id: 'sla-5',
        category: 'Approval/Compliance',
        priority: 'Any',
        allowed_days: 40,
        warning_days: 10,
        active: true,
      },
    ],
    settings: {
      overlapThresholds: { ...DEFAULT_THRESHOLDS },
      prototypeNotice:
        'Overlap thresholds and SLA days are configurable prototype values and are not official AICTE policy.',
    },
    accounts: profiles.map((p) => ({
      email: p.email,
      password: DEMO_PASSWORD,
      profileId: p.id,
    })),
    suspiciousPatterns,
    sessionProfileId: null,
  }
}
