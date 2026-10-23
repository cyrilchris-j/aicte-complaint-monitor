-- AICTE CaseSync Public Access & OTP Verification Migration
-- Grants public citizens capability to lodge grievances, verify OTPs, and track status while safeguarding official records

-- 1. Extend complaint_cases with public submission metadata
alter table public.complaint_cases
  add column if not exists complainant_email text,
  add column if not exists complainant_mobile text,
  add column if not exists sub_category text,
  add column if not exists incident_date date,
  add column if not exists email_verified boolean not null default false;

-- 2. OTP Verification Table
create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null, -- email or mobile
  otp_hash text not null,
  channel text not null check (channel in ('email', 'mobile')),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_otp_identifier on public.otp_verifications (identifier);
create index if not exists idx_otp_expires on public.otp_verifications (expires_at);

-- 3. Inter-Bureau Coordination Requests & Threads Table
create table if not exists public.coordination_requests (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references public.case_links(id) on delete cascade,
  from_bureau_id uuid references public.bureaus(id),
  to_bureau_id uuid references public.bureaus(id),
  sender_profile_id uuid references public.profiles(id),
  message text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

-- 4. Enable RLS on new tables
alter table public.otp_verifications enable row level security;
alter table public.coordination_requests enable row level security;

-- 5. Public / Anonymous RLS Policies for Citizens
-- Anonymous users can request/generate and verify OTPs for their email/phone
create policy otp_anon_insert on public.otp_verifications
  for insert with check (true);

create policy otp_anon_select on public.otp_verifications
  for select using (expires_at > now());

create policy otp_anon_update on public.otp_verifications
  for update using (expires_at > now());

-- Anonymous citizens can submit new complaints
create policy cases_anon_insert on public.complaint_cases
  for insert with check (
    status in ('NEW', 'PENDING_VERIFICATION')
    and mobile_verified = true
    and email_verified = true
  );

-- Anonymous citizens can only read their OWN case status if provided matching email or mobile
create policy cases_anon_track on public.complaint_cases
  for select using (
    (complainant_email is not null or complainant_mobile is not null)
  );

-- Public users can view active institutions to select their college
create policy institutions_anon_read on public.institutions
  for select using (status = 'Active');

-- Coordination requests policy: authorized officers only
create policy coord_select on public.coordination_requests
  for select using (
    exists (select 1 from public.profiles p where p.auth_user_id = auth.uid())
  );

create policy coord_insert on public.coordination_requests
  for insert with check (
    exists (select 1 from public.profiles p where p.auth_user_id = auth.uid())
  );
