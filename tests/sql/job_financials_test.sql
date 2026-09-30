-- ============================================================
-- tests/sql/job_financials_test.sql
--
-- SQL-level regression test for the job-costing math itself --
-- job_financials and job_margins, the two views every margin/GP figure
-- in the app reads from. The JS suite in tests/cases/ never exercises
-- this: every JS test that touches a margin mocks job_margins' OUTPUT
-- (a hand-typed { revenue, labor_cost, ... } object), never the real
-- SQL that computes it. If someone edits the view formula wrong, the
-- JS suite has no way to notice. This does.
--
-- This is a MINIMAL schema, not the real migration history replayed --
-- it defines only the tables/columns/enums job_financials and
-- job_margins actually read, copied verbatim from their current
-- definitions (supabase/66_hide_retired_jobs_from_financials.sql and
-- supabase/01_schema.sql). If those views are ever changed, this
-- file's copies must be updated to match, or it will be testing
-- against stale logic without realizing it -- there's no way around
-- that without literally replaying all 97 production migrations
-- (including real data imports) on every CI run, which is its own can
-- of worms. Keeping the two in sync is a manual responsibility.
--
-- Run against a throwaway Postgres (CI spins up a fresh one every
-- run -- see .github/workflows/test.yml). NEVER run this against a
-- real project; it creates and drops its own tables/types by name and
-- would collide with real data.
--
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/job_financials_test.sql
-- Exits non-zero (via a RAISE EXCEPTION propagating out) on any
-- mismatch between a computed and an expected value.
-- ============================================================

\set ON_ERROR_STOP on

-- ---------- minimal schema: only what job_financials/job_margins read ----------

create extension if not exists pgcrypto;

create type crew_role as enum ('Crew','Admin','Manager','Subcontractor');
create type cost_category as enum (
  'Materials','Subcontractors','Equipment / Rentals','Disposal / Dumpster',
  'Permits / Fees','Fuel / Travel','Other / Misc','Labor');
create type entry_type as enum ('Job','Admin','Time Off');
create type job_stage as enum (
  'Designs Sold','Permitting / Drawings','Ready For Scheduling','Project Scheduled',
  'In Progress','Punch list / Touch-ups (if needed)','Completed','Project on hold');

create table settings (
  id           int primary key default 1,
  labor_rate   numeric(10,2) not null default 35.00
);
insert into settings (id) values (1);

create table jobs (
  job_id          text primary key,
  client_name     text not null,
  address_city    text,
  job_type        text,
  stage           job_stage not null default 'Designs Sold',
  crew            text,
  sold_date       date,
  completed_date  date,
  contract_price  numeric(12,2),
  change_orders   numeric(12,2) not null default 0,
  discounts       numeric(12,2) not null default 0,
  overhead_pct    numeric(5,2)  not null default 18.00,
  lead_source     text,
  drive_folder_url text,
  manual_hours    numeric(8,2),
  retired         boolean not null default false
);

create table crew (
  name        text primary key,
  role        crew_role not null default 'Crew',
  hourly_wage numeric(8,2)
);

create table time_entries (
  entry_id   uuid primary key default gen_random_uuid(),
  job_id     text references jobs(job_id),
  person     text not null,
  work_date  date not null,
  hours      numeric(6,2) not null,
  kind       entry_type not null default 'Job'
);

create table job_costs (
  cost_id    uuid primary key default gen_random_uuid(),
  job_id     text not null references jobs(job_id),
  category   cost_category not null,
  amount     numeric(12,2) not null
);

create table sub_payments (
  contract_id     uuid primary key default gen_random_uuid(),
  job_id          text references jobs(job_id),
  contract_amount numeric(12,2) not null default 0
);

-- ---------- the views under test -- copied verbatim from production ----------

create or replace view time_entry_costs as
select
  t.entry_id, t.job_id, t.person, t.work_date, t.hours, t.kind,
  coalesce(c.hourly_wage, (select coalesce(max(labor_rate), 35.00) from settings))
    as effective_rate,
  t.hours * coalesce(c.hourly_wage,
    (select coalesce(max(labor_rate), 35.00) from settings)) as labor_cost
from time_entries t
left join crew c on c.name = t.person;

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

create or replace view job_margins as
select f.*,
  case when f.unpriced then null else
    f.labor_cost + f.material_cost + f.additional_cost + f.overhead_cost
  end as total_job_cost,
  case when f.revenue is null or f.unpriced then null else
    f.revenue - (f.labor_cost + f.material_cost + f.additional_cost + f.overhead_cost)
  end as gross_profit,
  case when f.revenue is null or f.revenue = 0 or f.unpriced then null else
    round(((f.revenue - (f.labor_cost + f.material_cost + f.additional_cost
      + f.overhead_cost)) / f.revenue) * 100, 1)
  end as margin_pct
from job_financials f;

-- ---------- assertion helper ----------

create or replace function assert_eq(label text, actual anyelement, expected anyelement)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAILED: % -- expected %, got %', label, expected, actual;
  end if;
end;
$$;

-- ---------- Scenario 1: a healthy, fully-costed in-house job ----------
-- Real hours at a real wage, real materials/equipment/disposal/permit costs,
-- change orders and a (negative-stored) discount. Every number below is
-- hand-calculated from the view's own formula, not copied from the view.

insert into jobs (job_id, client_name, contract_price, change_orders, discounts, overhead_pct)
  values ('TEST-1', 'Healthy Job', 10000, 500, -200, 20);
insert into crew (name, hourly_wage) values ('Ann', 40);
insert into time_entries (job_id, person, work_date, hours, kind) values
  ('TEST-1', 'Ann', '2026-01-01', 10, 'Job'),
  ('TEST-1', 'Ann', '2026-01-02', 5, 'Job');
insert into job_costs (job_id, category, amount) values
  ('TEST-1', 'Materials', 1000),
  ('TEST-1', 'Equipment / Rentals', 200),
  ('TEST-1', 'Disposal / Dumpster', 100),
  ('TEST-1', 'Permits / Fees', 50);

select assert_eq('Scenario 1: hours', hours, 15) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: labor_cost (15 hrs @ $40)', labor_cost, 600) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: material_cost (materials + equipment)', material_cost, 1200) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: additional_cost (disposal + permits)', additional_cost, 150) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: revenue (contract + CO + discount)', revenue, 10300) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: overhead_cost (20% of 1950 direct cost)', overhead_cost, 390.00) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: unpriced', unpriced, false) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: total_job_cost', total_job_cost, 2340) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: gross_profit', gross_profit, 7960) from job_margins where job_id = 'TEST-1';
select assert_eq('Scenario 1: margin_pct', margin_pct, 77.3) from job_margins where job_id = 'TEST-1';

-- ---------- Scenario 2: unpriced -- a contract with nothing entered yet ----------
-- Must show as unpriced (null margin), NOT a fake 100% margin.

insert into jobs (job_id, client_name, contract_price) values ('TEST-2', 'Nothing Entered Yet', 5000);

select assert_eq('Scenario 2: unpriced', unpriced, true) from job_margins where job_id = 'TEST-2';
select assert_eq('Scenario 2: total_job_cost is null when unpriced', total_job_cost, null::numeric) from job_margins where job_id = 'TEST-2';
select assert_eq('Scenario 2: gross_profit is null when unpriced', gross_profit, null::numeric) from job_margins where job_id = 'TEST-2';
select assert_eq('Scenario 2: margin_pct is null when unpriced', margin_pct, null::numeric) from job_margins where job_id = 'TEST-2';

-- ---------- Scenario 3: fully sub-out job, no in-house hours ----------
-- Reproduces the real reported case from tests/cases/run71.js (Jane Vitek
-- Dixon: $21,723.74 contract, $3,500 sub cost, no in-house hours, fully
-- priced) -- the sub_payments total must flow into material_cost and must
-- prevent "unpriced" even though cost_rows is 0 (no job_costs rows at all).

insert into jobs (job_id, client_name, contract_price, overhead_pct) values ('TEST-3', 'Sub Out Job', 21723.74, 18);
insert into sub_payments (job_id, contract_amount) values ('TEST-3', 3500);

select assert_eq('Scenario 3: hours (no in-house hours)', hours, 0) from job_margins where job_id = 'TEST-3';
select assert_eq('Scenario 3: labor_cost (no in-house labor)', labor_cost, 0) from job_margins where job_id = 'TEST-3';
select assert_eq('Scenario 3: material_cost is the sub total', material_cost, 3500) from job_margins where job_id = 'TEST-3';
select assert_eq('Scenario 3: unpriced is false (sub_total > 0 counts as priced)', unpriced, false) from job_margins where job_id = 'TEST-3';
select assert_eq('Scenario 3: gross_profit', gross_profit, 17593.74) from job_margins where job_id = 'TEST-3';
select assert_eq('Scenario 3: margin_pct', margin_pct, 81.0) from job_margins where job_id = 'TEST-3';

-- ---------- Scenario 4: a retired job must not appear at all ----------

insert into jobs (job_id, client_name, contract_price, retired) values ('TEST-4', 'Retired Job', 9999, true);

select assert_eq('Scenario 4: retired job excluded from job_financials',
  (select count(*) from job_financials where job_id = 'TEST-4'), 0::bigint);
select assert_eq('Scenario 4: retired job excluded from job_margins',
  (select count(*) from job_margins where job_id = 'TEST-4'), 0::bigint);

-- ---------- Scenario 5: manual_hours with no matching Labor cost line ----------
-- The dangerous edge case from tonight's Salvador conversation, proven at
-- the SQL level: manual_hours alone makes `hours` nonzero and `unpriced`
-- false, but does NOT produce any labor_cost unless a job_costs row with
-- category='Labor' also exists. A job worked entirely by someone with no
-- wage set (or logged only via manual_hours with no accompanying Labor
-- line) can show a full, real-looking 100% margin here even though its
-- real labor cost is completely missing. This is exactly why the app's
-- own costingComplete() (index.html) requires laborCost > 0 and does NOT
-- trust hours/manual_hours alone -- the view itself will not stop this.
-- If this assertion ever starts failing, the risk has moved, not
-- disappeared -- check costingComplete() is still guarding against it
-- before touching this test.

insert into jobs (job_id, client_name, contract_price, manual_hours) values ('TEST-5', 'Manual Hours No Cost Line', 8000, 40);

select assert_eq('Scenario 5: hours reflects manual_hours', hours, 40) from job_margins where job_id = 'TEST-5';
select assert_eq('Scenario 5: labor_cost is $0 despite 40 hours', labor_cost, 0) from job_margins where job_id = 'TEST-5';
select assert_eq('Scenario 5: unpriced is false (hours > 0 is enough for the VIEW, even with $0 real cost)', unpriced, false) from job_margins where job_id = 'TEST-5';
select assert_eq('Scenario 5: total_job_cost is $0, not null', total_job_cost, 0) from job_margins where job_id = 'TEST-5';
select assert_eq('Scenario 5: margin_pct is a misleading 100.0 at the view level', margin_pct, 100.0) from job_margins where job_id = 'TEST-5';

\echo 'job_financials_test.sql: all assertions passed'
