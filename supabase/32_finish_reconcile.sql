-- ============================================================
-- 32_finish_reconcile.sql - the ~20 jobs migration 30 did not fully apply
-- Run AFTER 30. Safe to re-run. Every statement is standalone.
-- ============================================================

update jobs set contract_price = 66100, change_orders = 2405, discounts = 0, overhead_pct = 18 where job_id = 'SLX-129';
update jobs set contract_price = 5175.43, change_orders = 0, discounts = -54, overhead_pct = 18 where job_id = 'SLX-052';
update jobs set contract_price = 4075.54, change_orders = 0, discounts = -40, overhead_pct = 18 where job_id = 'SLX-061';
update jobs set contract_price = 20151.09, change_orders = 0, discounts = -251.6, overhead_pct = 18 where job_id = 'SLX-057';
update jobs set contract_price = 20858.99, change_orders = 0, discounts = -205.58, overhead_pct = 18 where job_id = 'SLX-060';
update jobs set contract_price = 15000, change_orders = 2620, discounts = -59.36, overhead_pct = 18 where job_id = 'SLX-068';
update jobs set contract_price = 4997, change_orders = 1375, discounts = 0, overhead_pct = 18 where job_id = 'SLX-124';
update jobs set contract_price = 14625.56, change_orders = 0, discounts = -120.22, overhead_pct = 18 where job_id = 'SLX-071';
update jobs set contract_price = 8874, change_orders = 200, discounts = 0, overhead_pct = 18 where job_id = 'SLX-067';
update jobs set contract_price = 10450.46, change_orders = 0, discounts = -765.75, overhead_pct = 18 where job_id = 'SLX-072';
update jobs set contract_price = 12885.34, change_orders = 500, discounts = 0, overhead_pct = 18 where job_id = 'SLX-073';
update jobs set contract_price = 8497.75, change_orders = 925, discounts = 0, overhead_pct = 18 where job_id = 'SLX-154';
update jobs set contract_price = 8497.75, change_orders = 11846, discounts = 0, overhead_pct = 18 where job_id = 'SLX-080';
update jobs set contract_price = 1497.54, change_orders = 0, discounts = 0, overhead_pct = 18 where job_id = 'SLX-152';

delete from job_costs where job_id = 'SLX-005' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-005','Materials',7942.1,'Job Costing sheet');
delete from job_costs where job_id = 'SLX-016' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-016','Materials',1898.09,'Job Costing sheet');
delete from job_costs where job_id = 'SLX-018' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-018','Materials',2762.01,'Job Costing sheet');
delete from job_costs where job_id = 'SLX-036' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-036','Materials',6466.44,'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-036','Labor',2855,'Job Costing sheet');
delete from job_costs where job_id = 'SLX-038' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-038','Materials',555.11,'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-038','Labor',730,'Job Costing sheet');
delete from job_costs where job_id = 'SLX-041' and category in ('Materials','Labor','Subcontractors');
insert into job_costs (job_id, category, amount, notes) values ('SLX-041','Materials',10713.5,'Job Costing sheet');
insert into job_costs (job_id, category, amount, notes) values ('SLX-041','Labor',14388,'Job Costing sheet');

-- verify: expect PASS
select case when (select revenue from job_margins where job_id='SLX-052')=5121.43
  and (select material_cost from job_margins where job_id='SLX-005')=7942.10
  and (select revenue from job_margins where job_id='SLX-080')=20343.75
  then 'PASS' else 'FAIL - send this to Claude' end as result;
