# AICTE Complaint Monitor

### Integrated Institution Complaint Monitoring & Coordination Platform

> A secure, AI-assisted centralized platform for monitoring, tracking, analyzing, and coordinating institution-related complaint cases across AICTE Bureaus and Cells.

**Organization:** All India Council for Technical Education (AICTE)  
**Department:** Regulation Bureau  
**Category:** Software  
**Theme:** Smart Automation  
**Repository:** `aicte-complaint-monitor`

---

## 1. Problem Statement

AICTE receives complaints and grievances related to technical education institutions from students, faculty members, stakeholders, and other concerned parties.

These cases may be handled independently by different Bureaus/Cells such as the Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC).

When complaints concerning the same institution are handled across multiple Bureaus/Cells without a centralized real-time monitoring mechanism, it can result in:

- Duplicate investigations
- Overlapping actions
- Delayed case disposal
- Lack of coordination
- Difficulty identifying the responsible Bureau/official
- Limited visibility into institution-level complaint history
- Missed deadlines and pending actions

### Proposed Solution

**AICTE Complaint Monitor** establishes a centralized source of truth for institution-related complaint cases.

The platform enables authorized officials to view institution-level complaint history, monitor case movement, detect potential duplicate or overlapping cases using AI-assisted analysis, coordinate across Bureaus/Cells, track timelines, and generate actionable reports.

---

# 2. Vision

Transform institution-related complaint management from fragmented case tracking into a:

**Centralized → Intelligent → Coordinated → Auditable → Time-aware**

administrative workflow.

The platform answers:

> **Which institution? Which complaint? Which Bureau? Which officer? What happened? What happens next? Is another Bureau handling a related case? Is the case approaching its deadline?**

---

# 3. Core Features

## 3.1 Institution 360°

A unified profile for every institution containing:

- AICTE Permanent ID
- Institution name
- Institution type
- Address
- State
- District
- Region
- Contact information
- Total complaint count
- Pending cases
- Active cases
- Disposed cases
- Overdue cases
- Related cases
- Cross-Bureau activity

### Institution-level history

Officials can view the complete complaint and regulatory activity associated with an institution from a single screen.

---

## 3.2 Centralized Complaint Management

Every complaint receives a unique Case ID.

Each case contains:

- Case ID
- Institution
- Complaint category
- Complaint subject
- Complaint description
- Complainant type
- Source
- Priority
- Current status
- Assigned Bureau/Cell
- Assigned officer
- Received date
- Last action date
- Expected disposal date
- Verification status
- Overlap status
- Supporting documents

---

## 3.3 Cross-Bureau Overlap Detection

The system identifies cases that may concern the same institution and similar issues across different Bureaus/Cells.

Example:

```text
ABC Engineering College

PGRC-2026-1042
Fee-related complaint
PGRC
Under Process

RB-2026-7821
Unauthorized fee complaint
RB
Under Process
```

The system can flag:

```text
Potential Cross-Bureau Overlap

Similarity: 91%

Reasons:
✓ Same AICTE Permanent ID
✓ Same complaint category
✓ Similar complaint description
✓ Close submission dates

Action:
Coordination Required
```

AI suggestions do not automatically merge or close cases.

Final decisions remain with authorized officials.

---

# 4. AI-Assisted Intelligence

The platform uses a hybrid approach combining deterministic rules and AI-assisted semantic analysis.

## 4.1 Institution Matching

Primary matching uses the:

**AICTE Permanent ID**

Additional matching can consider:

- Institution name
- Normalized institution name
- Address
- State
- Region

The Permanent ID is treated as the authoritative identifier wherever available.

---

## 4.2 Semantic Complaint Similarity

Complaint text is converted into an embedding vector.

```text
Complaint
    ↓
Embedding Model
    ↓
Vector
    ↓
PostgreSQL + pgvector
    ↓
Similarity Search
    ↓
Related Cases
```

This allows the system to identify complaints that have similar meaning even when the wording is different.

### Example

**Complaint A**

> Institution is collecting additional fees from students.

**Complaint B**

> Students are being charged unauthorized fees beyond the official structure.

The wording differs, but the underlying issue may be related.

---

## 4.3 Hybrid Overlap Scoring

AI similarity is combined with structured signals.

Example prototype scoring model:

```text
Institution Match       40%
Semantic Similarity     35%
Category Match          15%
Temporal Proximity      10%
                         ----
Total                  100%
```

Suggested configurable interpretation:

```text
85–100%  → Strong Potential Overlap
70–84%   → Potentially Related
50–69%   → Weak Relation
<50%     → No Strong Relationship
```

These thresholds are configurable prototype values and are not represented as official AICTE policy.

---

## 4.4 Explainable AI

The system should never show only a similarity percentage.

Instead:

```text
Potential Overlap: 91%

Why this case was flagged:

✓ Same institution
✓ Same complaint category
✓ High semantic similarity
✓ Cases received within a short time period

Recommendation:
Review related cases and coordinate with the concerned Bureau.

Human verification required.
```

---

# 5. Complaint Verification

The platform must not automatically label complaints as fake.

Instead, it provides a structured **Verification & Risk Screening** workflow.

Verification information may include:

- Complainant verification
- Source
- Supporting evidence
- Uploaded documents
- Institution response
- Related complaint patterns
- Duplicate indicators
- Suspicious submission patterns

Possible verification states:

```text
VERIFIED
UNDER REVIEW
EVIDENCE REQUIRED
INSTITUTION RESPONSE REQUIRED
UNVERIFIED
CLOSED
```

AI assists officials; it does not replace official decision-making.

---

# 6. Suspicious Submission Pattern Detection

The system can identify unusual submission patterns for human review.

Example:

```text
⚠ Suspicious Submission Pattern

Institution:
ABC Engineering College

Related submissions:
10

Average text similarity:
94%

Submission window:
8 minutes

Pattern:
Multiple newly created accounts

Action:
Human verification required
```

This is a **risk signal**, not an automatic rejection mechanism.

---

# 7. Case Lifecycle

The complaint workflow supports:

```text
NEW
 ↓
UNDER REVIEW
 ↓
VERIFICATION
 ↓
UNDER PROCESS
 ↓
 ┌────────────────────┐
 ↓                    ↓
PENDING INFORMATION   ESCALATED
 ↓
UNDER PROCESS
 ↓
DISPOSED
 ↓
CLOSED
```

Cases may also be:

```text
TRANSFERRED
```

between authorized Bureaus/Cells.

Every transition is recorded in the case history.

---

# 8. Case Action Timeline

Every case maintains a chronological audit-friendly timeline.

Example:

```text
21 Oct 2026 — 10:32 AM
Complaint received
PGRC

21 Oct 2026 — 11:05 AM
Case assigned to Officer A

22 Oct 2026 — 03:20 PM
Additional documents requested

24 Oct 2026 — 01:15 PM
Documents uploaded

25 Oct 2026 — 09:40 AM
Verification initiated
```

Each action records:

- Date
- Time
- User
- Bureau
- Action
- Remarks
- Supporting documents

---

# 9. SLA & Deadline Monitoring

The platform monitors case timelines using configurable SLA rules.

The system identifies:

```text
✓ Within Timeline

⚠ Approaching Deadline

🔴 Overdue
```

Officials receive alerts for:

- Approaching deadlines
- Overdue cases
- Pending actions
- Pending verification
- Escalation requirements
- Unresolved overlaps

Official SLA values should be configurable and must not be hardcoded unless supplied by the authorized authority.

---

# 10. Real-Time Dashboard

The primary dashboard provides an organization-wide operational overview.

### Key Metrics

```text
Total Cases
Pending
Under Process
Disposed
Overdue
Potential Overlaps
```

### Dashboard Analytics

#### Case Status Distribution

- New
- Under Review
- Under Process
- Pending
- Escalated
- Disposed

#### Bureau Workload

- Regulation Bureau
- PGRC
- Other Bureaus/Cells
- Regional Offices

#### Monthly Case Trend

Tracks cases received and disposed over time.

#### Case Ageing

```text
0–7 days
8–15 days
16–30 days
31–60 days
60+ days
```

#### Overlap Monitoring

Displays:

- Potential overlaps
- Cross-Bureau cases
- High-priority overlaps
- Cases awaiting coordination

---

# 11. Overlap & Coordination Center

A dedicated workspace for cross-Bureau coordination.

### Overview

```text
31 Potential Overlaps

18 Cross-Bureau Cases

7 High Priority

12 Awaiting Coordination
```

### Case comparison

```text
Institution
Case A
Bureau A
Case B
Bureau B
Similarity
Reason
Action
```

Officials can:

- View related cases
- Link cases
- Mark unrelated
- Request coordination
- Transfer cases
- Escalate cases

---

# 12. Case Linking

Authorized officials can confirm AI-generated relationships.

Supported relationship types:

- Potential Duplicate
- Related Case
- Cross-Bureau Overlap
- Same Institution
- Requires Coordination

AI suggestions never automatically merge cases.

Original case records and individual timelines remain preserved.

---

# 13. Reports & Analytics

The reporting module provides:

### Institution-wise Reports

Complaint history by institution.

### Bureau-wise Reports

Workload and case disposal by Bureau.

### Region-wise Reports

Regional complaint distribution.

### Status-wise Reports

Case distribution by status.

### Ageing Analysis

Identify long-pending cases.

### Disposal Rate

Monitor case disposal performance.

### Overlap Analysis

Track potential duplicate and cross-Bureau cases.

### Monthly / Quarterly Reports

Provide time-based operational analysis.

Reports can be exported where supported.

---

# 14. Search & Filtering

Global search supports:

- Institution Name
- AICTE Permanent ID
- Case ID
- Complaint Subject
- Bureau/Cell
- Officer

Filters include:

- Region
- State
- Complaint Category
- Status
- Priority
- Date Range
- Bureau
- SLA Status
- Overlap Status

---

# 15. Notifications

The notification center provides alerts such as:

```text
⚠ 3 cases approaching SLA

🔴 2 cases overdue

⚠ Potential cross-Bureau overlap detected

📄 Institution response received

↗ Case transferred to your Bureau
```

Users can:

- View notification
- Mark as read
- Open related case
- Filter notifications

---

# 16. Role-Based Access

The platform supports:

### Super Admin

Full system access.

### Senior Management

Organization-wide monitoring and analytics.

### Bureau Head

Bureau-level case management, assignment, transfer, escalation and coordination.

### Case Officer

Assigned-case management and action updates.

### Regional Officer

Region-level institution and case monitoring.

Access must be enforced at both:

- Application level
- Database level using Supabase Row Level Security

---

# 17. Database Architecture

The system uses:

**Supabase PostgreSQL**

with:

**pgvector**

for AI-assisted similarity search.

### Main tables

```text
institutions
bureaus
profiles
complaint_cases
case_actions
case_documents
case_links
complaint_embeddings
notifications
audit_logs
sla_rules
```

### Relationships

```text
Institution
    │
    └── Complaint Cases
             │
             ├── Case Actions
             ├── Case Documents
             ├── Notifications
             └── Case Links
                     ↕
                Related Cases

Bureau
    │
    └── Complaint Cases

Profile
    │
    └── Assigned Cases
```

---

# 18. Supabase Services

### Supabase Auth

Used for:

- Authentication
- Session management
- Password reset
- User identity

### Supabase PostgreSQL

Used for:

- Institutions
- Complaints
- Cases
- Users
- Actions
- Relationships
- Reports
- Audit records

### Supabase Storage

Used for:

- Complaint documents
- Evidence
- Official letters
- Case attachments

### Supabase Realtime

Used for:

- Case status changes
- Notifications
- Dashboard updates
- Coordination updates

### pgvector

Used for:

- Complaint embeddings
- Semantic similarity
- Related-case discovery

---

# 19. Security

Security is a core requirement.

Implement:

- Supabase Auth
- PostgreSQL Row Level Security
- Role-based authorization
- Private Storage buckets
- Signed document URLs
- Input validation
- File validation
- File size restrictions
- Secure environment variables
- Server-side AI API calls
- Audit logs
- Protected API endpoints
- Error handling
- Rate limiting where appropriate

Never expose:

- Service-role keys
- Private AI API keys
- Sensitive configuration
- Internal credentials

in frontend code.

---

# 20. UI / UX

The interface must follow a professional **AICTE-style light government portal aesthetic**.

### Colors

Use a restrained palette based around:

- White
- Off-white
- AICTE-style blue
- Navy
- Light blue
- Neutral gray
- Semantic success/warning/error colors

Do not use:

- Neon gradients
- Dark backgrounds
- Excessive glass effects
- Excessive rounded cards
- Decorative animations
- Gaming-style UI

### Design principles

- Professional
- Accessible
- Dense but readable
- Information-first
- Consistent
- Responsive
- Government enterprise style

---

# 21. Main Navigation

```text
AICTE
Complaint Monitor

Dashboard

Institutions
Complaints
Overlap & Coordination
Verification Queue
My Assigned Cases

Reports & Analytics

Notifications

Administration
    Users & Roles
    Audit Logs
    SLA Rules
    Settings
```

Navigation should adapt according to the user's role.

---

# 22. Core Pages

The application should contain at minimum:

```text
/login

/dashboard

/institutions

/institutions/:id

/complaints

/complaints/new

/complaints/:id

/overlaps

/verification

/my-cases

/notifications

/reports

/users

/audit-logs

/settings
```

---

# 23. Technology Stack

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS

## Backend / Platform

- Supabase
- PostgreSQL

## AI

- Embedding API
- Optional LLM for case summaries and recommendations
- pgvector

## Authentication

- Supabase Auth

## Storage

- Supabase Storage

## Realtime

- Supabase Realtime

## Charts

- Recharts

## Deployment

- Vercel or equivalent production hosting

---

# 24. Environment Variables

Create `.env.example`.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
AI_API_KEY=
```

Never commit real credentials.

AI keys must be used through secure server-side functions where required.

---

# 25. Project Structure

Recommended structure:

```text
aicte-complaint-monitor/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── institutions/
│   │   ├── complaints/
│   │   ├── overlaps/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── shared/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── institutions/
│   │   ├── complaints/
│   │   ├── overlaps/
│   │   ├── verification/
│   │   ├── reports/
│   │   ├── administration/
│   │   └── settings/
│   │
│   ├── layouts/
│   │
│   ├── hooks/
│   │
│   ├── services/
│   │   ├── supabase/
│   │   ├── ai/
│   │   └── notifications/
│   │
│   ├── lib/
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   ├── data/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
│
├── .env.example
├── package.json
├── README.md
└── ...
```

---

# 26. Demo Data

Create realistic synthetic demo data.

Do NOT use real personal information.

Seed at least:

- 50 institutions
- 150+ complaint cases
- Multiple Bureaus
- Multiple regions
- Multiple categories
- Pending cases
- Overdue cases
- Disposed cases
- Transferred cases
- Escalated cases
- Related cases
- Potential duplicate cases
- Cross-Bureau overlap cases

The data must have meaningful relationships.

Do not generate random disconnected records.

---

# 27. Primary SIH Demonstration

The most important demo scenario should be:

### Step 1

Create a complaint against:

**ABC Engineering College**

Subject:

**Unauthorized additional fee collection**

### Step 2

The system identifies the institution using its AICTE Permanent ID.

### Step 3

The system generates an embedding for the complaint.

### Step 4

The system searches existing complaint embeddings.

### Step 5

It finds an existing RB case concerning the same institution and a similar issue.

### Step 6

The system displays:

```text
⚠ Potential Cross-Bureau Overlap

PGRC-2026-1042
PGRC

RB-2026-7821
Regulation Bureau

Similarity:
91%

Reasons:

✓ Same Institution
✓ Same Category
✓ High Semantic Similarity
✓ Close Submission Dates

Coordination Required
```

### Step 7

The official opens:

**View Related Cases**

### Step 8

The official can:

```text
Link Cases
Mark Unrelated
Request Coordination
Transfer
Escalate
```

### Step 9

The system records the action in the audit timeline.

This is the primary proof-of-concept for the problem statement.

---

# 28. Example AI Case Summary

For an active case:

```text
AI-Assisted Case Summary

The complaint concerns alleged unauthorized
fee collection by the institution.

Supporting evidence:
2 documents uploaded.

Institution response:
Pending.

Related cases:
2 detected.

Potential cross-Bureau overlap:
High.

Suggested next action:
Review related RB case and coordinate
before initiating parallel action.

Human decision required.
```

---

# 29. Key Product Differentiators

The platform is not merely a complaint tracker.

### 1. Institution 360°

All institution-related cases are visible together.

### 2. Cross-Bureau Intelligence

Detects cases handled by different Bureaus/Cells.

### 3. AI Semantic Matching

Identifies similar complaints even when wording differs.

### 4. Explainable AI

Shows why a case was flagged.

### 5. Human-in-the-Loop

AI recommends; authorized officials decide.

### 6. SLA Intelligence

Highlights approaching and overdue cases.

### 7. Complete Case Timeline

Every action is traceable.

### 8. Coordination Workflow

Officials can link, transfer and coordinate related cases.

### 9. Secure Government-Style Architecture

Authentication, RLS, private documents and audit trails.

---

# 30. Expected Impact

The proposed system aims to:

- Reduce duplicate administrative effort
- Improve cross-Bureau coordination
- Reduce overlapping actions
- Improve visibility of institution-level cases
- Improve case tracking
- Reduce missed deadlines
- Improve accountability
- Improve transparency
- Support faster decision-making
- Enable data-driven management
- Establish a centralized source of truth

---

# 31. Success Metrics

The prototype should demonstrate measurable improvements in:

### Record Visibility

Percentage of institution-related cases accessible through a unified institution profile.

### Duplicate Detection

Number of potential related/overlapping cases identified.

### Coordination

Number of cross-Bureau cases successfully linked or coordinated.

### SLA Monitoring

Number of approaching/overdue cases automatically identified.

### Administrative Efficiency

Reduction in manual case searching and cross-Bureau tracking effort.

### Case Transparency

Percentage of cases with complete action history.

---

# 32. Testing

Test at minimum:

### Authentication

- Valid login
- Invalid login
- Logout
- Password reset
- Unauthorized access

### Complaint

- Create complaint
- Update complaint
- Assign officer
- Change status
- Transfer case
- Escalate case
- Dispose case

### Institution

- Search institution
- View Institution 360°
- View complaint history
- Filter cases

### AI

- Similar complaint detection
- Different wording detection
- Same institution matching
- Cross-Bureau overlap detection
- Explainability

### Documents

- Upload
- View
- Download through authorized access
- Invalid file rejection

### Security

- RLS
- Role restrictions
- Unauthorized document access
- Audit trail

### Dashboard

- KPI calculations
- Filters
- Charts
- Real-time updates

---

# 33. Development Commands

```bash
npm install
```

Start development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Run lint:

```bash
npm run lint
```

---

# 34. Git Workflow

Use feature branches:

```text
main
│
├── feature/auth
├── feature/dashboard
├── feature/institutions
├── feature/complaints
├── feature/ai-overlap
├── feature/reports
└── feature/notifications
```

Example:

```bash
git checkout -b feature/ai-overlap
```

Commit:

```bash
git add .
git commit -m "feat: add AI complaint overlap detection"
```

Push:

```bash
git push origin feature/ai-overlap
```

---

# 35. Production Readiness Checklist

Before submission, verify:

- [ ] Authentication works
- [ ] Role-based access works
- [ ] Supabase database connected
- [ ] RLS policies enabled
- [ ] Storage configured
- [ ] Complaint CRUD works
- [ ] Institution CRUD works
- [ ] Case assignment works
- [ ] Case transfer works
- [ ] Case escalation works
- [ ] Case timeline works
- [ ] AI similarity works
- [ ] Overlap alerts work
- [ ] Case linking works
- [ ] SLA monitoring works
- [ ] Notifications work
- [ ] Reports work
- [ ] Audit logs work
- [ ] Demo data seeded
- [ ] Responsive UI verified
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] No console errors
- [ ] No exposed API keys
- [ ] No broken routes
- [ ] All important buttons functional
- [ ] Production build passes

---

# 36. SIH 2026 Positioning

**Problem Statement:**

Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells

**Proposed Product:**

### AICTE CaseSync

A centralized AI-assisted institution complaint monitoring and coordination platform.

### Core Innovation:

**Institution 360° + Cross-Bureau Overlap Detection + Explainable AI Similarity + SLA Intelligence + Human-in-the-Loop Coordination**

---

# 37. One-Line Pitch

> **AICTE Complaint Monitor brings every institution-related complaint into one intelligent dashboard, detects potential cross-Bureau overlaps using AI, and helps officials coordinate, track and resolve cases without duplicated effort.**

---

# 38. Important Implementation Principle

Build the product around the actual problem statement.

Do not add AI merely for appearance.

Every AI feature must answer a real operational question:

```text
Is this complaint related to an existing case?

Why was it flagged?

Which Bureau is handling the related case?

Does coordination need to happen?

What should the official review next?
```

The final product should demonstrate a clear chain:

**Centralized Data → AI Analysis → Explainable Alert → Human Review → Coordinated Action → Audit Trail → Management Insight**

This chain is the core of the solution.
