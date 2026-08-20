-- ============================================================
--  Salexx Ops Hub — database schema
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to re-run: everything is IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ---------- enums: the values that must never drift ----------
do $$ begin
  create type job_stage as enum (
    'Designs Sold','Permitting/Drawings','Ready for scheduling','Project scheduled',
    'In progress','Final walk through','Touch-ups','Final Payment due',
    'Final payment received','Final photos/videos','Review requested',
    'Project on hold','Completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crew_type as enum ('In House','Sub out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entry_type as enum ('Job','Admin','Time Off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cost_category as enum (
    'Materials','Subcontractors','Equipment / Rentals','Disposal / Dumpster',
    'Permits / Fees','Fuel / Travel','Other / Misc');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('New','Contacted','Estimated','Won','Lost');
exception when duplicate_object then null; end $$;


-- ---------- settings: one row, the numbers everything depends on ----------
create table if not exists settings (
  id             int primary key default 1,
  labor_rate     numeric(10,2) not null default 35.00,
  overhead_pct   numeric(5,2)  not null default 12.00,
  margin_target  numeric(5,2)  not null default 50.00,
  updated_at     timestamptz   not null default now(),
  constraint settings_single_row check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;


-- ---------- jobs ----------
create table if not exists jobs (
  job_id          text primary key,              -- SLX-001, never reused
  client_name     text not null,
  address_city    text,
  job_type        text,
  stage           job_stage not null default 'Designs Sold',
  crew            crew_type,
  manager         text,
  sold_date       date,
  start_date      date,
  completed_date  date,
  contract_price  numeric(12,2),                 -- null = no contract yet
  change_orders   numeric(12,2) not null default 0,
  discounts       numeric(12,2) not null default 0,
  overhead_pct    numeric(5,2)  not null default 12.00,
  permit_required boolean,
  lead_source     text,
  drive_folder_url text,
  ghl_opportunity_id text,
  monday_item_id  text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists jobs_stage_idx on jobs (stage);
create index if not exists jobs_client_idx on jobs (lower(client_name));


-- ---------- time entries ----------
-- One row per person per job per day. A job's hours are the SUM of these,
-- never a single value that a new entry can overwrite.
create table if not exists time_entries (
  entry_id    uuid primary key default gen_random_uuid(),
  -- RESTRICT, not SET NULL: SET NULL would fight the check below and abort
  -- with a confusing error. Refusing the delete is the honest behaviour —
  -- silently orphaning hours is exactly the bug this schema exists to prevent.
  job_id      text references jobs(job_id) on delete restrict,
  person      text not null,
  work_date   date not null,
  clock_in    time,
  clock_out   time,
  hours       numeric(6,2) not null check (hours >= 0),
  kind        entry_type not null default 'Job',
  paid        boolean not null default false,
  entered_by  text,
  created_at  timestamptz not null default now(),
  -- a Job entry with no job_id is exactly how Rosa's 152 orphan rows happened
  constraint job_entries_need_a_job check (kind <> 'Job' or job_id is not null)
);
create index if not exists time_job_idx  on time_entries (job_id);
create index if not exists time_date_idx on time_entries (work_date);


-- ---------- job costs ----------
create table if not exists job_costs (
  cost_id    uuid primary key default gen_random_uuid(),
  job_id     text not null references jobs(job_id) on delete cascade,
  category   cost_category not null,
  vendor     text,
  amount     numeric(12,2) not null,
  cost_date  date,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists costs_job_idx on job_costs (job_id);


-- ---------- leads ----------
create table if not exists leads (
  lead_id    uuid primary key default gen_random_uuid(),
  lead_date  date not null,
  name       text not null,
  phone      text,
  email      text,
  source     text,
  status     lead_status not null default 'New',
  est_value  numeric(12,2),
  job_id     text references jobs(job_id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists leads_source_idx on leads (source);
create index if not exists leads_date_idx   on leads (lead_date);


-- ============================================================
--  The money view. Every margin in the app reads from here so
--  four screens can never report four different totals again.
-- ============================================================
create or replace view job_financials as
with s as (select coalesce(max(labor_rate), 35.00) as labor_rate from settings),
hrs as (
  select job_id, sum(hours) as hours
  from time_entries
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
  coalesce(hrs.hours, 0) * (select labor_rate from s)           as labor_cost,
  coalesce(c.direct_materials, 0)                               as material_cost,
  coalesce(c.additional_costs, 0)                               as additional_cost,
  case when j.contract_price is null then null
       else j.contract_price + j.change_orders - j.discounts end as revenue,
  case when j.contract_price is null then 0
       else (j.contract_price + j.change_orders - j.discounts)
            * (j.overhead_pct / 100) end                        as overhead_cost,
  -- unpriced: has a contract but nothing recorded going out.
  -- These are NOT 100% margin. They are unmeasured, and they stay
  -- out of every average until a cost or an hour is entered.
  (j.contract_price is not null
    and coalesce(hrs.hours, 0) = 0
    and coalesce(c.cost_rows, 0) = 0)                           as unpriced
from jobs j
left join hrs on hrs.job_id = j.job_id
left join c   on c.job_id   = j.job_id;


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


-- ============================================================
--  Row Level Security — signed in, or you see nothing.
--  Only Alex, Kris, Rosa, and Victor get accounts.
-- ============================================================
alter table jobs         enable row level security;
alter table time_entries enable row level security;
alter table job_costs    enable row level security;
alter table leads        enable row level security;
alter table settings     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['jobs','time_entries','job_costs','leads'] loop
    execute format('drop policy if exists team_all on %I', t);
    execute format(
      'create policy team_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- settings is read/update only. Deleting row 1 would make labor_rate null,
-- and every margin in the app would quietly go wrong instead of failing loudly.
drop policy if exists settings_read on settings;
create policy settings_read on settings for select to authenticated using (true);
drop policy if exists settings_update on settings;
create policy settings_update on settings for update to authenticated
  using (true) with check (id = 1);


-- keep updated_at honest
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists jobs_touch on jobs;
create trigger jobs_touch before update on jobs
  for each row execute function touch_updated_at();

drop trigger if exists settings_touch on settings;
create trigger settings_touch before update on settings
  for each row execute function touch_updated_at();
