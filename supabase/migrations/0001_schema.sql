-- AICTE CaseSync schema (SIH 2026 Prototype)
create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.bureaus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  aicte_permanent_id text not null unique,
  institution_name text not null,
  institution_type text,
  address text,
  city text,
  district text,
  state text,
  region text,
  pincode text,
  contact_email text,
  contact_phone text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in (
    'SUPER_ADMIN','SENIOR_MANAGEMENT','BUREAU_HEAD','CASE_OFFICER','REGIONAL_OFFICER'
  )),
  bureau_id uuid references public.bureaus(id),
  region text,
  designation text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.complaint_cases (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  institution_id uuid not null references public.institutions(id),
  bureau_id uuid not null references public.bureaus(id),
  assigned_officer_id uuid references public.profiles(id),
  complainant_type text,
  complainant_name text,
  complainant_reference text,
  complaint_category text,
  subject text not null,
  description text not null,
  priority text not null default 'MEDIUM',
  status text not null default 'NEW',
  received_date timestamptz not null default now(),
  last_action_date timestamptz not null default now(),
  expected_disposal_date timestamptz,
  actual_disposal_date timestamptz,
  source text,
  verification_status text not null default 'UNVERIFIED',
  overlap_status text not null default 'NONE',
  pending_transfer_bureau_id uuid references public.bureaus(id),
  mobile_verified boolean not null default false,
  documents_received boolean not null default false,
  institution_response_received boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.complaint_cases(id) on delete cascade,
  action_type text not null,
  action_description text not null,
  performed_by uuid references public.profiles(id),
  from_bureau_id uuid references public.bureaus(id),
  to_bureau_id uuid references public.bureaus(id),
  created_at timestamptz not null default now()
);

create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.complaint_cases(id) on delete cascade,
  document_name text not null,
  document_type text,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id),
  verification_status text not null default 'UNDER_REVIEW',
  uploaded_at timestamptz not null default now()
);

create table if not exists public.case_links (
  id uuid primary key default gen_random_uuid(),
  source_case_id uuid not null references public.complaint_cases(id) on delete cascade,
  target_case_id uuid not null references public.complaint_cases(id) on delete cascade,
  relationship_type text not null,
  similarity_score numeric,
  reason text,
  reasons jsonb,
  breakdown jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  confirmed boolean not null default false,
  dismissed boolean not null default false,
  coordination_requested boolean not null default false
);

create table if not exists public.complaint_embeddings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.complaint_cases(id) on delete cascade,
  embedding vector(256),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.complaint_cases(id) on delete set null,
  notification_type text not null,
  title text not null,
  message text not null,
  priority text not null default 'MEDIUM',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value text,
  new_value text,
  ip_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.sla_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  priority text not null,
  allowed_days integer not null,
  warning_days integer not null,
  active boolean not null default true
);

create index if not exists idx_institutions_perm on public.institutions (aicte_permanent_id);
create index if not exists idx_institutions_region on public.institutions (region);
create index if not exists idx_cases_case_id on public.complaint_cases (case_id);
create index if not exists idx_cases_institution on public.complaint_cases (institution_id);
create index if not exists idx_cases_bureau on public.complaint_cases (bureau_id);
create index if not exists idx_cases_officer on public.complaint_cases (assigned_officer_id);
create index if not exists idx_cases_status on public.complaint_cases (status);
create index if not exists idx_cases_received on public.complaint_cases (received_date);
create index if not exists idx_cases_expected on public.complaint_cases (expected_disposal_date);

create or replace function public.match_complaint_embeddings(
  query_embedding vector(256),
  match_count int default 8
)
returns table (case_id uuid, similarity float)
language sql stable as $$
  select e.case_id, 1 - (e.embedding <=> query_embedding) as similarity
  from public.complaint_embeddings e
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
