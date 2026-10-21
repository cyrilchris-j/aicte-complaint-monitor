# AICTE CaseSync — Integrated Institution Complaint Monitoring & Coordination Platform

**Smart India Hackathon 2026 Software Problem Statement**  
- **Title:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
- **Organization:** All India Council for Technical Education (AICTE)  
- **Department:** Regulation Bureau  
- **Category:** Software  
- **Theme:** Smart Automation  
- **Prototype Status:** SIH 2026 Prototype (Internal administrative system)

---

## 1. Executive Summary & Product Vision

In AICTE's institutional oversight framework, multiple Bureaus and Cells (Regulation Bureau, Public Grievance Redressal Cell, Approval Bureau, and Regional Offices) process representations independently. Without cross-bureau visibility:
- The same institution may have duplicate or parallel complaints under concurrent investigation.
- Different Bureaus may issue overlapping inquiries or contradictory directions.
- Institutions exploit jurisdictional silos by stalling responses across Bureaus.
- Escalations and SLA violations remain hidden inside individual queues.

**AICTE CaseSync** delivers a unified, AI-assisted **Institution 360° Complaint Intelligence & Monitoring Dashboard** providing authorized AICTE officials with an authoritative single source of truth across all Bureaus and Regional Offices.

---

## 2. Key Administrative Questions Answered Instantly

Every case and institution screen in CaseSync resolves the 10 core operational questions:
1. **Which institution is involved?** Autoritative AICTE Permanent ID, verified name, location, and regional affiliation.
2. **How many complaints/cases exist for that institution?** Historical and active volume across all Bureaus.
3. **Which Bureau/Cell is handling each case?** Bureau code, name, and operational owner.
4. **Who is responsible?** Named assigned Case Officer or Bureau Head.
5. **What is the current status?** Real-time lifecycle state (`NEW` through `DISPOSED` / `CLOSED`).
6. **What action was last taken?** Exact date, time, acting officer, and action summary.
7. **What action is next?** Policy recommendation paired with human-supervised AI suggestions.
8. **Is another Bureau handling a related case?** Hybrid cross-bureau overlap detection with similarity scoring and explainability.
9. **Is the case approaching or exceeding its prescribed timeline?** Dynamic, configurable SLA monitoring.
10. **Does the complaint require verification or coordination?** Risk screening, complainant verification, and bilateral Bureau coordination workflow.

---

## 3. SIH 2026 Live Demo Scenario (ABC Engineering College)

The platform is pre-loaded with the exact Smart India Hackathon problem statement demonstration:

1. **Intake / Detection**:
   - **Case A (`PGRC-2026-1042`)**: Filed through Public Grievance Redressal Cell (PGRC) regarding **ABC Engineering College** (`AICTE-PERM-10001`): *"The institution is collecting additional fees from students beyond the stated fee structure."*
   - **Case B (`RB-2026-7821`)**: Filed through Regulation Bureau (RB) regarding the same institution: *"Unauthorised fee complaint against the institution."*
2. **AI Overlap Engine Output**:
   - Computes **91% composite similarity**.
   - **Explainability Checklist**:
     - ✓ Same AICTE Permanent ID (`AICTE-PERM-10001`)
     - ✓ Same complaint category (`Fees`)
     - ✓ 87% semantic text similarity
     - ✓ Received within 4 days of each other
     - ✓ Cross-Bureau handling (PGRC ↔ RB)
3. **Officer Action & Coordination**:
   - The Case Officer clicks **View Related Case** to review both files side-by-side.
   - The Bureau Head executes **Link Cases** or **Request Coordination**.
   - Both case files maintain their independent audit trails, actions, and timelines while sharing bilateral cross-bureau visibility.

---

## 4. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AICTE CaseSync Frontend                         │
│   React 19 + TypeScript + Vite + Tailwind CSS (Government Enterprise)  │
│   - Institution 360° View    - Overlap & Coordination Center           │
│   - Advanced Case Table      - Verification & Suspicious Cluster Queue │
│   - SLA Monitoring Engine    - Executive Recharts Visualizations       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Supabase Cloud Platform                         │
│   ├── PostgreSQL (11 Relational Tables + Relational Integrity)        │
│   ├── pgvector Extension (Vector Similarity Search on Case Text)       │
│   ├── Row-Level Security (RLS Enforcing Least-Privilege Role Isolation)│
│   ├── Supabase Storage (Private Buckets for Sensitive Case Records)    │
│   └── Edge Functions (Server-Side Embedding Generation)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Hybrid AI Overlap Detection Architecture

Rather than naive text matching or a black-box AI model, CaseSync uses a **transparent, two-stage hybrid engine**:

### Stage 1: Authoritative Institution Matching
- Checks authoritative **AICTE Permanent ID**.
- Falls back to normalized name string distance and regional proximity.

### Stage 2: Semantic Similarity & Context Rules
Embeddings are computed from `Category + "\n" + Subject + "\n" + Description` and vector cosine distance is calculated.

### Composite Score Weights (Data-Driven & Configurable)
$$\text{Overlap Score} = 0.40 \cdot \text{Institution} + 0.35 \cdot \text{Semantic} + 0.15 \cdot \text{Category} + 0.10 \cdot \text{Temporal}$$

- **85% – 100%**: Potential Duplicate / Strong Overlap
- **70% – 84%**: Potentially Related
- **50% – 69%**: Weak Relation
- **< 50%**: No Strong Relationship

### Explainability Requirement
AI suggestions never merge or dismiss cases automatically. Every alert includes transparent bulleted justifications and requires human officer confirmation.

---

## 6. Complaint Verification & False Pattern Detection

CaseSync does **not** employ an automated "fake complaint filter" that might discard genuine grievances. Instead, it implements a **Complaint Verification & Risk Screening Pipeline**:
- **Complainant Verification**: Tracks mobile verification and identity status (supports confidential/anonymous complainants without exposing identity publicly).
- **Evidence Verification**: Tracks receipt and validation of fee receipts, notices, and documents.
- **Institution Response Record**: Formal opportunity for the institution to reply.
- **Suspicious Submission Pattern Detector**: Flags unusual spikes (e.g., 10 complaints submitted against the same polytechnic in an 8-minute window with 94% text similarity from newly created accounts) for human verification.

---

## 7. Role-Based Access Control (RBAC) Matrix

| Feature / Action | Super Admin | Senior Management | Bureau Head | Case Officer | Regional Officer |
|---|:---:|:---:|:---:|:---:|:---:|
| System-Wide Dashboard | ✓ Full | ✓ Read-only | Bureau Scope | Assigned Scope | Regional Scope |
| Institution 360° | ✓ Full | ✓ Read-only | ✓ Full | ✓ Full | Regional Scope |
| Case Creation | ✓ | — | ✓ | ✓ | ✓ |
| Case Status Update | ✓ | — | ✓ | ✓ (Assigned) | ✓ (Regional) |
| Officer Assignment | ✓ | — | ✓ (Own Bureau) | — | — |
| Cross-Bureau Transfer | ✓ | — | ✓ | — | — |
| Case Linking / Coordination | ✓ | ✓ | ✓ | View Only | View Only |
| SLA Configuration | ✓ | — | — | — | — |
| User & Role Management | ✓ | — | — | — | — |
| Audit Log Inspection | ✓ | — | — | — | — |

---

## 8. Database Schema & RLS Implementation

The schema is defined in `supabase/migrations/`:
- `0001_schema.sql`: Core relational tables (`institutions`, `bureaus`, `profiles`, `complaint_cases`, `case_actions`, `case_documents`, `case_links`, `complaint_embeddings`, `notifications`, `audit_logs`, `sla_rules`) with pgvector support.
- `0002_rls.sql`: Strict Row Level Security policies preventing unauthorized cross-tenant, cross-bureau, or role escalation. Audit logs are write-only by system, viewable only by Super Admin, and immutable to normal users.
- `0003_storage.sql`: Private document storage buckets (`complaint-documents`, `evidence`, `case-attachments`) with authenticated signed access.

---

## 9. Pre-Configured Demo Accounts

For offline and evaluative review, pre-seeded accounts are provided:

- **Password for all accounts:** `Demo@SIH2026`

1. **Super Admin:** `admin@aicte.gov.in` (Full access, system settings, user management, audit logs)
2. **Senior Management:** `director@aicte.gov.in` (Advisor Regulation, organization-wide analytics)
3. **Bureau Head (Regulation):** `rb.head@aicte.gov.in` (Regulation Bureau head, case transfers, linking)
4. **Bureau Head (PGRC):** `pgrc.head@aicte.gov.in` (Public Grievance Redressal Cell head)
5. **Case Officer (PGRC):** `officer.pgrc@aicte.gov.in` (Handles PGRC-2026-1042)
6. **Case Officer (RB):** `officer.rb@aicte.gov.in` (Handles RB-2026-7821)
7. **Regional Officer (Southern):** `south.ro@aicte.gov.in` (Southern Regional Office)
8. **Regional Officer (Northern):** `north.ro@aicte.gov.in` (Northern Regional Office)

---

## 10. Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
cd sih'26

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:5174/` (or `http://localhost:5173/`).

### Production Build & Linting
```bash
# Run TypeScript compilation and Vite production build
npm run build

# Run fast Oxlint verification
npm run lint
```

### Environment Configuration
Copy `.env.example` to `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-Side Edge Functions Only
AI_API_KEY=
AI_API_URL=https://api.openai.com/v1/embeddings
AI_EMBEDDING_MODEL=text-embedding-3-small
```

When Supabase environment variables are omitted, CaseSync seamlessly runs in standalone **High-Fidelity Demo Mode** with 50+ pre-seeded institutions, 180+ cases, real-time embeddings, and interactive coordination workflows.
