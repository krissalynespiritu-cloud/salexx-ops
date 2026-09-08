-- ============================================================
-- 35_dedupe_overhead.sql
--
-- 04_phase2.sql seeds overhead_expenses with `on conflict do nothing`
-- but there was no unique key, so every re-run inserted the whole list
-- again. The table currently holds roughly 3x the real line items and
-- overhead_summary / overhead_rate_check are inflated to match.
--
-- This keeps one row per (item, category) and adds the unique key so
-- future re-runs of 04 are genuinely idempotent.
--
-- Run any time. Safe to re-run.
-- ============================================================

delete from overhead_expenses
where ctid not in (
  select min(ctid) from overhead_expenses group by item, category
);

alter table overhead_expenses
  drop constraint if exists overhead_expenses_item_category_key;
alter table overhead_expenses
  add constraint overhead_expenses_item_category_key unique (item, category);

-- verify: should be about 37 rows and one clean category summary
select
  (select count(*) from overhead_expenses)                       as line_items,
  (select round(sum(yearly_cost)) from overhead_expenses
     where active and in_job_rate)                                as chargeable_yearly,
  (select suggested_overhead_pct from overhead_rate_check)        as suggested_pct;
