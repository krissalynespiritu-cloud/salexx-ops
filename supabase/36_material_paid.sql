-- ============================================================
-- 36_material_paid.sql
--
-- Track materials as line items per job with a paid flag, so job
-- costing shows a job's real material cost before the supplier bills
-- are paid, and you can see what's still owed.
--
-- job_costs already carries vendor, amount and cost_date per row.
-- This adds paid / paid_on, and a rollup view.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table job_costs add column if not exists paid    boolean not null default false;
alter table job_costs add column if not exists paid_on  date;

create or replace view job_material_status as
select
  j.job_id,
  coalesce(sum(c.amount) filter (where c.category = 'Materials'), 0)                as materials_total,
  coalesce(sum(c.amount) filter (where c.category = 'Materials' and not c.paid), 0) as materials_unpaid,
  count(*) filter (where c.category = 'Materials')                                 as material_lines,
  count(*) filter (where c.category = 'Materials' and not c.paid)                  as unpaid_lines
from jobs j
left join job_costs c on c.job_id = j.job_id
group by j.job_id;

-- verify
select
  (select count(*) from job_costs where category = 'Materials')            as material_rows,
  (select round(sum(materials_unpaid)) from job_material_status)           as company_materials_unpaid;
