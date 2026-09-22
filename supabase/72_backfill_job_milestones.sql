-- ============================================================
-- 72_backfill_job_milestones.sql
--
-- Third slice of roadmap item #18: backfills the four milestone
-- flags added in migration 71 from each job's CURRENT stage, using
-- the documented pipeline order (11_align_stages.sql's own comment:
-- "The full list, in Monday's board order" -- with Project on hold
-- listed separately, confirming it's a lateral pause state, not a
-- pipeline position).
--
-- A job at or past a milestone's stage gets that milestone's _done
-- flag set true, since reaching a later stage means it necessarily
-- passed through the earlier one:
--
--   Final Walkthrough -> true at: Final Walk-through, Punch list/
--     Touch-ups (if needed), Final payment due, Final payment
--     received, Final Photos/Videos, Review Requested, Completed
--   Final Payment      -> true at: Final payment RECEIVED (not
--     "due" -- due is not the same as paid), Final Photos/Videos,
--     Review Requested, Completed
--   Final Photos       -> true at: Final Photos/Videos, Review
--     Requested, Completed
--   Review Requested   -> true at: Review Requested, Completed
--
-- Deliberately does NOT touch the *_date columns. There is no
-- historical record of exactly when each stage transition happened
-- (only sold_date/completed_date exist) -- inventing a date would be
-- fabricating data. Backfilled jobs show milestones as done with no
-- date: an honest gap, not a guess.
--
-- Jobs at "Project on hold" get no inference at all -- that status
-- replaces whatever stage they were previously at, so there's no way
-- to know how far they'd actually progressed.
--
-- Only ever sets a flag from false to true, never the reverse, and
-- only where it isn't already true -- safe to re-run.
-- ============================================================

update jobs set final_walkthrough_done = true
where stage in (
  'Final Walk-through','Punch list / Touch-ups (if needed)','Final payment due',
  'Final payment received','Final Photos / Videos','Review Requested','Completed'
)
and not final_walkthrough_done;

update jobs set final_payment_done = true
where stage in ('Final payment received','Final Photos / Videos','Review Requested','Completed')
and not final_payment_done;

update jobs set final_photos_done = true
where stage in ('Final Photos / Videos','Review Requested','Completed')
and not final_photos_done;

update jobs set review_requested_done = true
where stage in ('Review Requested','Completed')
and not review_requested_done;
