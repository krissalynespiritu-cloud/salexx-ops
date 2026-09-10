-- ============================================================
-- 45_project_files.sql
--
-- Phase 1 of project file storage. Backs the rebuilt "Files" tab on
-- each job: upload invoices, permits, contracts, photos etc. straight
-- from the app, grouped into the same six folders the Monday/Zapier
-- automation already creates in Google Drive:
--
--   Materials · Estimate Details · Contracts · Permits ·
--   Project Photos/Videos · Accounting
--
-- Files are stored in a PRIVATE Supabase bucket (contracts and
-- invoices should not sit on guessable public URLs) and served to the
-- app through short-lived signed URLs.
--
-- drive_status starts 'pending'. Phase 2 (a Zapier zap) copies each
-- file into the matching Drive subfolder and patches the row to
-- 'synced' with the Drive link. Until Phase 2 exists every file just
-- stays 'pending' -- the app shows it as "syncing...".
--
-- Same trust model as the rest of the app: any signed-in admin can
-- manage everything (team_all), no per-user restriction.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists project_files (
  file_id       uuid primary key default gen_random_uuid(),
  job_id        text not null references jobs(job_id) on delete cascade,
  category      text not null,
  file_name     text not null,
  storage_path  text not null unique,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   text,
  drive_status  text not null default 'pending',   -- pending | synced | error
  drive_file_id text,
  drive_url     text,
  created_at    timestamptz not null default now()
);
create index if not exists project_files_job_idx on project_files (job_id);

alter table project_files enable row level security;
drop policy if exists team_all on project_files;
create policy team_all on project_files
  for all to authenticated using (true) with check (true);

grant all on project_files to anon, authenticated, service_role;

-- private bucket
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

drop policy if exists project_files_read on storage.objects;
create policy project_files_read on storage.objects for select
  to authenticated using (bucket_id = 'project-files');

drop policy if exists project_files_write on storage.objects;
create policy project_files_write on storage.objects for all
  to authenticated using (bucket_id = 'project-files')
  with check (bucket_id = 'project-files');

-- verify -- expect files 0, bucket_is_public f, policies 1
select
  (select count(*) from project_files)                               as files,
  (select public from storage.buckets where id = 'project-files')    as bucket_is_public,
  (select count(*) from pg_policies where tablename = 'project_files') as policies;
