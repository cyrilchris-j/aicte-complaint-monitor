alter table public.bureaus enable row level security;
alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.complaint_cases enable row level security;
alter table public.case_actions enable row level security;
alter table public.case_documents enable row level security;
alter table public.case_links enable row level security;
alter table public.complaint_embeddings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.sla_rules enable row level security;

create or replace function public.current_profile()
returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select coalesce((select role = 'SUPER_ADMIN' from public.current_profile()), false);
$$;

create or replace function public.is_senior()
returns boolean language sql stable as $$
  select coalesce((select role in ('SUPER_ADMIN','SENIOR_MANAGEMENT') from public.current_profile()), false);
$$;

create or replace function public.can_read_case(c public.complaint_cases)
returns boolean language sql stable as $$
  select
    public.is_senior()
    or (c.assigned_officer_id = (select id from public.current_profile()))
    or (select role = 'BUREAU_HEAD' and (bureau_id = c.bureau_id or bureau_id = c.pending_transfer_bureau_id) from public.current_profile())
    or (select role = 'CASE_OFFICER' and (id = c.assigned_officer_id or bureau_id = c.bureau_id or bureau_id = c.pending_transfer_bureau_id) from public.current_profile())
    or (
      (select role = 'REGIONAL_OFFICER' from public.current_profile())
      and (
        c.assigned_officer_id = (select id from public.current_profile())
        or exists (
          select 1 from public.institutions i
          where i.id = c.institution_id
            and i.region = (select region from public.current_profile())
        )
      )
    );
$$;

-- Profiles: users read own; super admin all; nobody updates own role except super admin
create policy profiles_select on public.profiles
  for select using (auth.uid() = auth_user_id or public.is_senior() or public.is_super_admin());

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id and role = (select role from public.profiles p where p.id = profiles.id));

create policy profiles_admin on public.profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy bureaus_read on public.bureaus for select using (auth.uid() is not null);
create policy bureaus_admin on public.bureaus for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy institutions_read on public.institutions for select using (auth.uid() is not null);
create policy institutions_admin on public.institutions for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy cases_select on public.complaint_cases
  for select using (public.can_read_case(complaint_cases));

create policy cases_write on public.complaint_cases
  for insert with check (
    public.is_super_admin()
    or (select role in ('BUREAU_HEAD','CASE_OFFICER','REGIONAL_OFFICER') from public.current_profile())
  );

create policy cases_update on public.complaint_cases
  for update using (public.can_read_case(complaint_cases) and (
    public.is_super_admin()
    or (select role in ('BUREAU_HEAD','CASE_OFFICER','REGIONAL_OFFICER') from public.current_profile())
  ));

create policy actions_select on public.case_actions
  for select using (
    exists (select 1 from public.complaint_cases c where c.id = case_actions.case_id and public.can_read_case(c))
  );
create policy actions_insert on public.case_actions
  for insert with check (
    exists (select 1 from public.complaint_cases c where c.id = case_actions.case_id and public.can_read_case(c))
  );

create policy documents_select on public.case_documents
  for select using (
    exists (select 1 from public.complaint_cases c where c.id = case_documents.case_id and public.can_read_case(c))
  );
create policy documents_insert on public.case_documents
  for insert with check (
    exists (select 1 from public.complaint_cases c where c.id = case_documents.case_id and public.can_read_case(c))
  );

create policy links_select on public.case_links
  for select using (
    exists (select 1 from public.complaint_cases c where c.id = case_links.source_case_id and public.can_read_case(c))
    or exists (select 1 from public.complaint_cases c where c.id = case_links.target_case_id and public.can_read_case(c))
  );
create policy links_write on public.case_links
  for all using (
    public.is_senior() or (select role = 'BUREAU_HEAD' from public.current_profile())
  ) with check (
    public.is_senior() or (select role = 'BUREAU_HEAD' from public.current_profile())
  );

create policy embeddings_select on public.complaint_embeddings
  for select using (
    exists (select 1 from public.complaint_cases c where c.id = complaint_embeddings.case_id and public.can_read_case(c))
  );

create policy notifications_own on public.notifications
  for select using (user_id = (select id from public.current_profile()));
create policy notifications_update_own on public.notifications
  for update using (user_id = (select id from public.current_profile()));

create policy audit_select on public.audit_logs
  for select using (public.is_super_admin());
create policy audit_no_update on public.audit_logs
  for update using (false);
create policy audit_no_delete on public.audit_logs
  for delete using (false);
create policy audit_insert_system on public.audit_logs
  for insert with check (auth.uid() is not null);

create policy sla_read on public.sla_rules for select using (auth.uid() is not null);
create policy sla_admin on public.sla_rules for all using (public.is_super_admin()) with check (public.is_super_admin());
