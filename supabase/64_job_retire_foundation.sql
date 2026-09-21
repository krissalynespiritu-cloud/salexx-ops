-- ============================================================
-- 64_job_retire_foundation.sql
--
-- A safe, auditable way to retire a job that turns out to be a
-- duplicate or otherwise shouldn't count as real work -- the job-
-- level equivalent of the client merge foundation (60/61/62).
--
-- Motivating case: SLX-166 ("Angelina Rockelman", patio cover).
-- Independent read-only verification found it shares the exact
-- address, job type, and contract price ($5,365.45) of SLX-029,
-- has no monday_item_id (never on the Monday board at all), and
-- carries a $684.88 Materials cost row that duplicates one already
-- on SLX-029. Everything points at the same project recorded twice
-- by 30_reconcile_from_sheet.sql, not a second real project. SLX-166
-- itself is NOT touched by this file -- this only builds the tool.
--
-- Purely additive. No job is modified, merged, or deleted here.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table jobs add column if not exists retired boolean not null default false;
alter table jobs add column if not exists retired_at timestamptz;
alter table jobs add column if not exists retired_reason text;
create index if not exists jobs_retired_idx on jobs (retired) where retired;

-- One row per retirement: who, when, why, and a full snapshot of the
-- job as it stood at that moment -- so retiring is always traceable
-- and reversible by a human, the same guarantee client_merge_log
-- gives merges.
create table if not exists job_retire_log (
  retire_id    uuid primary key default gen_random_uuid(),
  job_id       text not null,
  retired_by   text,
  retired_at   timestamptz not null default now(),
  reason       text not null,
  job_snapshot jsonb not null
);
create index if not exists job_retire_log_job_idx on job_retire_log (job_id);

alter table job_retire_log enable row level security;
drop policy if exists team_all on job_retire_log;
create policy team_all on job_retire_log for all to authenticated using (true) with check (true);
