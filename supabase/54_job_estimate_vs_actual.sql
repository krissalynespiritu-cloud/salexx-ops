-- ============================================================
-- 54_job_estimate_vs_actual.sql
--
-- Backs a new "Estimate vs Actual" subtab on each job, modeled on
-- the Estimated/Actual labor & materials worksheet: a pre-job labor
-- and materials budget, side by side with what the job actually
-- cost, with gross profit and hourly rate on both sides.
--
-- The ESTIMATED side is genuinely new data (nothing tracked it
-- before). The ACTUAL side is not duplicated here -- it's built in
-- the app from data that already exists: logged Time entries
-- (time_entry_costs, same source as Job Costing's Labor figure) for
-- actual hours/cost per person, and job_costs for actual materials.
-- Sale price is the job's existing contract price, not a new field.
--
--  * settings gets 3 new company-wide numbers: labor_multiplier,
--    labor_burden_pct, material_multiplier -- the markup applied
--    when turning a raw labor/material estimate into a bid number.
--  * jobs gets crew_leader_fee and upsell_amount.
--  * job_labor_estimates: one row per crew member assigned to the
--    estimate -- estimated regular + OT hours and pay rate.
--  * job_material_estimates: named estimated material/permit/rental
--    line items with qty and unit cost, mirroring the actual cost
--    categories but for the pre-job budget.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table settings add column if not exists labor_multiplier numeric(6,2) not null default 2.00;
alter table settings add column if not exists labor_burden_pct numeric(5,2) not null default 40.00;
alter table settings add column if not exists material_multiplier numeric(6,2) not null default 2.00;

alter table jobs add column if not exists crew_leader_fee numeric(10,2) not null default 0;
alter table jobs add column if not exists upsell_amount numeric(10,2) not null default 0;

create table if not exists job_labor_estimates (
  estimate_id  uuid primary key default gen_random_uuid(),
  job_id       text not null references jobs(job_id) on delete cascade,
  crew_name    text,
  est_hours    numeric(8,2) not null default 0,
  pay_rate     numeric(8,2) not null default 0,
  est_ot_hours numeric(8,2) not null default 0,
  ot_rate      numeric(8,2) not null default 0,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists job_labor_estimates_job_idx on job_labor_estimates (job_id);

create table if not exists job_material_estimates (
  estimate_id  uuid primary key default gen_random_uuid(),
  job_id       text not null references jobs(job_id) on delete cascade,
  item_name    text not null,
  qty          numeric(10,2),
  unit_cost    numeric(10,2),
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists job_material_estimates_job_idx on job_material_estimates (job_id);

alter table job_labor_estimates    enable row level security;
alter table job_material_estimates enable row level security;
drop policy if exists team_all on job_labor_estimates;
drop policy if exists team_all on job_material_estimates;
create policy team_all on job_labor_estimates    for all to authenticated using (true) with check (true);
create policy team_all on job_material_estimates for all to authenticated using (true) with check (true);
grant all on job_labor_estimates    to anon, authenticated, service_role;
grant all on job_material_estimates to anon, authenticated, service_role;

drop trigger if exists job_labor_estimates_touch on job_labor_estimates;
create trigger job_labor_estimates_touch before update on job_labor_estimates
  for each row execute function touch_updated_at();

-- verify
select
  (select count(*) from information_schema.columns where table_name='settings' and column_name in ('labor_multiplier','labor_burden_pct','material_multiplier')) as settings_cols_added,
  (select count(*) from information_schema.columns where table_name='jobs' and column_name in ('crew_leader_fee','upsell_amount')) as jobs_cols_added,
  (select count(*) from pg_tables where tablename in ('job_labor_estimates','job_material_estimates')) as tables_created;
