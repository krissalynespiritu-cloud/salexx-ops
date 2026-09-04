-- ============================================================
--  Salexx Ops Hub — make in-house labor, sub labor and hours
--  first-class editable fields on a job
--
--  The Job Costing sheet records ONE materials number and ONE
--  labor number per job. The app until now could only get labor
--  from crew time entries (hours x wage) and subcontractor cost
--  from the Subs tab. Historical jobs have neither, so their
--  labor was invisible.
--
--  This does two things:
--
--   1. adds jobs.manual_hours — a hand-entered hours figure, used
--      only when no crew time is logged against the job.
--
--   2. redefines job_financials so:
--        - a job_costs row with category 'Labor' counts as in-house
--          labor (it used to fall into "additional costs")
--        - a job_costs row with category 'Subcontractors' counts as
--          subcontractor cost (it used to be dropped entirely —
--          subs only counted if entered through the Subs tab)
--        - logged crew time still wins over both when it exists
--        - hours falls back to manual_hours
--
--  No rows change. Existing 'Labor' rows imported by 27 simply move
--  from the additional-cost bucket into the labor bucket, so a few
--  margins shift slightly. Run AFTER 28. Safe to re-run.
-- ============================================================

alter table jobs add column if not exists manual_hours numeric(8,2);

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
)
select
  j.job_id, j.client_name, j.address_city, j.job_type, j.stage, j.crew,
  j.sold_date, j.completed_date, j.lead_source, j.drive_folder_url,
  -- logged crew time wins; otherwise the hand-entered figure
  coalesce(nullif(coalesce(hrs.hours, 0), 0), j.manual_hours, 0) as hours,
  -- in-house labor: time-entry cost when hours were logged, else the
  -- hand-entered Labor cost row
  case when coalesce(hrs.hours, 0) > 0 then coalesce(hrs.labor_cost, 0)
       else coalesce(jc.labor_direct, 0) end                   as labor_cost,
  -- materials + every kind of subcontractor cost
  coalesce(jc.direct_materials, 0)
    + coalesce(jc.sub_direct, 0)
    + coalesce(sp.sub_total, 0)                                as material_cost,
  coalesce(jc.additional_costs, 0)                             as additional_cost,
  case when j.contract_price is null then null
       else j.contract_price + j.change_orders - j.discounts end as revenue,
  case when j.contract_price is null then 0
       else (j.contract_price + j.change_orders - j.discounts)
            * (j.overhead_pct / 100) end                       as overhead_cost,
  (j.contract_price is not null
    and coalesce(hrs.hours, 0) = 0
    and coalesce(j.manual_hours, 0) = 0
    and coalesce(jc.cost_rows, 0) = 0
    and coalesce(sp.sub_total, 0) = 0)                         as unpriced
from jobs j
left join hrs on hrs.job_id = j.job_id
left join jc  on jc.job_id  = j.job_id
left join sp  on sp.job_id  = j.job_id;
