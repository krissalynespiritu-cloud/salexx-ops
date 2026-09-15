-- ============================================================
-- 51_weekly_entry_full_parity.sql
--
-- weekly_metrics was still missing 7 columns the Weekly Entry
-- sheet tracks: Missing Labor/Receipts/Materials?, Avg Response
-- Time (min), Still Needs Completion (estimates), Why Lost,
-- Contracts/Deposit/Schedule Confirmed?, Homeowners Needing
-- Review Ask, Photos/Video Uploaded?. Adds them and backfills
-- the 10 weeks already imported by 39_performance_dashboard.sql,
-- read straight from the Weekly Entry workbook (no re-typing).
--
-- Also fixes a gap where migration 39 added jobs_costed,
-- appointments_set, calls_answered, missed_calls_returned,
-- estimates_accepted, estimates_invoiced, videos_to_edit,
-- videos_ready, first_time_calls_answered, first_time_calls_missed
-- to this table but the Weekly Meeting page never exposed them
-- for editing on new weeks — that's an app-side (index.html) fix,
-- this migration only adds the columns still missing entirely.
--
-- avg_response_time_min is nullable (an average, not a count) and
-- was blank for all 10 weeks in the sheet, so nothing to backfill
-- there. The other 6 are text (the sheet uses free-form Yes/No/
-- name/reason dropdowns and boxes, not fixed enums).
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table weekly_metrics add column if not exists missing_labor_receipts_materials text;
alter table weekly_metrics add column if not exists avg_response_time_min numeric(6,1);
alter table weekly_metrics add column if not exists estimates_still_needs_completion int not null default 0;
alter table weekly_metrics add column if not exists why_lost text;
alter table weekly_metrics add column if not exists contracts_confirmed text;
alter table weekly_metrics add column if not exists homeowners_needing_review_ask text;
alter table weekly_metrics add column if not exists photos_video_uploaded text;

update weekly_metrics set estimates_still_needs_completion=0 where week_ending='2026-07-09';
update weekly_metrics set estimates_still_needs_completion=0 where week_ending='2026-07-16';
update weekly_metrics set estimates_still_needs_completion=0 where week_ending='2026-07-23';
update weekly_metrics set estimates_still_needs_completion=0 where week_ending='2026-07-30';
update weekly_metrics set missing_labor_receipts_materials='Yes', estimates_still_needs_completion=0, contracts_confirmed='No', photos_video_uploaded='No' where week_ending='2026-08-06';
update weekly_metrics set missing_labor_receipts_materials='Yes', estimates_still_needs_completion=7, why_lost='Competitor' where week_ending='2026-08-13';
update weekly_metrics set missing_labor_receipts_materials='Yes', estimates_still_needs_completion=10 where week_ending='2026-08-20';
update weekly_metrics set missing_labor_receipts_materials='Yes', estimates_still_needs_completion=0, why_lost='Competitor' where week_ending='2026-08-27';
update weekly_metrics set missing_labor_receipts_materials='Yes', estimates_still_needs_completion=13, why_lost='Competitor', homeowners_needing_review_ask='1', photos_video_uploaded='No' where week_ending='2026-09-03';
update weekly_metrics set missing_labor_receipts_materials='Yes', estimates_still_needs_completion=5, why_lost='Timing', homeowners_needing_review_ask='Rhonda', photos_video_uploaded='Yes' where week_ending='2026-09-10';

-- verify
select week_ending, missing_labor_receipts_materials, estimates_still_needs_completion, why_lost, contracts_confirmed, homeowners_needing_review_ask, photos_video_uploaded
from weekly_metrics where week_ending>='2026-07-09' order by week_ending;
