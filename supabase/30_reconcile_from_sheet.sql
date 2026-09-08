-- ============================================================
--  Salexx Ops Hub - reconcile every job to the Job Costing sheet
--
--  Every statement below is standalone. If the paste into the SQL
--  editor gets mangled again, the error will name the exact job_id
--  so we know where. Run AFTER 29. Safe to re-run.
-- ============================================================

-- 1. formula fix: revenue adds discounts (stored negative),
--    overhead is a markup on cost not on revenue
create or replace view job_financials as
with hrs as (
  select job_id, sum(hours) as hours, sum(labor_cost) as labor_cost
  from time_entry_costs
  where kind = 'Job' and job_id is not null
  group by job_id
),
jc as (
  select job_id,
    sum(amount) filter (where category in ('Materials','Equipment / Rentals')) as direct_materials,
    sum(amount) filter (where category = 'Labor') as labor_direct,
    sum(amount) filter (where category = 'Subcontractors') as sub_direct,
    sum(amount) filter (where category not in ('Materials','Subcontractors','Equipment / Rentals','Labor')) as additional_costs,
    count(*) as cost_rows
  from job_costs
  group by job_id
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
    coalesce(nullif(coalesce(hrs.hours, 0), 0), j.manual_hours, 0) as hours,
    case when coalesce(hrs.hours, 0) > 0 then coalesce(hrs.labor_cost, 0) else coalesce(jc.labor_direct, 0) end as labor_cost,
    coalesce(jc.direct_materials, 0) + coalesce(jc.sub_direct, 0) + coalesce(sp.sub_total, 0) as material_cost,
    coalesce(jc.additional_costs, 0) as additional_cost,
    coalesce(jc.cost_rows, 0) as cost_rows,
    coalesce(sp.sub_total, 0) as sub_total
  from jobs j
  left join hrs on hrs.job_id = j.job_id
  left join jc on jc.job_id = j.job_id
  left join sp on sp.job_id = j.job_id
)
select
  base.job_id, base.client_name, base.address_city, base.job_type, base.stage, base.crew,
  base.sold_date, base.completed_date, base.lead_source, base.drive_folder_url,
  base.hours, base.labor_cost, base.material_cost, base.additional_cost,
  case when base.contract_price is null then null else base.contract_price + base.change_orders + base.discounts end as revenue,
  round((base.labor_cost + base.material_cost + base.additional_cost) * (base.overhead_pct / 100), 2) as overhead_cost,
  (base.contract_price is not null and base.hours = 0 and coalesce(base.manual_hours, 0) = 0 and base.cost_rows = 0 and base.sub_total = 0) as unpriced
from base;

-- 2. overhead 18% everywhere, discounts normalised negative
update jobs set overhead_pct = 18 where overhead_pct is distinct from 18;
update jobs set discounts = -abs(discounts) where discounts > 0;

-- 3. per-job reconcile from the sheet (one statement each)
update jobs set contract_price = 248.54, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-001';
update jobs set contract_price = 40299, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-002';
update jobs set contract_price = 23073.87, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-003';
update jobs set contract_price = 25833.55, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-004';
update jobs set contract_price = 30664.88, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-005';
update jobs set contract_price = 8798.78, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-006';
update jobs set contract_price = 3575.69, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-007';
update jobs set contract_price = 35250.32, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-008';
update jobs set contract_price = 12598.78, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-009';
update jobs set contract_price = 92000, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-010';
update jobs set contract_price = 3398.78, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-011';
update jobs set contract_price = 29600.98, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-012';
update jobs set contract_price = 375, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-013';
update jobs set contract_price = 30250.65, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-014';
update jobs set contract_price = 21822.77, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-015';
update jobs set contract_price = 33060, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-016';
update jobs set contract_price = 27578, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-017';
update jobs set contract_price = 37370.88, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-018';
update jobs set contract_price = 3950, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-019';
update jobs set contract_price = 4707.06, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-020';
update jobs set contract_price = 20260.67, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-021';
update jobs set contract_price = 20450.56, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-022';
update jobs set contract_price = 2661.38, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-023';
update jobs set contract_price = 44869.82, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-024';
update jobs set contract_price = 11143.88, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-026';
update jobs set contract_price = 8440, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-027';
update jobs set contract_price = 26945.26, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-031';
update jobs set contract_price = 13381.25, change_orders = 0, discounts = -278.69, overhead_pct = 18 where job_id = 'SLX-033';
update jobs set contract_price = 4338.82, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-034';
update jobs set contract_price = 32395.43, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-036';
update jobs set contract_price = 46450, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-037';
update jobs set contract_price = 11393.7, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-038';
update jobs set contract_price = 6320.75, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-040';
update jobs set contract_price = 78341.1, change_orders = 0, discounts = -119.9, overhead_pct = 18 where job_id = 'SLX-041';
update jobs set contract_price = 17500, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-042';
update jobs set contract_price = 13496.12, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-043';
update jobs set contract_price = 12505, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-046';
update jobs set contract_price = 8415.9, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-047';
update jobs set contract_price = 34730.45, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-048';
update jobs set contract_price = 5897.32, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-049';
update jobs set contract_price = 8800.78, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-050';
update jobs set contract_price = 44375.99, change_orders = 875, discounts = -353.83, overhead_pct = 18 where job_id = 'SLX-051';
update jobs set contract_price = 5175.43, change_orders = 0, discounts = -54, overhead_pct = 18 where job_id = 'SLX-052';
update jobs set contract_price = 21723.74, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-053';
update jobs set contract_price = 11995.45, change_orders = 2205, discounts = 0, overhead_pct = 18 where job_id = 'SLX-054';
update jobs set contract_price = 3900.54, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-055';
update jobs set contract_price = 6075.31, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-056';
update jobs set contract_price = 20151.09, change_orders = 0, discounts = -251.6, overhead_pct = 18 where job_id = 'SLX-057';
update jobs set contract_price = 10450.65, change_orders = 3375, discounts = 0, overhead_pct = 18 where job_id = 'SLX-058';
update jobs set contract_price = 13375.25, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-059';
update jobs set contract_price = 20858.99, change_orders = 0, discounts = -205.58, overhead_pct = 18 where job_id = 'SLX-060';
update jobs set contract_price = 4075.54, change_orders = 0, discounts = -40, overhead_pct = 18 where job_id = 'SLX-061';
update jobs set contract_price = 17275.23, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-062';
update jobs set contract_price = 1265, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-063';
update jobs set contract_price = 8875.45, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-065';
update jobs set contract_price = 7500.65, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-066';
update jobs set contract_price = 8874, change_orders = 200, discounts = 0, overhead_pct = 18 where job_id = 'SLX-067';
update jobs set contract_price = 15000, change_orders = 2620, discounts = -59.36, overhead_pct = 18 where job_id = 'SLX-068';
update jobs set contract_price = 16810.56, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-069';
update jobs set contract_price = 4450.54, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-070';
update jobs set contract_price = 14625.56, change_orders = 0, discounts = -120.22, overhead_pct = 18 where job_id = 'SLX-071';
update jobs set contract_price = 10450.46, change_orders = 0, discounts = -765.75, overhead_pct = 18 where job_id = 'SLX-072';
update jobs set contract_price = 12885.34, change_orders = 500, discounts = 0, overhead_pct = 18 where job_id = 'SLX-073';
update jobs set contract_price = 40000, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-074';
update jobs set contract_price = 3295.54, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-075';
update jobs set contract_price = 4000, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-076';
update jobs set contract_price = 20415.66, change_orders = 1700, discounts = -1409.87, overhead_pct = 18 where job_id = 'SLX-077';
update jobs set contract_price = 8497.75, change_orders = 11846, discounts = 0, overhead_pct = 18 where job_id = 'SLX-080';
update jobs set contract_price = 14275, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-082';
update jobs set contract_price = 19521.04, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-083';
update jobs set contract_price = 32450.25, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-084';
update jobs set contract_price = 32754.67, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-085';
update jobs set contract_price = 31865, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-123';
update jobs set contract_price = 4997, change_orders = 1375, discounts = 0, overhead_pct = 18 where job_id = 'SLX-124';
update jobs set contract_price = 66100, change_orders = 2405, discounts = 0, overhead_pct = 18 where job_id = 'SLX-129';
update jobs set contract_price = 8293.11, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-136';
update jobs set contract_price = 13700, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-144';
update jobs set contract_price = 48000, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-147';
update jobs set contract_price = 19779.25, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-148';
update jobs set contract_price = 1497.54, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-152';
update jobs set contract_price = 8497.75, change_orders = 925, discounts = 0, overhead_pct = 18 where job_id = 'SLX-154';
update jobs set contract_price = 4165.45, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-158';
update jobs set contract_price = null, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-161';

-- 4. replace Materials / Labor / Sub cost rows, one job at a time
delete from job_costs where job_id = 'SLX-001' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-002' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-003' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-004' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-004', 'Materials', 10630.98, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-005' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-005', 'Materials', 7942.1, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-006' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-007' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-008' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-008', 'Materials', 13870.6, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-009' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-009', 'Materials', 4793.14, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-010' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-010', 'Materials', 13670.4, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-011' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-011', 'Materials', 74.36, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-012' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-012', 'Materials', 4197, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-013' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-014' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-014', 'Materials', 573.61, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-015' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-015', 'Materials', 6380.44, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-016' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-016', 'Materials', 1898.09, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-017' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-017', 'Materials', 5388.64, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-018' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-018', 'Materials', 2762.01, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-019' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-020' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-021' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-022' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-022', 'Materials', 987.2, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-023' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-024' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-024', 'Materials', 1203.55, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-026' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-026', 'Materials', 1813.78, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-027' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-027', 'Materials', 1702.47, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-031' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-031', 'Materials', 7091.32, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-031', 'Labor', 2672.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-033' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-033', 'Labor', 3424.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-034' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-034', 'Labor', 2601, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-036' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-036', 'Materials', 6466.44, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-036', 'Labor', 2855, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-037' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-037', 'Materials', 949.07, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-038' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-038', 'Materials', 555.11, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-038', 'Labor', 730, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-040' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-040', 'Materials', 398.64, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-040', 'Labor', 1114.67, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-041' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-041', 'Materials', 10713.5, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-041', 'Labor', 14388, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-042' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-042', 'Materials', 6607.07, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-042', 'Labor', 973, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-043' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-046' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-046', 'Materials', 1657.49, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-046', 'Labor', 3843.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-047' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-048' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-048', 'Materials', 4301.67, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-048', 'Labor', 4209, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-049' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-049', 'Labor', 595.25, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-050' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-050', 'Materials', 1361.39, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-051' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-051', 'Materials', 2457.65, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-051', 'Labor', 10235, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-052' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-052', 'Materials', 756.54, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-052', 'Labor', 504, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-053' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-053', 'Labor', 3500, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-054' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-054', 'Materials', 384.39, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-054', 'Labor', 2996, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-055' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-056' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-056', 'Materials', 1112, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-056', 'Labor', 572, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-057' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-057', 'Materials', 4058.58, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-057', 'Labor', 4733.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-058' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-058', 'Materials', 6123.49, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-059' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-059', 'Labor', 2089.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-060' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-060', 'Materials', 735.58, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-060', 'Labor', 1607, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-061' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-061', 'Materials', 979.22, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-061', 'Labor', 1221.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-062' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-062', 'Materials', 7541.94, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-062', 'Labor', 3087, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-063' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-063', 'Labor', 280, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-065' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-065', 'Labor', 2747.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-066' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-067' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-067', 'Materials', 3343.08, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-067', 'Labor', 1242, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-068' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-068', 'Materials', 732.69, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-068', 'Labor', 3276, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-069' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-069', 'Labor', 3418, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-070' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-070', 'Labor', 560, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-071' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-071', 'Labor', 1675.25, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-072' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-072', 'Materials', 11371.7, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-072', 'Labor', 1620, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-073' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-073', 'Labor', 2029, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-074' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-074', 'Labor', 7994, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-075' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-075', 'Labor', 560, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-076' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-076', 'Labor', 845.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-077' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-077', 'Materials', 10321.2, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-077', 'Labor', 7130.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-080' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-080', 'Materials', 346.08, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-080', 'Labor', 908.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-082' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-082', 'Materials', 364.97, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-082', 'Labor', 875.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-083' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-084' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-084', 'Materials', 317.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-085' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-085', 'Materials', 3637.49, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-123' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-123', 'Materials', 408.22, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-124' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-124', 'Materials', 1507.5, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-129' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-129', 'Materials', 10860, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-129', 'Labor', 18314, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-136' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-136', 'Labor', 189, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-144' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-144', 'Labor', 399, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-147' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-147', 'Materials', 12357.5, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-147', 'Labor', 7698.23, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-148' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-152' and category in ('Materials','Labor','Subcontractors');
delete from job_costs where job_id = 'SLX-154' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-154', 'Labor', 1121, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-158' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-158', 'Labor', 811, 'Job Costing sheet');
delete from job_costs where job_id = 'SLX-161' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-161', 'Materials', 1121.65, 'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-161', 'Labor', 4150.5, 'Job Costing sheet');

-- 5. two jobs that were only on the sheet
delete from job_costs where job_id in ('SLX-165','SLX-166');
insert into jobs (job_id, client_name, job_type, stage, contract_price, change_orders, discounts, overhead_pct) values ('SLX-165','Robyn Bryant','Painting','Completed', null, 3310, -129.99, 18) on conflict (job_id) do nothing;
insert into jobs (job_id, client_name, address_city, job_type, stage, contract_price, change_orders, discounts, overhead_pct) values ('SLX-166','Angelina Rockelman','2238 SE Thrush Avenue Hillsboro OR 97123','patio cover','Designs Sold', 5365.45, 0, -62, 18) on conflict (job_id) do nothing;
insert into job_costs (job_id, category, amount, notes) values ('SLX-165','Materials',5238.43,'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-165','Labor',730.50,'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-166','Materials',684.88,'Job Costing sheet');

-- 6. verify: expect PASS
select
  (select count(*) from jobs where job_id in ('SLX-165','SLX-166')) as new_jobs_expect_2,
  (select material_cost from job_margins where job_id = 'SLX-005') as kolene_expect_7942_10,
  (select revenue from job_margins where job_id = 'SLX-052') as elda_expect_5121_43,
  case when (select count(*) from jobs where job_id in ('SLX-165','SLX-166')) = 2
    and (select material_cost from job_margins where job_id = 'SLX-005') = 7942.10
    and (select revenue from job_margins where job_id = 'SLX-052') = 5121.43
  then 'PASS' else 'FAIL - send this row to Claude' end as result;
