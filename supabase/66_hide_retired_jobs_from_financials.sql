-- ============================================================
-- 66_hide_retired_jobs_from_financials.sql
--
-- A retired job (migration 64/65) is still a real row -- fully
-- intact for anyone who looks it up directly, exactly like a
-- merged-away client -- but it must stop counting toward revenue,
-- margin, and lifetime value everywhere those numbers are rolled
-- up, the same way migration 62 stopped a merged-away client from
-- showing on the Clients page.
--
-- job_financials is the single source every margin figure in the
-- app reads from (job_margins builds on it, client_value's
-- lifetime_value builds on job_margins), so one filter here is
-- enough. This is the current definition from 30_reconcile_from_
-- sheet.sql with one added clause: `where not j.retired` on the
-- base CTE's job scan.
--
-- Display-only. No job, cost, payment, or client data changes.
--
-- Run AFTER 65_job_retire_function.sql. Safe to re-run.
-- ============================================================

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
  where not j.retired
)
select
  base.job_id, base.client_name, base.address_city, base.job_type, base.stage, base.crew,
  base.sold_date, base.completed_date, base.lead_source, base.drive_folder_url,
  base.hours, base.labor_cost, base.material_cost, base.additional_cost,
  case when base.contract_price is null then null else base.contract_price + base.change_orders + base.discounts end as revenue,
  round((base.labor_cost + base.material_cost + base.additional_cost) * (base.overhead_pct / 100), 2) as overhead_cost,
  (base.contract_price is not null and base.hours = 0 and coalesce(base.manual_hours, 0) = 0 and base.cost_rows = 0 and base.sub_total = 0) as unpriced
from base;
