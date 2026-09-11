-- ============================================================
-- 48_project_files_from_drive.sql
--
-- Lets the Files tab hold files that live only in Google Drive --
-- everything already sitting in the jobs' Drive folders (materials
-- invoices, contract photos, permit PDFs, project photos/videos) that
-- was put there before the app existed or added straight in Drive.
--
-- Such a row has no Supabase storage object, so storage_path is made
-- nullable. A null storage_path means "Drive-only" -- the app opens it
-- via drive_url instead of a signed storage URL.
--
-- The rows themselves (641 of them across ~72 jobs) are inserted
-- through the app from the Apps Script export, not here.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table project_files alter column storage_path drop not null;

-- one row per Drive file, so the backfill can be re-run without duplicating
create unique index if not exists project_files_drive_file_id_key
  on project_files (drive_file_id) where drive_file_id is not null;

-- verify -- storage_path should now be nullable (is_nullable = YES)
select column_name, is_nullable
from information_schema.columns
where table_name = 'project_files' and column_name = 'storage_path';
