-- ============================================================
--  Salexx Ops Hub — reconcile every job to the Job Costing sheet
--  and match the sheet's two formulas
--
--  Kris's Financial Performance Dashboard "Job Costing" tab is the
--  source of truth. This migration makes the database agree with it.
--
--  FORMULA CHANGES (job_financials):
--    1. revenue = contract_price + change_orders + discounts
--       Discounts are stored AS ENTERED — a negative number reduces
--       revenue, matching the sheet's "Discounts/Credits (NEG)" column.
--    2. overhead_cost = total direct cost * overhead_pct/100
--       Overhead is a markup on cost, like the sheet — not a percent
--       of revenue.
--
--  DATA CHANGES:
--    - overhead_pct = 18 on every job
--    - existing positive discounts flipped to negative
--    - 83 jobs: contract_price / change_orders / discounts set from the
--      sheet; Materials / Labor / Subcontractors cost rows replaced with
--      the sheet's figures (Equipment, disposal, permits, fuel, misc
--      are left untouched)
--    - 2 sheet-only jobs created: Robyn Bryant (SLX-165),
--      Angelina Rockelman patio cover (SLX-166)
--
--  NOT TOUCHED: SLX-143 "Jenni Bee" — the sheet's "Jenni B" row is a
--  $90 stub that would wipe a real job. Reconcile it by hand.
--
--  Uses a real staging table (costing_recon), same pattern as 27 —
--  an earlier version used a temp table and the reconcile step was
--  silently skipped in the Supabase SQL editor.
--
--  Run AFTER 29. Safe to re-run. Supersedes 28.
-- ============================================================


-- ---------- 1. formula fix: job_financials ----------
create or replace view job_financials as
with hrs as (
  select job_id, sum(hours) as hours, sum(labor_cost) as labor_cost
  from time_entry_costs
  where kind = 'Job' and job_id is not null
  group by job_id
),
jc as (
  select job_id,
    sum(amount) filter (where category in ('Materials','Equipment / Rentals'))
                                                          as direct_materials,
    sum(amount) filter (where category = 'Labor')          as labor_direct,
    sum(amount) filter (where category = 'Subcontractors') as sub_direct,
    sum(amount) filter (where category not in
      ('Materials','Subcontractors','Equipment / Rentals','Labor'))
                                                          as additional_costs,
    count(*) as cost_rows
  from job_costs group by job_id
),
sp as (
  select job_id, sum(contract_amount) as sub_total
  from sub_payments
  where job_id is not null
  group by job_id
),
base as (
  select
    j.job_id, j.client_name, j.address_city, j.job_type, j.stage, j.crew,
    j.sold_date, j.completed_date, j.lead_source, j.drive_folder_url,
    j.contract_price, j.change_orders, j.discounts, j.overhead_pct, j.manual_hours,
    coalesce(nullif(coalesce(hrs.hours, 0), 0), j.manual_hours, 0)   as hours,
    case when coalesce(hrs.hours, 0) > 0 then coalesce(hrs.labor_cost, 0)
         else coalesce(jc.labor_direct, 0) end                       as labor_cost,
    coalesce(jc.direct_materials, 0)
      + coalesce(jc.sub_direct, 0)
      + coalesce(sp.sub_total, 0)                                    as material_cost,
    coalesce(jc.additional_costs, 0)                                 as additional_cost,
    coalesce(jc.cost_rows, 0)                                        as cost_rows,
    coalesce(sp.sub_total, 0)                                        as sub_total
  from jobs j
  left join hrs on hrs.job_id = j.job_id
  left join jc  on jc.job_id  = j.job_id
  left join sp  on sp.job_id  = j.job_id
)
select
  b.job_id, b.client_name, b.address_city, b.job_type, b.stage, b.crew,
  b.sold_date, b.completed_date, b.lead_source, b.drive_folder_url,
  b.hours, b.labor_cost, b.material_cost, b.additional_cost,
  case when b.contract_price is null then null
       else b.contract_price + b.change_orders + b.discounts end     as revenue,
  round((b.labor_cost + b.material_cost + b.additional_cost)
        * (b.overhead_pct / 100), 2)                                 as overhead_cost,
  (b.contract_price is not null
    and b.hours = 0
    and coalesce(b.manual_hours, 0) = 0
    and b.cost_rows = 0
    and b.sub_total = 0)                                             as unpriced
from base b;


-- ---------- 2. overhead 18% everywhere, discounts normalised negative ----------
update jobs set overhead_pct = 18.00 where overhead_pct is distinct from 18.00;
update jobs set discounts = -abs(discounts) where discounts > 0;


-- ---------- 3. reconcile matched jobs to the sheet ----------
create table if not exists costing_recon (
  job_id   text primary key,
  contract numeric(12,2),
  co       numeric(12,2) not null default 0,
  disc     numeric(12,2) not null default 0,
  materials numeric(12,2) not null default 0,
  labor    numeric(12,2) not null default 0,
  subs     numeric(12,2) not null default 0
);
truncate costing_recon;

insert into costing_recon (job_id, contract, co, disc, materials, labor, subs) values
  ('SLX-001', 248.54, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-002', 40299.00, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-003', 23073.87, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-004', 25833.55, 0.00, 0.00, 10630.98, 0.00, 0.00),
  ('SLX-005', 30664.88, 0.00, 0.00, 7942.10, 0.00, 0.00),
  ('SLX-006', 8798.78, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-007', 3575.69, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-008', 35250.32, 0.00, 0.00, 13870.60, 0.00, 0.00),
  ('SLX-009', 12598.78, 0.00, 0.00, 4793.14, 0.00, 0.00),
  ('SLX-010', 92000.00, 0.00, 0.00, 13670.40, 0.00, 0.00),
  ('SLX-011', 3398.78, 0.00, 0.00, 74.36, 0.00, 0.00),
  ('SLX-012', 29600.98, 0.00, 0.00, 4197.00, 0.00, 0.00),
  ('SLX-013', 375.00, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-014', 30250.65, 0.00, 0.00, 573.61, 0.00, 0.00),
  ('SLX-015', 21822.77, 0.00, 0.00, 6380.44, 0.00, 0.00),
  ('SLX-016', 33060.00, 0.00, 0.00, 1898.09, 0.00, 0.00),
  ('SLX-017', 27578.00, 0.00, 0.00, 5388.64, 0.00, 0.00),
  ('SLX-018', 37370.88, 0.00, 0.00, 2762.01, 0.00, 0.00),
  ('SLX-019', 3950.00, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-020', 4707.06, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-021', 20260.67, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-022', 20450.56, 0.00, 0.00, 987.20, 0.00, 0.00),
  ('SLX-023', 2661.38, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-024', 44869.82, 0.00, 0.00, 1203.55, 0.00, 0.00),
  ('SLX-026', 11143.88, 0.00, 0.00, 1813.78, 0.00, 0.00),
  ('SLX-027', 8440.00, 0.00, 0.00, 1702.47, 0.00, 0.00),
  ('SLX-031', 26945.26, 0.00, 0.00, 7091.32, 2672.50, 0.00),
  ('SLX-033', 13381.25, 0.00, -278.69, 0.00, 3424.50, 0.00),
  ('SLX-034', 4338.82, 0.00, 0.00, 0.00, 2601.00, 0.00),
  ('SLX-036', 32395.43, 0.00, 0.00, 6466.44, 2855.00, 0.00),
  ('SLX-037', 46450.00, 0.00, 0.00, 949.07, 0.00, 0.00),
  ('SLX-038', 11393.70, 0.00, 0.00, 555.11, 730.00, 0.00),
  ('SLX-040', 6320.75, 0.00, 0.00, 398.64, 1114.67, 0.00),
  ('SLX-041', 78341.10, 0.00, -119.90, 10713.50, 14388.00, 0.00),
  ('SLX-042', 17500.00, 0.00, 0.00, 6607.07, 973.00, 0.00),
  ('SLX-043', 13496.12, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-046', 12505.00, 0.00, 0.00, 1657.49, 3843.50, 0.00),
  ('SLX-047', 8415.90, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-048', 34730.45, 0.00, 0.00, 4301.67, 4209.00, 0.00),
  ('SLX-049', 5897.32, 0.00, 0.00, 0.00, 595.25, 0.00),
  ('SLX-050', 8800.78, 0.00, 0.00, 1361.39, 0.00, 0.00),
  ('SLX-051', 44375.99, 875.00, -353.83, 2457.65, 10235.00, 0.00),
  ('SLX-052', 5175.43, 0.00, -54.00, 756.54, 504.00, 0.00),
  ('SLX-053', 21723.74, 0.00, 0.00, 0.00, 3500.00, 0.00),
  ('SLX-054', 11995.45, 2205.00, 0.00, 384.39, 2996.00, 0.00),
  ('SLX-055', 3900.54, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-056', 6075.31, 0.00, 0.00, 1112.00, 572.00, 0.00),
  ('SLX-057', 20151.09, 0.00, -251.60, 4058.58, 4733.50, 0.00),
  ('SLX-058', 10450.65, 3375.00, 0.00, 6123.49, 0.00, 0.00),
  ('SLX-059', 13375.25, 0.00, 0.00, 0.00, 2089.50, 0.00),
  ('SLX-060', 20858.99, 0.00, -205.58, 735.58, 1607.00, 0.00),
  ('SLX-061', 4075.54, 0.00, -40.00, 979.22, 1221.50, 0.00),
  ('SLX-062', 17275.23, 0.00, 0.00, 7541.94, 3087.00, 0.00),
  ('SLX-063', 1265.00, 0.00, 0.00, 0.00, 280.00, 0.00),
  ('SLX-065', 8875.45, 0.00, 0.00, 0.00, 2747.50, 0.00),
  ('SLX-066', 7500.65, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-067', 8874.00, 200.00, 0.00, 3343.08, 1242.00, 0.00),
  ('SLX-068', 15000.00, 2620.00, -59.36, 732.69, 3276.00, 0.00),
  ('SLX-069', 16810.56, 0.00, 0.00, 0.00, 3418.00, 0.00),
  ('SLX-070', 4450.54, 0.00, 0.00, 0.00, 560.00, 0.00),
  ('SLX-071', 14625.56, 0.00, -120.22, 0.00, 1675.25, 0.00),
  ('SLX-072', 10450.46, 0.00, -765.75, 11371.70, 1620.00, 0.00),
  ('SLX-073', 12885.34, 500.00, 0.00, 0.00, 2029.00, 0.00),
  ('SLX-074', 40000.00, 0.00, 0.00, 0.00, 7994.00, 0.00),
  ('SLX-075', 3295.54, 0.00, 0.00, 0.00, 560.00, 0.00),
  ('SLX-076', 4000.00, 0.00, 0.00, 0.00, 845.50, 0.00),
  ('SLX-077', 20415.66, 1700.00, -1409.87, 10321.20, 7130.50, 0.00),
  ('SLX-080', 8497.75, 11846.00, 0.00, 346.08, 908.50, 0.00),
  ('SLX-082', 14275.00, 0.00, 0.00, 364.97, 875.50, 0.00),
  ('SLX-083', 19521.04, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-084', 32450.25, 0.00, 0.00, 317.50, 0.00, 0.00),
  ('SLX-085', 32754.67, 0.00, 0.00, 3637.49, 0.00, 0.00),
  ('SLX-123', 31865.00, 0.00, 0.00, 408.22, 0.00, 0.00),
  ('SLX-124', 4997.00, 1375.00, 0.00, 1507.50, 0.00, 0.00),
  ('SLX-129', 66100.00, 2405.00, 0.00, 10860.00, 18314.00, 0.00),
  ('SLX-136', 8293.11, 0.00, 0.00, 0.00, 189.00, 0.00),
  ('SLX-144', 13700.00, 0.00, 0.00, 0.00, 399.00, 0.00),
  ('SLX-147', 48000.00, 0.00, 0.00, 12357.50, 7698.23, 0.00),
  ('SLX-148', 19779.25, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-152', 1497.54, 0.00, 0.00, 0.00, 0.00, 0.00),
  ('SLX-154', 8497.75, 925.00, 0.00, 0.00, 1121.00, 0.00),
  ('SLX-158', 4165.45, 0.00, 0.00, 0.00, 811.00, 0.00),
  ('SLX-161', null, 0.00, 0.00, 1121.65, 4150.50, 0.00);


update jobs j set
  contract_price = r.contract,
  change_orders  = r.co,
  discounts      = r.disc,
  overhead_pct   = 18.00
from costing_recon r
where r.job_id = j.job_id;

delete from job_costs c
using costing_recon r
where c.job_id = r.job_id
  and c.category in ('Materials','Labor','Subcontractors');

insert into job_costs (job_id, category, amount, notes)
select job_id, 'Materials'::cost_category, materials, 'Job Costing sheet'
  from costing_recon where materials > 0
union all
select job_id, 'Labor'::cost_category, labor, 'Job Costing sheet'
  from costing_recon where labor > 0
union all
select job_id, 'Subcontractors'::cost_category, subs, 'Job Costing sheet'
  from costing_recon where subs > 0;


-- ---------- 4. two jobs that were only on the sheet ----------
delete from job_costs where job_id in ('SLX-165', 'SLX-166');

insert into jobs (job_id, client_name, job_type, stage, contract_price, change_orders, discounts, overhead_pct)
values ('SLX-165', 'Robyn Bryant', 'Painting', 'Completed', null, 3310.00, -129.99, 18.00)
on conflict (job_id) do nothing;
insert into job_costs (job_id, category, amount, notes) values
  ('SLX-165', 'Materials', 5238.43, 'Job Costing sheet'),
  ('SLX-165', 'Labor', 730.50, 'Job Costing sheet');

insert into jobs (job_id, client_name, address_city, job_type, stage, contract_price, change_orders, discounts, overhead_pct)
values ('SLX-166', 'Angelina Rockelman', '2238 SE Thrush Avenue Hillsboro OR 97123', 'patio cover', 'Designs Sold', 5365.45, 0.00, -62.00, 18.00)
on conflict (job_id) do nothing;
insert into job_costs (job_id, category, amount, notes) values
  ('SLX-166', 'Materials', 684.88, 'Job Costing sheet');


-- ---------- verify ----------
--   select job_id, client_name, revenue, total_job_cost, margin_pct
--   from job_margins order by margin_pct nulls last;
-- SLX-143 (Jenni Bee) skipped on purpose — reconcile by hand.
