-- ============================================================
-- 43_overhead_rebuild_2026.sql
--
-- The Overhead page was wrong two ways:
--
--   1. TRIPLED ROWS. 04_phase2.sql seeds overhead_expenses with no
--      unique key, so the list got inserted three times (108 rows for
--      36 real items). overhead_summary / overhead_rate_check were
--      inflated ~3x -> the app showed ~$1.41M/yr of overhead instead
--      of ~$0.47M. Migration 35 was written to fix this but never run.
--
--   2. STALE VALUES. Even de-duplicated, the seed figures no longer
--      match the OH Tracker 2026 sheet (Bookkeeping 2,880 vs 4,620,
--      Warehouse 38,400 vs 31,996.68, Luke 36,000 missing, etc.).
--
-- This wipes overhead_expenses and rebuilds it from the OH Tracker
-- 2026 sheet: 36 line items, $472,743.09 / yr total. It also adds the
-- unique (item, category) key so a future re-run of 04 can't re-triple.
--
-- Payroll rows are flagged in_job_rate = false: payroll is charged to
-- jobs at the hourly crew rate, so counting it in the overhead % too
-- would double-charge every job.
--
-- Note on the sheet itself: its page-3 "Category Summary" total
-- ($404,566.41) is under the real total by $68,176.68 because it never
-- picked up Loom ($180), Luke ($36,000) and Warehouse ($31,996.68)
-- from the second page of the item list. The correct annual overhead
-- is $472,743.09 -- this migration uses that.
--
-- HOW TO RUN: select the whole file (Cmd/Ctrl+A) before pressing Run,
-- so every statement executes in order. It runs as one transaction --
-- if any line fails, nothing changes. Safe to re-run.
-- ============================================================

begin;

-- 1. wipe the table (this is what holds the tripled + stale rows).
--    truncate rather than delete so nothing can be left behind.
truncate table overhead_expenses;

-- 2. table is empty now, so the unique key adds cleanly. It makes
--    every future re-run of 04_phase2 (and this file) idempotent.
alter table overhead_expenses
  drop constraint if exists overhead_expenses_item_category_key;
alter table overhead_expenses
  add constraint overhead_expenses_item_category_key unique (item, category);

-- 3. rebuild from the OH Tracker 2026 sheet (36 line items)
insert into overhead_expenses (item, category, yearly_cost, in_job_rate) values
  ('Bookkeeping + payroll (Jts & Diaz)','Accounting & Compliance',4620.00,true),
  ('CCB (charged every 2 yrs)','Accounting & Compliance',200.00,true),
  ('Lead cert','Accounting & Compliance',50.00,true),
  ('Sec of State (yearly)','Accounting & Compliance',100.00,true),
  ('Geico insurance','Insurance',10800.00,true),
  ('Liability insurance (yearly)','Insurance',4432.00,true),
  ('Marketing FB ADS','Marketing & Advertising',36000.00,true),
  ('Marketing managing fee','Marketing & Advertising',18000.00,true),
  ('St Peter Advertising','Marketing & Advertising',1000.00,true),
  ('Computer paper, ink, WiFi','Office & Utilities',600.00,true),
  ('BV','Software & Subscriptions',1740.00,true),
  ('Company Cam','Software & Subscriptions',853.00,true),
  ('Domain Privacy + Protection','Software & Subscriptions',14.95,true),
  ('Domain','Software & Subscriptions',24.19,true),
  ('Estimating software, Zapier + 1 employee','Software & Subscriptions',620.00,true),
  ('Go High Level','Software & Subscriptions',2200.00,true),
  ('Google Workspace','Software & Subscriptions',168.00,true),
  ('Monday.com','Software & Subscriptions',720.00,true),
  ('musimack Website hosting','Software & Subscriptions',348.00,true),
  ('Tracki','Software & Subscriptions',336.00,true),
  ('Zapier automation','Software & Subscriptions',240.00,true),
  ('Loom','Software & Subscriptions',180.00,true),
  ('Verizon','Telecommunications',5760.00,true),
  ('7x14 trailer (paid)','Fleet & Vehicle Costs',1500.00,true),
  ('Truck 1 Land Rover (finance)','Fleet & Vehicle Costs',12732.00,true),
  ('Chevy van 2 2025 (finance)','Fleet & Vehicle Costs',6428.57,true),
  ('Truck 3 black 2025','Fleet & Vehicle Costs',10209.70,true),
  ('Truck 4 white ram 2025','Fleet & Vehicle Costs',10920.00,true),
  ('truck 5 ram 1500 Finance','Fleet & Vehicle Costs',5280.00,true),
  ('AS','Payroll',150000.00,false),
  ('Marketing asst','Payroll',17550.00,false),
  ('Office Payroll/Admin','Payroll',43680.00,false),
  ('Marketing astt','Payroll',47840.00,false),
  ('Luke','Payroll',36000.00,false),
  ('Learning','Training & Education',9600.00,true),
  ('Warehouse','Facilities & Property',31996.68,true);

commit;

-- 4. verify -- expect: 36 items, $472,743.09 total, check_total = PASS
select
  (select count(*) from overhead_expenses)                              as line_items,
  (select to_char(sum(yearly_cost),'FM999,999,990.00') from overhead_expenses)
                                                                        as total_yearly,
  (select to_char(sum(yearly_cost),'FM999,999,990.00') from overhead_expenses
     where in_job_rate)                                                 as chargeable_yearly,
  (select to_char(sum(yearly_cost),'FM999,999,990.00') from overhead_expenses
     where not in_job_rate)                                             as payroll_yearly,
  (select suggested_overhead_pct from overhead_rate_check)              as suggested_pct,
  case when (select round(sum(yearly_cost),2) from overhead_expenses) = 472743.09
       then 'PASS' else 'FAIL' end                                      as check_total;

select category,
  to_char(sum(yearly_cost),'FM999,999,990.00')             as yearly,
  to_char(round(sum(yearly_cost)/12,2),'FM999,999,990.00') as monthly
from overhead_expenses
group by category
order by sum(yearly_cost) desc;
