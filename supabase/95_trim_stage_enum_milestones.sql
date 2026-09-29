-- ============================================================
-- 95_trim_stage_enum_milestones.sql
--
-- Fix Plan v2, P1.2: the stage enum had finishing-touch concepts mixed
-- in with the actual linear project phase, so a job could be "In
-- Progress" (its real phase) while ALSO needing a final walkthrough,
-- final payment, final photos, or a review request -- things the app
-- already tracks independently as boolean milestone fields
-- (final_walkthrough_done, final_payment_done, final_photos_done,
-- review_requested_done, each with its own date -- see the
-- "Milestones" section on every job's Overview tab). This removes the
-- 5 redundant stage values and backfills the matching boolean for any
-- job currently sitting in one of them, per Kris's direction on
-- what each stage actually meant in practice:
--
--   Final Walk-through     -> Completed, final_walkthrough_done = false (awaiting)
--   Final payment due      -> Completed, final_payment_done = false     (awaiting)
--   Final payment received -> Completed, final_payment_done = true      (done)
--   Final Photos / Videos  -> Completed, final_photos_done = false      (awaiting)
--   Review Requested       -> Completed, review_requested_done = true   (it was requested)
--
-- "Punch list / Touch-ups (if needed)" is NOT one of the 5 -- it stays
-- as a real linear stage.
--
-- Postgres can't drop enum values in place, so this recreates the
-- type. Not idempotent in the strict sense (re-running after it's
-- already succeeded is a safe no-op, since no job will still be on a
-- retired stage name to move), but do not re-run this concurrently
-- with itself or while the app is actively writing a job's stage.
-- ============================================================

-- 1. Backfill milestone booleans/dates for any job currently on a retiring stage
update jobs set final_walkthrough_done = false
  where stage = 'Final Walk-through';
update jobs set final_payment_done = false
  where stage = 'Final payment due';
update jobs set final_payment_done = true,
  final_payment_date = coalesce(final_payment_date, completed_date, sold_date)
  where stage = 'Final payment received';
update jobs set final_photos_done = false
  where stage = 'Final Photos / Videos';
update jobs set review_requested_done = true,
  review_requested_date = coalesce(review_requested_date, completed_date, sold_date)
  where stage = 'Review Requested';

-- 2. Move all 5 retiring stages to Completed now that their milestone info is preserved
update jobs set stage = 'Completed'
  where stage in ('Final Walk-through','Final payment due','Final payment received','Final Photos / Videos','Review Requested');

-- 3. Recreate the enum without the 5 retired values
alter type job_stage rename to job_stage_old;
create type job_stage as enum (
  'Designs Sold','Permitting / Drawings','Ready For Scheduling','Project Scheduled',
  'In Progress','Punch list / Touch-ups (if needed)','Completed','Project on hold'
);
alter table jobs alter column stage type job_stage using stage::text::job_stage;
drop type job_stage_old;

-- 4. ghl_stage_map (94_job_pipeline_stage_always_sync.sql) referenced two of
-- the retired labels as valid app_stage targets -- point them at Completed
-- instead so a GHL "Final Walkthrough"/"Review Requested" signal doesn't
-- try to cast to a stage value that no longer exists. No-op if 94 hasn't
-- been run yet (its own seed data is already correct in that case).
update ghl_stage_map set app_stage = 'Completed' where ghl_stage in ('Final Walkthrough','Review Requested');

-- verify: should return exactly these 8 rows, in this order
select enumlabel from pg_enum where enumtypid = 'job_stage'::regtype order by enumsortorder;
