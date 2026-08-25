-- ============================================================
--  Salexx Ops Hub — per-crew hourly rates
--
--  crew.hourly_wage has existed since Phase 1 but every job's
--  labor_cost still charged a flat $35/hr regardless of who
--  worked it. Rates are now set on the crew table directly
--  (done live via the app's client, not in this file); this
--  file fixes job_financials so labor_cost actually uses them,
--  falling back to settings.labor_rate for anyone without a
--  wage on file — same fallback time_entry_costs already used.
--
--  Run AFTER 01_schema.sql through 06_lead_import.sql.
--  Safe to re-run.
-- ============================================================

create or replace view job_financials as
with hrs as (
  select job_id, sum(hours) as hours, sum(labor_cost) as labor_cost
  from time_entry_costs
  where kind = 'Job' and job_id is not null
  group by job_id
),
c as (
  select job_id,
    sum(amount) filter (where category in
      ('Materials','Subcontractors','Equipment / Rentals')) as direct_materials,
    sum(amount) filter (where category not in
      ('Materials','Subcontractors','Equipment / Rentals')) as additional_costs,
    count(*) as cost_rows
  from job_costs group by job_id
)
select
  j.job_id, j.client_name, j.address_city, j.job_type, j.stage, j.crew,
  j.sold_date, j.completed_date, j.lead_source, j.drive_folder_url,
  coalesce(hrs.hours, 0)                                        as hours,
  coalesce(hrs.labor_cost, 0)                                   as labor_cost,
  coalesce(c.direct_materials, 0)                               as material_cost,
  coalesce(c.additional_costs, 0)                               as additional_cost,
  case when j.contract_price is null then null
       else j.contract_price + j.change_orders - j.discounts end as revenue,
  case when j.contract_price is null then 0
       else (j.contract_price + j.change_orders - j.discounts)
            * (j.overhead_pct / 100) end                        as overhead_cost,
  (j.contract_price is not null
    and coalesce(hrs.hours, 0) = 0
    and coalesce(c.cost_rows, 0) = 0)                           as unpriced
from jobs j
left join hrs on hrs.job_id = j.job_id
left join c   on c.job_id   = j.job_id;
