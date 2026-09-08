-- ============================================================
--  Salexx Ops Hub - reconcile every job to the Job Costing sheet
--
--  Makes the database match the Financial Performance Dashboard
--  "Job Costing" tab. Two formula changes in job_financials:
--    revenue  = contract_price + change_orders + discounts
--               (discounts stored negative, as the sheet enters them)
--    overhead = total direct cost * overhead_pct/100  (not of revenue)
--  Plus: overhead_pct = 18 on every job; 83 jobs get contract /
--  change orders / discounts / Materials / Labor / Sub cost from the
--  sheet; 2 sheet-only jobs created (SLX-165 Robyn Bryant, SLX-166
--  Angelina Rockelman patio cover). SLX-143 left alone on purpose.
--
--  Pure DML - no staging table. Run AFTER 29. Safe to re-run.
--  IMPORTANT: after pasting, press Cmd+A in the editor to be sure the
--  whole file is selected, then Run.
-- ============================================================

create or replace view job_financials as
with hrs as (
  select job_id, sum(hours) as hours, sum(labor_cost) as labor_cost
  from time_entry_costs where kind = 'Job' and job_id is not null group by job_id
),
jc as (
  select job_id,
    sum(amount) filter (where category in ('Materials','Equipment / Rentals')) as direct_materials,
    sum(amount) filter (where category = 'Labor')          as labor_direct,
    sum(amount) filter (where category = 'Subcontractors') as sub_direct,
    sum(amount) filter (where category not in
      ('Materials','Subcontractors','Equipment / Rentals','Labor')) as additional_costs,
    count(*) as cost_rows
  from job_costs group by job_id
),
sp as (
  select job_id, sum(contract_amount) as sub_total
  from sub_payments where job_id is not null group by job_id
),
base as (
  select j.job_id, j.client_name, j.address_city, j.job_type, j.stage, j.crew,
    j.sold_date, j.completed_date, j.lead_source, j.drive_folder_url,
    j.contract_price, j.change_orders, j.discounts, j.overhead_pct, j.manual_hours,
    coalesce(nullif(coalesce(hrs.hours,0),0), j.manual_hours, 0) as hours,
    case when coalesce(hrs.hours,0) > 0 then coalesce(hrs.labor_cost,0)
         else coalesce(jc.labor_direct,0) end as labor_cost,
    coalesce(jc.direct_materials,0) + coalesce(jc.sub_direct,0) + coalesce(sp.sub_total,0) as material_cost,
    coalesce(jc.additional_costs,0) as additional_cost,
    coalesce(jc.cost_rows,0) as cost_rows,
    coalesce(sp.sub_total,0) as sub_total
  from jobs j
  left join hrs on hrs.job_id = j.job_id
  left join jc  on jc.job_id  = j.job_id
  left join sp  on sp.job_id  = j.job_id
)
select b.job_id, b.client_name, b.address_city, b.job_type, b.stage, b.crew,
  b.sold_date, b.completed_date, b.lead_source, b.drive_folder_url,
  b.hours, b.labor_cost, b.material_cost, b.additional_cost,
  case when b.contract_price is null then null
       else b.contract_price + b.change_orders + b.discounts end as revenue,
  round((b.labor_cost + b.material_cost + b.additional_cost) * (b.overhead_pct/100), 2) as overhead_cost,
  (b.contract_price is not null and b.hours = 0 and coalesce(b.manual_hours,0) = 0
    and b.cost_rows = 0 and b.sub_total = 0) as unpriced
from base b;

update jobs set overhead_pct = 18.00 where overhead_pct is distinct from 18.00;
update jobs set discounts = -abs(discounts) where discounts > 0;

-- reconcile: contract / change orders / discounts from the sheet
update jobs j set contract_price = v.contract, change_orders = v.co,
  discounts = v.disc, overhead_pct = 18.00
from (values
('SLX-001'::text,248.54::numeric,0::numeric,0::numeric), ('SLX-002',40299,0,0), ('SLX-003',23073.87,0,0),
('SLX-004',25833.55,0,0), ('SLX-005',30664.88,0,0), ('SLX-006',8798.78,0,0),
('SLX-007',3575.69,0,0), ('SLX-008',35250.32,0,0), ('SLX-009',12598.78,0,0),
('SLX-010',92000,0,0), ('SLX-011',3398.78,0,0), ('SLX-012',29600.98,0,0),
('SLX-013',375,0,0), ('SLX-014',30250.65,0,0), ('SLX-015',21822.77,0,0),
('SLX-016',33060,0,0), ('SLX-017',27578,0,0), ('SLX-018',37370.88,0,0),
('SLX-019',3950,0,0), ('SLX-020',4707.06,0,0), ('SLX-021',20260.67,0,0),
('SLX-022',20450.56,0,0), ('SLX-023',2661.38,0,0), ('SLX-024',44869.82,0,0),
('SLX-026',11143.88,0,0), ('SLX-027',8440,0,0), ('SLX-031',26945.26,0,0),
('SLX-033',13381.25,0,-278.69), ('SLX-034',4338.82,0,0), ('SLX-036',32395.43,0,0),
('SLX-037',46450,0,0), ('SLX-038',11393.7,0,0), ('SLX-040',6320.75,0,0),
('SLX-041',78341.1,0,-119.9), ('SLX-042',17500,0,0), ('SLX-043',13496.12,0,0),
('SLX-046',12505,0,0), ('SLX-047',8415.9,0,0), ('SLX-048',34730.45,0,0),
('SLX-049',5897.32,0,0), ('SLX-050',8800.78,0,0), ('SLX-051',44375.99,875,-353.83),
('SLX-052',5175.43,0,-54), ('SLX-053',21723.74,0,0), ('SLX-054',11995.45,2205,0),
('SLX-055',3900.54,0,0), ('SLX-056',6075.31,0,0), ('SLX-057',20151.09,0,-251.6),
('SLX-058',10450.65,3375,0), ('SLX-059',13375.25,0,0), ('SLX-060',20858.99,0,-205.58),
('SLX-061',4075.54,0,-40), ('SLX-062',17275.23,0,0), ('SLX-063',1265,0,0),
('SLX-065',8875.45,0,0), ('SLX-066',7500.65,0,0), ('SLX-067',8874,200,0),
('SLX-068',15000,2620,-59.36), ('SLX-069',16810.56,0,0), ('SLX-070',4450.54,0,0),
('SLX-071',14625.56,0,-120.22), ('SLX-072',10450.46,0,-765.75), ('SLX-073',12885.34,500,0),
('SLX-074',40000,0,0), ('SLX-075',3295.54,0,0), ('SLX-076',4000,0,0),
('SLX-077',20415.66,1700,-1409.87), ('SLX-080',8497.75,11846,0), ('SLX-082',14275,0,0),
('SLX-083',19521.04,0,0), ('SLX-084',32450.25,0,0), ('SLX-085',32754.67,0,0),
('SLX-123',31865,0,0), ('SLX-124',4997,1375,0), ('SLX-129',66100,2405,0),
('SLX-136',8293.11,0,0), ('SLX-144',13700,0,0), ('SLX-147',48000,0,0),
('SLX-148',19779.25,0,0), ('SLX-152',1497.54,0,0), ('SLX-154',8497.75,925,0),
('SLX-158',4165.45,0,0), ('SLX-161',null,0,0)
) as v(job_id, contract, co, disc)
where v.job_id = j.job_id;

-- replace Materials / Labor / Sub cost rows for those jobs
delete from job_costs c using (values ('SLX-001'), ('SLX-002'), ('SLX-003'), ('SLX-004'), ('SLX-005'), ('SLX-006'), ('SLX-007'), ('SLX-008'), ('SLX-009'), ('SLX-010'), ('SLX-011'), ('SLX-012'), ('SLX-013'), ('SLX-014'), ('SLX-015'), ('SLX-016'), ('SLX-017'), ('SLX-018'), ('SLX-019'), ('SLX-020'), ('SLX-021'), ('SLX-022'), ('SLX-023'), ('SLX-024'), ('SLX-026'), ('SLX-027'), ('SLX-031'), ('SLX-033'), ('SLX-034'), ('SLX-036'), ('SLX-037'), ('SLX-038'), ('SLX-040'), ('SLX-041'), ('SLX-042'), ('SLX-043'), ('SLX-046'), ('SLX-047'), ('SLX-048'), ('SLX-049'), ('SLX-050'), ('SLX-051'), ('SLX-052'), ('SLX-053'), ('SLX-054'), ('SLX-055'), ('SLX-056'), ('SLX-057'), ('SLX-058'), ('SLX-059'), ('SLX-060'), ('SLX-061'), ('SLX-062'), ('SLX-063'), ('SLX-065'), ('SLX-066'), ('SLX-067'), ('SLX-068'), ('SLX-069'), ('SLX-070'), ('SLX-071'), ('SLX-072'), ('SLX-073'), ('SLX-074'), ('SLX-075'), ('SLX-076'), ('SLX-077'), ('SLX-080'), ('SLX-082'), ('SLX-083'), ('SLX-084'), ('SLX-085'), ('SLX-123'), ('SLX-124'), ('SLX-129'), ('SLX-136'), ('SLX-144'), ('SLX-147'), ('SLX-148'), ('SLX-152'), ('SLX-154'), ('SLX-158'), ('SLX-161')) as v(job_id)
where c.job_id = v.job_id and c.category in ('Materials','Labor','Subcontractors');

insert into job_costs (job_id, category, amount, notes)
select job_id, category, amount, 'Job Costing sheet' from (values
('SLX-004'::text,'Materials'::cost_category,10630.98::numeric), ('SLX-005','Materials',7942.1), ('SLX-008','Materials',13870.6),
('SLX-009','Materials',4793.14), ('SLX-010','Materials',13670.4), ('SLX-011','Materials',74.36),
('SLX-012','Materials',4197), ('SLX-014','Materials',573.61), ('SLX-015','Materials',6380.44),
('SLX-016','Materials',1898.09), ('SLX-017','Materials',5388.64), ('SLX-018','Materials',2762.01),
('SLX-022','Materials',987.2), ('SLX-024','Materials',1203.55), ('SLX-026','Materials',1813.78),
('SLX-027','Materials',1702.47), ('SLX-031','Materials',7091.32), ('SLX-031','Labor',2672.5),
('SLX-033','Labor',3424.5), ('SLX-034','Labor',2601), ('SLX-036','Materials',6466.44),
('SLX-036','Labor',2855), ('SLX-037','Materials',949.07), ('SLX-038','Materials',555.11),
('SLX-038','Labor',730), ('SLX-040','Materials',398.64), ('SLX-040','Labor',1114.67),
('SLX-041','Materials',10713.5), ('SLX-041','Labor',14388), ('SLX-042','Materials',6607.07),
('SLX-042','Labor',973), ('SLX-046','Materials',1657.49), ('SLX-046','Labor',3843.5),
('SLX-048','Materials',4301.67), ('SLX-048','Labor',4209), ('SLX-049','Labor',595.25),
('SLX-050','Materials',1361.39), ('SLX-051','Materials',2457.65), ('SLX-051','Labor',10235),
('SLX-052','Materials',756.54), ('SLX-052','Labor',504), ('SLX-053','Labor',3500),
('SLX-054','Materials',384.39), ('SLX-054','Labor',2996), ('SLX-056','Materials',1112),
('SLX-056','Labor',572), ('SLX-057','Materials',4058.58), ('SLX-057','Labor',4733.5),
('SLX-058','Materials',6123.49), ('SLX-059','Labor',2089.5), ('SLX-060','Materials',735.58),
('SLX-060','Labor',1607), ('SLX-061','Materials',979.22), ('SLX-061','Labor',1221.5),
('SLX-062','Materials',7541.94), ('SLX-062','Labor',3087), ('SLX-063','Labor',280),
('SLX-065','Labor',2747.5), ('SLX-067','Materials',3343.08), ('SLX-067','Labor',1242),
('SLX-068','Materials',732.69), ('SLX-068','Labor',3276), ('SLX-069','Labor',3418),
('SLX-070','Labor',560), ('SLX-071','Labor',1675.25), ('SLX-072','Materials',11371.7),
('SLX-072','Labor',1620), ('SLX-073','Labor',2029), ('SLX-074','Labor',7994),
('SLX-075','Labor',560), ('SLX-076','Labor',845.5), ('SLX-077','Materials',10321.2),
('SLX-077','Labor',7130.5), ('SLX-080','Materials',346.08), ('SLX-080','Labor',908.5),
('SLX-082','Materials',364.97), ('SLX-082','Labor',875.5), ('SLX-084','Materials',317.5),
('SLX-085','Materials',3637.49), ('SLX-123','Materials',408.22), ('SLX-124','Materials',1507.5),
('SLX-129','Materials',10860), ('SLX-129','Labor',18314), ('SLX-136','Labor',189),
('SLX-144','Labor',399), ('SLX-147','Materials',12357.5), ('SLX-147','Labor',7698.23),
('SLX-154','Labor',1121), ('SLX-158','Labor',811), ('SLX-161','Materials',1121.65),
('SLX-161','Labor',4150.5)
) as v(job_id, category, amount);

-- two jobs that were only on the sheet
delete from job_costs where job_id in ('SLX-165','SLX-166');
insert into jobs (job_id, client_name, job_type, stage, contract_price, change_orders, discounts, overhead_pct)
values ('SLX-165','Robyn Bryant','Painting','Completed', null, 3310, -129.99, 18)
on conflict (job_id) do nothing;
insert into jobs (job_id, client_name, address_city, job_type, stage, contract_price, change_orders, discounts, overhead_pct)
values ('SLX-166','Angelina Rockelman','2238 SE Thrush Avenue Hillsboro OR 97123','patio cover','Designs Sold', 5365.45, 0, -62, 18)
on conflict (job_id) do nothing;
insert into job_costs (job_id, category, amount, notes) values
  ('SLX-165','Materials',5238.43,'Job Costing sheet'),
  ('SLX-165','Labor',730.50,'Job Costing sheet'),
  ('SLX-166','Materials',684.88,'Job Costing sheet');

-- verify: expect PASS
select
  (select count(*) from jobs where job_id in ('SLX-165','SLX-166')) as new_jobs_expect_2,
  (select material_cost from job_margins where job_id = 'SLX-005')  as kolene_expect_7942_10,
  (select revenue from job_margins where job_id = 'SLX-052')        as elda_expect_5121_43,
  case when (select count(*) from jobs where job_id in ('SLX-165','SLX-166')) = 2
    and (select material_cost from job_margins where job_id = 'SLX-005') = 7942.10
    and (select revenue from job_margins where job_id = 'SLX-052') = 5121.43
  then 'PASS' else 'FAIL - send this row to Claude' end as result;
