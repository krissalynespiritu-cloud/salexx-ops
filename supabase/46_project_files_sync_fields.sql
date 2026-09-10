-- ============================================================
-- 46_project_files_sync_fields.sql
--
-- Phase 2 of project file storage: the fields the Zapier zap needs to
-- copy a freshly uploaded file into Google Drive, without having to
-- look anything else up.
--
--   job_drive_url  -- the job's Google Drive folder link, copied onto
--                     the row at upload time (from jobs.drive_folder_url)
--   download_url   -- a 7-day signed URL to the file in the private
--                     bucket, so Zapier's Google Drive "Upload File"
--                     step can fetch it directly with no auth header
--
-- The zap: trigger on a new project_files row -> filter drive_status =
-- 'pending' and job_drive_url present -> find the {category} subfolder
-- inside the job's Drive folder -> upload {download_url} -> PATCH the
-- row to drive_status = 'synced' with the new Drive link.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table project_files add column if not exists job_drive_url text;
alter table project_files add column if not exists download_url  text;

-- verify
select column_name
from information_schema.columns
where table_name = 'project_files'
  and column_name in ('job_drive_url', 'download_url')
order by column_name;
