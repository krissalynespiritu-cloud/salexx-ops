-- ============================================================
--  Salexx Ops Hub - reconcile every job to the Job Costing sheet
--  and match the sheet's two formulas
--
--  The Financial Performance Dashboard "Job Costing" tab is the source
--  of truth. This migration makes the database agree with it.
--
--  FORMULA CHANGES (job_financials):
--    1. revenue = contract_price + change_orders + discounts
--       (discounts stored negative, as the sheet enters them)
--    2. overhead_cost = total direct cost * overhead_pct/100
--       (a markup on cost, like the sheet, not a percent of revenue)
--
--  DATA CHANGES:
--    - overhead_pct = 18 on every job
--    - existing positive discounts flipped negative
--    - 83 jobs: contract / change orders / discounts set from the sheet,
--      Materials / Labor / Subcontractor cost rows replaced with the
--      sheet's figures
--    - 2 sheet-only jobs created: Robyn Bryant (SLX-165),
--      Angelina Rockelman patio cover (SLX-166)
--
--  NOT TOUCHED: SLX-143 "Jenni Bee" - the sheet "Jenni B" row is a
--  $90 stub that would wipe a real job.
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
-- Pure DML, no staging table. Each statement runs on its own and either
-- succeeds or throws a visible error.

-- 3a. revenue fields + overhead, straight from the sheet
update jobs j set
  contract_price = v.contract,
  change_orders  = v.co,
  discounts      = v.disc,
  overhead_pct   = 18.00
from (values
  ('SLX-001'::text, 248.54::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-002'::text, 40299.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-003'::text, 23073.87::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-004'::text, 25833.55::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-005'::text, 30664.88::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-006'::text, 8798.78::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-007'::text, 3575.69::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-008'::text, 35250.32::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-009'::text, 12598.78::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-010'::text, 92000.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-011'::text, 3398.78::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-012'::text, 29600.98::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-013'::text, 375.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-014'::text, 30250.65::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-015'::text, 21822.77::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-016'::text, 33060.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-017'::text, 27578.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-018'::text, 37370.88::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-019'::text, 3950.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-020'::text, 4707.06::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-021'::text, 20260.67::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-022'::text, 20450.56::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-023'::text, 2661.38::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-024'::text, 44869.82::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-026'::text, 11143.88::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-027'::text, 8440.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-031'::text, 26945.26::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-033'::text, 13381.25::numeric, 0.00::numeric, -278.69::numeric),
  ('SLX-034'::text, 4338.82::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-036'::text, 32395.43::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-037'::text, 46450.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-038'::text, 11393.70::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-040'::text, 6320.75::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-041'::text, 78341.10::numeric, 0.00::numeric, -119.90::numeric),
  ('SLX-042'::text, 17500.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-043'::text, 13496.12::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-046'::text, 12505.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-047'::text, 8415.90::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-048'::text, 34730.45::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-049'::text, 5897.32::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-050'::text, 8800.78::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-051'::text, 44375.99::numeric, 875.00::numeric, -353.83::numeric),
  ('SLX-052'::text, 5175.43::numeric, 0.00::numeric, -54.00::numeric),
  ('SLX-053'::text, 21723.74::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-054'::text, 11995.45::numeric, 2205.00::numeric, 0.00::numeric),
  ('SLX-055'::text, 3900.54::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-056'::text, 6075.31::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-057'::text, 20151.09::numeric, 0.00::numeric, -251.60::numeric),
  ('SLX-058'::text, 10450.65::numeric, 3375.00::numeric, 0.00::numeric),
  ('SLX-059'::text, 13375.25::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-060'::text, 20858.99::numeric, 0.00::numeric, -205.58::numeric),
  ('SLX-061'::text, 4075.54::numeric, 0.00::numeric, -40.00::numeric),
  ('SLX-062'::text, 17275.23::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-063'::text, 1265.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-065'::text, 8875.45::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-066'::text, 7500.65::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-067'::text, 8874.00::numeric, 200.00::numeric, 0.00::numeric),
  ('SLX-068'::text, 15000.00::numeric, 2620.00::numeric, -59.36::numeric),
  ('SLX-069'::text, 16810.56::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-070'::text, 4450.54::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-071'::text, 14625.56::numeric, 0.00::numeric, -120.22::numeric),
  ('SLX-072'::text, 10450.46::numeric, 0.00::numeric, -765.75::numeric),
  ('SLX-073'::text, 12885.34::numeric, 500.00::numeric, 0.00::numeric),
  ('SLX-074'::text, 40000.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-075'::text, 3295.54::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-076'::text, 4000.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-077'::text, 20415.66::numeric, 1700.00::numeric, -1409.87::numeric),
  ('SLX-080'::text, 8497.75::numeric, 11846.00::numeric, 0.00::numeric),
  ('SLX-082'::text, 14275.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-083'::text, 19521.04::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-084'::text, 32450.25::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-085'::text, 32754.67::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-123'::text, 31865.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-124'::text, 4997.00::numeric, 1375.00::numeric, 0.00::numeric),
  ('SLX-129'::text, 66100.00::numeric, 2405.00::numeric, 0.00::numeric),
  ('SLX-136'::text, 8293.11::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-144'::text, 13700.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-147'::text, 48000.00::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-148'::text, 19779.25::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-152'::text, 1497.54::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-154'::text, 8497.75::numeric, 925.00::numeric, 0.00::numeric),
  ('SLX-158'::text, 4165.45::numeric, 0.00::numeric, 0.00::numeric),
  ('SLX-161'::text, null::numeric, 0.00::numeric, 0.00::numeric)
) as v(job_id, contract, co, disc)
where v.job_id = j.job_id;

-- 3b. clear the cost rows we are about to replace
delete from job_costs c
using (values ('SLX-001'), ('SLX-002'), ('SLX-003'), ('SLX-004'), ('SLX-005'), ('SLX-006'), ('SLX-007'), ('SLX-008'), ('SLX-009'), ('SLX-010'), ('SLX-011'), ('SLX-012'), ('SLX-013'), ('SLX-014'), ('SLX-015'), ('SLX-016'), ('SLX-017'), ('SLX-018'), ('SLX-019'), ('SLX-020'), ('SLX-021'), ('SLX-022'), ('SLX-023'), ('SLX-024'), ('SLX-026'), ('SLX-027'), ('SLX-031'), ('SLX-033'), ('SLX-034'), ('SLX-036'), ('SLX-037'), ('SLX-038'), ('SLX-040'), ('SLX-041'), ('SLX-042'), ('SLX-043'), ('SLX-046'), ('SLX-047'), ('SLX-048'), ('SLX-049'), ('SLX-050'), ('SLX-051'), ('SLX-052'), ('SLX-053'), ('SLX-054'), ('SLX-055'), ('SLX-056'), ('SLX-057'), ('SLX-058'), ('SLX-059'), ('SLX-060'), ('SLX-061'), ('SLX-062'), ('SLX-063'), ('SLX-065'), ('SLX-066'), ('SLX-067'), ('SLX-068'), ('SLX-069'), ('SLX-070'), ('SLX-071'), ('SLX-072'), ('SLX-073'), ('SLX-074'), ('SLX-075'), ('SLX-076'), ('SLX-077'), ('SLX-080'), ('SLX-082'), ('SLX-083'), ('SLX-084'), ('SLX-085'), ('SLX-123'), ('SLX-124'), ('SLX-129'), ('SLX-136'), ('SLX-144'), ('SLX-147'), ('SLX-148'), ('SLX-152'), ('SLX-154'), ('SLX-158'), ('SLX-161')) as v(job_id)
where c.job_id = v.job_id
  and c.category in ('Materials','Labor','Subcontractors');

-- 3c. reinsert Materials / Labor / Subcontractor cost from the sheet
insert into job_costs (job_id, category, amount, notes)
select job_id, category, amount, 'Job Costing sheet'
from (values
  ('SLX-004'::text, 'Materials'::cost_category, 10630.98::numeric),
  ('SLX-005'::text, 'Materials'::cost_category, 7942.10::numeric),
  ('SLX-008'::text, 'Materials'::cost_category, 13870.60::numeric),
  ('SLX-009'::text, 'Materials'::cost_category, 4793.14::numeric),
  ('SLX-010'::text, 'Materials'::cost_category, 13670.40::numeric),
  ('SLX-011'::text, 'Materials'::cost_category, 74.36::numeric),
  ('SLX-012'::text, 'Materials'::cost_category, 4197.00::numeric),
  ('SLX-014'::text, 'Materials'::cost_category, 573.61::numeric),
  ('SLX-015'::text, 'Materials'::cost_category, 6380.44::numeric),
  ('SLX-016'::text, 'Materials'::cost_category, 1898.09::numeric),
  ('SLX-017'::text, 'Materials'::cost_category, 5388.64::numeric),
  ('SLX-018'::text, 'Materials'::cost_category, 2762.01::numeric),
  ('SLX-022'::text, 'Materials'::cost_category, 987.20::numeric),
  ('SLX-024'::text, 'Materials'::cost_category, 1203.55::numeric),
  ('SLX-026'::text, 'Materials'::cost_category, 1813.78::numeric),
  ('SLX-027'::text, 'Materials'::cost_category, 1702.47::numeric),
  ('SLX-031'::text, 'Materials'::cost_category, 7091.32::numeric),
  ('SLX-031'::text, 'Labor'::cost_category, 2672.50::numeric),
  ('SLX-033'::text, 'Labor'::cost_category, 3424.50::numeric),
  ('SLX-034'::text, 'Labor'::cost_category, 2601.00::numeric),
  ('SLX-036'::text, 'Materials'::cost_category, 6466.44::numeric),
  ('SLX-036'::text, 'Labor'::cost_category, 2855.00::numeric),
  ('SLX-037'::text, 'Materials'::cost_category, 949.07::numeric),
  ('SLX-038'::text, 'Materials'::cost_category, 555.11::numeric),
  ('SLX-038'::text, 'Labor'::cost_category, 730.00::numeric),
  ('SLX-040'::text, 'Materials'::cost_category, 398.64::numeric),
  ('SLX-040'::text, 'Labor'::cost_category, 1114.67::numeric),
  ('SLX-041'::text, 'Materials'::cost_category, 10713.50::numeric),
  ('SLX-041'::text, 'Labor'::cost_category, 14388.00::numeric),
  ('SLX-042'::text, 'Materials'::cost_category, 6607.07::numeric),
  ('SLX-042'::text, 'Labor'::cost_category, 973.00::numeric),
  ('SLX-046'::text, 'Materials'::cost_category, 1657.49::numeric),
  ('SLX-046'::text, 'Labor'::cost_category, 3843.50::numeric),
  ('SLX-048'::text, 'Materials'::cost_category, 4301.67::numeric),
  ('SLX-048'::text, 'Labor'::cost_category, 4209.00::numeric),
  ('SLX-049'::text, 'Labor'::cost_category, 595.25::numeric),
  ('SLX-050'::text, 'Materials'::cost_category, 1361.39::numeric),
  ('SLX-051'::text, 'Materials'::cost_category, 2457.65::numeric),
  ('SLX-051'::text, 'Labor'::cost_category, 10235.00::numeric),
  ('SLX-052'::text, 'Materials'::cost_category, 756.54::numeric),
  ('SLX-052'::text, 'Labor'::cost_category, 504.00::numeric),
  ('SLX-053'::text, 'Labor'::cost_category, 3500.00::numeric),
  ('SLX-054'::text, 'Materials'::cost_category, 384.39::numeric),
  ('SLX-054'::text, 'Labor'::cost_category, 2996.00::numeric),
  ('SLX-056'::text, 'Materials'::cost_category, 1112.00::numeric),
  ('SLX-056'::text, 'Labor'::cost_category, 572.00::numeric),
  ('SLX-057'::text, 'Materials'::cost_category, 4058.58::numeric),
  ('SLX-057'::text, 'Labor'::cost_category, 4733.50::numeric),
  ('SLX-058'::text, 'Materials'::cost_category, 6123.49::numeric),
  ('SLX-059'::text, 'Labor'::cost_category, 2089.50::numeric),
  ('SLX-060'::text, 'Materials'::cost_category, 735.58::numeric),
  ('SLX-060'::text, 'Labor'::cost_category, 1607.00::numeric),
  ('SLX-061'::text, 'Materials'::cost_category, 979.22::numeric),
  ('SLX-061'::text, 'Labor'::cost_category, 1221.50::numeric),
  ('SLX-062'::text, 'Materials'::cost_category, 7541.94::numeric),
  ('SLX-062'::text, 'Labor'::cost_category, 3087.00::numeric),
  ('SLX-063'::text, 'Labor'::cost_category, 280.00::numeric),
  ('SLX-065'::text, 'Labor'::cost_category, 2747.50::numeric),
  ('SLX-067'::text, 'Materials'::cost_category, 3343.08::numeric),
  ('SLX-067'::text, 'Labor'::cost_category, 1242.00::numeric),
  ('SLX-068'::text, 'Materials'::cost_category, 732.69::numeric),
  ('SLX-068'::text, 'Labor'::cost_category, 3276.00::numeric),
  ('SLX-069'::text, 'Labor'::cost_category, 3418.00::numeric),
  ('SLX-070'::text, 'Labor'::cost_category, 560.00::numeric),
  ('SLX-071'::text, 'Labor'::cost_category, 1675.25::numeric),
  ('SLX-072'::text, 'Materials'::cost_category, 11371.70::numeric),
  ('SLX-072'::text, 'Labor'::cost_category, 1620.00::numeric),
  ('SLX-073'::text, 'Labor'::cost_category, 2029.00::numeric),
  ('SLX-074'::text, 'Labor'::cost_category, 7994.00::numeric),
  ('SLX-075'::text, 'Labor'::cost_category, 560.00::numeric),
  ('SLX-076'::text, 'Labor'::cost_category, 845.50::numeric),
  ('SLX-077'::text, 'Materials'::cost_category, 10321.20::numeric),
  ('SLX-077'::text, 'Labor'::cost_category, 7130.50::numeric),
  ('SLX-080'::text, 'Materials'::cost_category, 346.08::numeric),
  ('SLX-080'::text, 'Labor'::cost_category, 908.50::numeric),
  ('SLX-082'::text, 'Materials'::cost_category, 364.97::numeric),
  ('SLX-082'::text, 'Labor'::cost_category, 875.50::numeric),
  ('SLX-084'::text, 'Materials'::cost_category, 317.50::numeric),
  ('SLX-085'::text, 'Materials'::cost_category, 3637.49::numeric),
  ('SLX-123'::text, 'Materials'::cost_category, 408.22::numeric),
  ('SLX-124'::text, 'Materials'::cost_category, 1507.50::numeric),
  ('SLX-129'::text, 'Materials'::cost_category, 10860.00::numeric),
  ('SLX-129'::text, 'Labor'::cost_category, 18314.00::numeric),
  ('SLX-136'::text, 'Labor'::cost_category, 189.00::numeric),
  ('SLX-144'::text, 'Labor'::cost_category, 399.00::numeric),
  ('SLX-147'::text, 'Materials'::cost_category, 12357.50::numeric),
  ('SLX-147'::text, 'Labor'::cost_category, 7698.23::numeric),
  ('SLX-154'::text, 'Labor'::cost_category, 1121.00::numeric),
  ('SLX-158'::text, 'Labor'::cost_category, 811.00::numeric),
  ('SLX-161'::text, 'Materials'::cost_category, 1121.65::numeric),
  ('SLX-161'::text, 'Labor'::cost_category, 4150.50::numeric)
) as v(job_id, category, amount);


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


-- ---------- verify (runs as the final statement) ----------
select
  (select count(*) from jobs where job_id in ('SLX-165','SLX-166'))   as new_jobs_expect_2,
  (select material_cost from job_margins where job_id = 'SLX-005')    as kolene_materials_expect_7942_10,
  (select revenue from job_margins where job_id = 'SLX-052')          as elda_revenue_expect_5121_43,
  case when (select count(*) from jobs where job_id in ('SLX-165','SLX-166')) = 2
    and (select material_cost from job_margins where job_id = 'SLX-005') = 7942.10
    and (select revenue from job_margins where job_id = 'SLX-052') = 5121.43
  then 'PASS'
  else 'FAIL - send this row to Claude'
  end as result;
