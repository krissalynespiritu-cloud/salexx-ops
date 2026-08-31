-- ============================================================
--  Salexx Ops Hub — align job_stage to Monday exactly
--
--  Monday's "Project Delivery" board is the source of truth for
--  stage. These four values were worded differently in the database,
--  which meant every Monday sync needed a translation step — and a
--  translation step is something someone eventually forgets.
--
--  After this, a stage string from Monday goes straight in.
--
--  Renames only. No rows change, no data is lost.
--  Run BEFORE 12_monday_sync.sql. Safe to re-run.
-- ============================================================

do $$ begin
  alter type job_stage rename value 'Permitting/Drawings' to 'Permitting / Drawings';
exception when others then null; end $$;

do $$ begin
  alter type job_stage rename value 'Project scheduled' to 'Project Scheduled';
exception when others then null; end $$;

do $$ begin
  alter type job_stage rename value 'Punch list / Touch-ups' to 'Punch list / Touch-ups (if needed)';
exception when others then null; end $$;

do $$ begin
  alter type job_stage rename value 'Review requested' to 'Review Requested';
exception when others then null; end $$;

-- The full list, in Monday's board order, for reference:
--   Designs Sold
--   Permitting / Drawings
--   Ready For Scheduling
--   Project Scheduled
--   In Progress
--   Final Walk-through
--   Punch list / Touch-ups (if needed)
--   Final payment due
--   Final payment received
--   Final Photos / Videos
--   Review Requested
--   Completed
--   Project on hold
