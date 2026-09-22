-- ============================================================
-- 71_job_milestones.sql
--
-- First slice of roadmap item #18 ("Separate project stages from
-- milestones"): gives the four milestones (Final Walkthrough, Final
-- Payment, Final Photos, Review Requested) their own independent
-- tracking, instead of only existing as values inside the single
-- job_stage pipeline enum.
--
-- Deliberately schema-only and purely additive, per the roadmap
-- doc's own Safe Refactoring Rule ("do not delete anything simply
-- because it is being reorganized... refactor presentation and
-- relationships first"):
--   - job_stage is untouched -- no value removed, renamed, or added.
--   - STAGES, stKey, STALL_STAGES, EARLY_STAGES, and every existing
--     stage filter/badge in the app keep working exactly as today.
--   - No backfill from the existing stage values -- a job currently
--     sitting at "Final Walk-through" does NOT get
--     final_walkthrough_done set automatically. Deciding how (or
--     whether) to map historical stage data onto these columns is a
--     separate decision, not folded into this pass.
--   - No UI reads or writes these columns yet -- that's a follow-up.
--
-- Column shape mirrors the pattern already used elsewhere in this
-- schema for the same kind of thing (e.g. leads.estimate_booked /
-- estimate_booked_date, estimates.design_sent / design_sold).
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table jobs add column if not exists final_walkthrough_done boolean not null default false;
alter table jobs add column if not exists final_walkthrough_date date;

alter table jobs add column if not exists final_payment_done boolean not null default false;
alter table jobs add column if not exists final_payment_date date;

alter table jobs add column if not exists final_photos_done boolean not null default false;
alter table jobs add column if not exists final_photos_date date;

alter table jobs add column if not exists review_requested_done boolean not null default false;
alter table jobs add column if not exists review_requested_date date;
