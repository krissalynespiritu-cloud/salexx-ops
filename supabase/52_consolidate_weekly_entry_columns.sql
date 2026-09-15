-- ============================================================
-- 52_consolidate_weekly_entry_columns.sql
--
-- Two sessions independently rebuilt the Weekly Meeting page to
-- expose every Weekly Entry sheet field before either knew about the
-- other. Migrations 50 and 51 (this pair) are the canonical result;
-- an earlier, separate pass added its own columns for 7 of the same
-- fields under different names before 50/51 existed:
--   leads_reached_out                  -> reached_out
--   leads_facebook                     -> facebook_social
--   leads_referral                     -> referral
--   leads_website                      -> website
--   leads_phone_other                  -> phone_nextdoor_google
--   estimates_why_lost                 -> why_lost
--   contracts_deposit_schedule_confirmed -> contracts_confirmed
--
-- This copies over any real value sitting in the old columns (only
-- where the canonical column is still at its default, so it never
-- overwrites the sheet-sourced backfill from 50/51) and then drops
-- the old columns. The app only reads the canonical names as of this
-- change.
--
-- Run AFTER 50 and 51.
-- ============================================================

update weekly_metrics set reached_out = leads_reached_out
  where leads_reached_out is not null and leads_reached_out <> 0 and reached_out = 0;
update weekly_metrics set facebook_social = leads_facebook
  where leads_facebook is not null and leads_facebook <> 0 and facebook_social = 0;
update weekly_metrics set referral = leads_referral
  where leads_referral is not null and leads_referral <> 0 and referral = 0;
update weekly_metrics set website = leads_website
  where leads_website is not null and leads_website <> 0 and website = 0;
update weekly_metrics set phone_nextdoor_google = leads_phone_other
  where leads_phone_other is not null and leads_phone_other <> 0 and phone_nextdoor_google = 0;
update weekly_metrics set why_lost = estimates_why_lost
  where estimates_why_lost is not null and why_lost is null;
update weekly_metrics set contracts_confirmed = contracts_deposit_schedule_confirmed
  where contracts_deposit_schedule_confirmed is not null and contracts_confirmed is null;

alter table weekly_metrics drop column if exists leads_reached_out;
alter table weekly_metrics drop column if exists leads_facebook;
alter table weekly_metrics drop column if exists leads_referral;
alter table weekly_metrics drop column if exists leads_website;
alter table weekly_metrics drop column if exists leads_phone_other;
alter table weekly_metrics drop column if exists estimates_why_lost;
alter table weekly_metrics drop column if exists contracts_deposit_schedule_confirmed;

-- verify: should return zero rows (no leftover columns)
select column_name from information_schema.columns
where table_name = 'weekly_metrics'
  and column_name in ('leads_reached_out','leads_facebook','leads_referral','leads_website','leads_phone_other','estimates_why_lost','contracts_deposit_schedule_confirmed');
