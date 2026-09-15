-- ============================================================
-- 51_drop_duplicate_weekly_fields.sql
--
-- Cleanup only. `weekly_metrics` ended up with two short-named
-- columns (why_lost, contracts_confirmed) that duplicate the two
-- migration 50 added under their full names (estimates_why_lost,
-- contracts_deposit_schedule_confirmed) and back the app's Weekly
-- Meeting page. Confirmed empty on every row before writing this.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table weekly_metrics drop column if exists why_lost;
alter table weekly_metrics drop column if exists contracts_confirmed;
