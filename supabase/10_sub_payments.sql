-- ============================================================
--  Salexx Ops Hub — Subcontractor payments, connected to Job Costing
--
--  Real ledger of what each subcontractor is contracted for and paid,
--  per job — modeled on the existing "Subcontractor Payment Tracker"
--  spreadsheet. This REPLACES the manual "Subcontractors" number that
--  used to be typed directly into Job Costing: that field now shows
--  the live sum of contract_amount from this table for the job,
--  instead of a second, disconnected number someone has to remember
--  to keep in sync.
--
--  Run AFTER 09_subcontractors.sql. Safe to re-run.
-- ============================================================

create table if not exists sub_payments (
  contract_id     uuid primary key default gen_random_uuid(),
  job_id          text references jobs(job_id) on delete set null,
  sub_id          uuid references subcontractors(sub_id) on delete set null,
  scope           text,
  contract_amount numeric(12,2) not null default 0,
  amount_paid     numeric(12,2) not null default 0,
  method          payment_method,
  due_date        date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists sub_payments_job_idx on sub_payments (job_id);
create index if not exists sub_payments_sub_idx on sub_payments (sub_id);

alter table sub_payments enable row level security;

drop policy if exists team_all on sub_payments;
create policy team_all on sub_payments for all to authenticated
  using (true) with check (true);

drop trigger if exists sub_payments_touch on sub_payments;
create trigger sub_payments_touch before update on sub_payments
  for each row execute function touch_updated_at();


-- ============================================================
--  Migrate any existing manually-entered Subcontractor cost rows
--  into sub_payments, treated as contracted-and-paid-in-full — same
--  as how the old system counted them (a cost already incurred).
--  Without this, those jobs' costs would silently drop the moment
--  job_financials stops reading job_costs.category='Subcontractors'.
--  Safe to re-run: the second run finds nothing left to migrate.
-- ============================================================
insert into sub_payments (job_id, contract_amount, amount_paid, notes)
select job_id, amount, amount, 'Migrated from job_costs (Subcontractors category)'
from job_costs
where category = 'Subcontractors';

delete from job_costs where category = 'Subcontractors';


-- ============================================================
--  job_financials — Subcontractor cost now comes from sub_payments,
--  not from a manually-typed job_costs row. Materials/Equipment
--  keep working exactly as before.
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
    sum(amount) filter (where category not in
      ('Materials','Subcontractors','Equipment / Rentals')) as additional_costs,
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
  coalesce(hrs.hours, 0)                                        as hours,
  coalesce(hrs.labor_cost, 0)                                   as labor_cost,
  coalesce(jc.direct_materials, 0) + coalesce(sp.sub_total, 0)   as material_cost,
  coalesce(jc.additional_costs, 0)                              as additional_cost,
  case when j.contract_price is null then null
       else j.contract_price + j.change_orders - j.discounts end as revenue,
  case when j.contract_price is null then 0
       else (j.contract_price + j.change_orders - j.discounts)
            * (j.overhead_pct / 100) end                        as overhead_cost,
  (j.contract_price is not null
    and coalesce(hrs.hours, 0) = 0
    and coalesce(jc.cost_rows, 0) = 0
    and coalesce(sp.sub_total, 0) = 0)                          as unpriced
from jobs j
left join hrs on hrs.job_id = j.job_id
left join jc  on jc.job_id  = j.job_id
left join sp  on sp.job_id  = j.job_id;
