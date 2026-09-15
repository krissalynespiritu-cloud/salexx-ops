-- ============================================================
-- 50_weekly_entry_full_fields.sql
--
-- Adds the fields from the "Weekly Entry" tab of the Report
-- Monthly/Weekly workbook that weekly_metrics was still missing:
--  * lead source breakdown (reached out / Facebook / referral /
--    website / phone-nextdoor-google)
--  * avg response time (minutes)
--  * estimates still needing completion, and why an estimate was lost
--  * contracts/deposit/schedule confirmed flag
--  * homeowners needing a review ask, and photos/video uploaded flag
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table weekly_metrics add column if not exists leads_reached_out int not null default 0;
alter table weekly_metrics add column if not exists leads_facebook int not null default 0;
alter table weekly_metrics add column if not exists leads_referral int not null default 0;
alter table weekly_metrics add column if not exists leads_website int not null default 0;
alter table weekly_metrics add column if not exists leads_phone_other int not null default 0;

alter table weekly_metrics add column if not exists missing_labor_receipts_materials text;
alter table weekly_metrics add column if not exists avg_response_time_min numeric(6,1);
alter table weekly_metrics add column if not exists estimates_still_needs_completion int not null default 0;
alter table weekly_metrics add column if not exists estimates_why_lost text;
alter table weekly_metrics add column if not exists contracts_deposit_schedule_confirmed text;
alter table weekly_metrics add column if not exists homeowners_needing_review_ask text;
alter table weekly_metrics add column if not exists photos_video_uploaded text;
