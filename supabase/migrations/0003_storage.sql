insert into storage.buckets (id, name, public)
values
  ('complaint-documents', 'complaint-documents', false),
  ('evidence', 'evidence', false),
  ('case-attachments', 'case-attachments', false)
on conflict (id) do nothing;

create policy storage_read_staff on storage.objects
  for select using (
    bucket_id in ('complaint-documents','evidence','case-attachments')
    and auth.uid() is not null
  );

create policy storage_write_staff on storage.objects
  for insert with check (
    bucket_id in ('complaint-documents','evidence','case-attachments')
    and auth.uid() is not null
  );
