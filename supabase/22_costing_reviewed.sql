-- ============================================================
--  Salexx Ops Hub — mark a job's costing as reviewed
--
--  A simple done/not-done checkbox on the new Job Costing page, separate
--  from job_stage. Stage tracks where the project is in delivery; this
--  tracks whether someone has gone through and confirmed the cost entry
--  itself is complete and correct — a job can be Completed and still
--  have unreviewed costs, or still be In Progress with costs already
--  confirmed so far.
--
--  Run any time. Safe to re-run.
-- ============================================================

alter table jobs add column if not exists costing_reviewed boolean not null default false;
