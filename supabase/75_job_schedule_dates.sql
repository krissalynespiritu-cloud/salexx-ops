-- ============================================================
-- 75_job_schedule_dates.sql
--
-- Last slice of "Make Projects the central workspace" (roadmap
-- Phase 3, item #13): a planned start/end date range per job,
-- backing the new "Schedule" tab on the job detail view.
--
-- Scoped deliberately narrow, per discussion: a date range per job,
-- not a crew calendar or day-by-day crew assignment -- that's a much
-- bigger, separate feature this migration does not attempt.
--
-- Purely additive: two nullable date columns, mirroring the exact
-- pattern already used for the milestone dates in 71_job_milestones.sql.
-- No job is touched and nothing is backfilled -- there's no reliable
-- historical record of what any job's planned schedule actually was.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table jobs add column if not exists scheduled_start_date date;
alter table jobs add column if not exists scheduled_end_date date;
create index if not exists jobs_scheduled_start_idx on jobs (scheduled_start_date) where scheduled_start_date is not null;

-- verify -- expect 0 until the Schedule tab is used
select count(*) from jobs where scheduled_start_date is not null or scheduled_end_date is not null;
