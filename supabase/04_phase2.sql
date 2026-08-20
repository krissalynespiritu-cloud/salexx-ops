-- ============================================================
--  Salexx Ops Hub — Phase 2
--  overhead_expenses · job_updates · Monday alignment
--
--  Run AFTER 03_phase1.sql. Safe to re-run.
-- ============================================================

do $$ begin
  create type overhead_category as enum (
    'Accounting & Compliance','Insurance','Marketing & Advertising',
    'Office & Utilities','Software & Subscriptions','Telecommunications',
    'Fleet & Vehicle Costs','Payroll','Facilities & Property',
    'Training & Education','Donations','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type update_kind as enum ('Note','Status Change','Client Contact','Issue','Photo');
exception when duplicate_object then null; end $$;


-- ============================================================
--  overhead_expenses — the OH Tracker 2026, one row per line item.
--
--  Yearly cost is the source figure; monthly and daily are derived,
--  never typed. In the spreadsheet they were hand-entered and several
--  drifted out of sync with the yearly number.
-- ============================================================
create table if not exists overhead_expenses (
  expense_id    uuid primary key default gen_random_uuid(),
  item          text not null,
  category      overhead_category not null,
  yearly_cost   numeric(12,2) not null,
  -- Payroll sits in the overhead tracker AND is charged to jobs at the
  -- hourly rate. Counting both double-charges every job, so payroll rows
  -- are flagged and excluded from the job-overhead rate calculation.
  in_job_rate   boolean not null default true,
  active        boolean not null default true,
  vendor        text,
  renews_on     date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists oh_category_idx on overhead_expenses (category);

insert into overhead_expenses (item, category, yearly_cost, in_job_rate) values
  ('Bookkeeping + payroll service','Accounting & Compliance',2880,true),
  ('CCB (charged every 2 years)','Accounting & Compliance',200,true),
  ('Lead cert','Accounting & Compliance',50,true),
  ('Sec of State (yearly)','Accounting & Compliance',100,true),
  ('Geico insurance','Insurance',10800,true),
  ('Liability insurance','Insurance',4432,true),
  ('Marketing FB ADS','Marketing & Advertising',36000,true),
  ('Marketing agency','Marketing & Advertising',18000,true),
  ('St Peter Advertising','Marketing & Advertising',1000,true),
  ('Computer paper, ink, supplies','Office & Utilities',600,true),
  ('BV','Software & Subscriptions',1740,true),
  ('Company Cam','Software & Subscriptions',853,true),
  ('Domain','Software & Subscriptions',61.29,true),
  ('Estimating software','Software & Subscriptions',620,true),
  ('Go High Level','Software & Subscriptions',2200,true),
  ('Google Workspace','Software & Subscriptions',168,true),
  ('Hostgator hosting','Software & Subscriptions',360,true),
  ('Monday.com','Software & Subscriptions',720,true),
  ('Website hosting','Software & Subscriptions',791.40,true),
  ('Tracki','Software & Subscriptions',336,true),
  ('Zapier automation','Software & Subscriptions',240,true),
  ('Verizon','Telecommunications',5760,true),
  ('7x14 trailer (paid)','Fleet & Vehicle Costs',2400,true),
  ('Truck 1 Land Rover','Fleet & Vehicle Costs',12732,true),
  ('Chevy van 2 2025','Fleet & Vehicle Costs',9000,true),
  ('Truck 3 black 2025','Fleet & Vehicle Costs',14294,true),
  ('Truck 4 white ram','Fleet & Vehicle Costs',10916,true),
  ('Truck 5 ram 1500','Fleet & Vehicle Costs',5280,true),
  ('Porta-potty (paid)','Facilities & Property',1800,true),
  ('Learning','Training & Education',18000,true),
  ('Donation','Donations',1200,true),
  -- Warehouse had no category in the sheet, so it was left out of the
  -- Category Summary entirely — the sheet's own total was $38,400 short.
  ('Warehouse','Facilities & Property',38400,true),
  -- Payroll rows are excluded from the job overhead rate: crew labor is
  -- already charged per hour on each job. Counting both double-charges.
  ('AS','Payroll',150000,false),
  ('Marketing asst','Payroll',18720,false),
  ('Office Payroll/Admin','Payroll',49000,false),
  ('Marketing asst 2','Payroll',50600,false)
on conflict do nothing;


-- ============================================================
--  Overhead rollup. Monthly and daily are calculated, so they
--  cannot drift from the yearly figure the way the sheet did.
-- ============================================================
create or replace view overhead_summary as
select
  category,
  count(*)                              as items,
  sum(yearly_cost)                      as yearly,
  round(sum(yearly_cost) / 12, 2)       as monthly,
  round(sum(yearly_cost) / 365, 2)      as daily,
  bool_and(in_job_rate)                 as counts_toward_job_rate
from overhead_expenses
where active
group by category
order by sum(yearly_cost) desc;


-- ============================================================
--  What the job overhead % SHOULD be, from real numbers.
--
--  Compare this against jobs.overhead_pct (currently 12). If the
--  suggested rate drifts far from what jobs are charged, margins
--  are quietly wrong.
-- ============================================================
create or replace view overhead_rate_check as
with oh as (
  select
    sum(yearly_cost)                                  as total_yearly,
    sum(yearly_cost) filter (where in_job_rate)       as chargeable_yearly,
    sum(yearly_cost) filter (where not in_job_rate)   as payroll_yearly
  from overhead_expenses where active
),
rev as (select sum(revenue) as booked_revenue from job_margins)
select
  oh.total_yearly,
  oh.chargeable_yearly,
  oh.payroll_yearly,
  rev.booked_revenue,
  round(100.0 * oh.chargeable_yearly / nullif(rev.booked_revenue,0), 1)
    as suggested_overhead_pct,
  round(100.0 * oh.total_yearly / nullif(rev.booked_revenue,0), 1)
    as pct_if_payroll_included_do_not_use,
  (select round(avg(overhead_pct),1) from jobs) as currently_charged_pct
from oh, rev;


-- ============================================================
--  job_updates — the Monday "Updates" thread.
--
--  This is where "Project is on pause she ordered the wrong size"
--  lives. Losing these loses the reason anything happened.
-- ============================================================
create table if not exists job_updates (
  update_id     uuid primary key default gen_random_uuid(),
  job_id        text references jobs(job_id) on delete cascade,
  estimate_id   uuid references estimates(estimate_id) on delete cascade,
  author        text not null,
  body          text not null,
  kind          update_kind not null default 'Note',
  posted_at     timestamptz not null default now(),
  monday_post_id text,
  -- an update has to be about something
  constraint update_needs_a_subject
    check (job_id is not null or estimate_id is not null)
);
create index if not exists upd_job_idx  on job_updates (job_id, posted_at desc);
create index if not exists upd_date_idx on job_updates (posted_at desc);


-- ============================================================
--  Monday stage alignment.
--
--  The board's group names are the source of truth — these are what
--  Rosa and Alex see every day. Renaming enum values keeps existing
--  rows valid.
-- ============================================================
do $$ begin
  alter type job_stage rename value 'Ready for scheduling' to 'Ready For Scheduling';
exception when others then null; end $$;
do $$ begin
  alter type job_stage rename value 'Final walk through' to 'Final Walk-through';
exception when others then null; end $$;
do $$ begin
  alter type job_stage rename value 'Touch-ups' to 'Punch list / Touch-ups';
exception when others then null; end $$;
do $$ begin
  alter type job_stage rename value 'Final Payment due' to 'Final payment due';
exception when others then null; end $$;
do $$ begin
  alter type job_stage rename value 'Final photos/videos' to 'Final Photos / Videos';
exception when others then null; end $$;
do $$ begin
  alter type job_stage rename value 'In progress' to 'In Progress';
exception when others then null; end $$;


-- ============================================================
--  Per-person hourly rates from the OH Tracker's Crew Hourly Rate
--  block. Initials only in the sheet — map them to names before
--  these take effect. Until then time_entry_costs falls back to
--  the company rate, so nothing breaks.
-- ============================================================
create table if not exists crew_rate_import (
  initials   text primary key,
  rate       numeric(8,2) not null,
  mapped_to  text references crew(name) on delete set null,
  note       text
);
insert into crew_rate_import (initials, rate, note) values
  ('BT',31.00,'From OH Tracker 2026 — map to a crew name to activate'),
  ('MR',38.00,'From OH Tracker 2026 — map to a crew name to activate'),
  ('BA',25.00,'From OH Tracker 2026 — map to a crew name to activate')
on conflict (initials) do nothing;


-- ---------- RLS ----------
alter table overhead_expenses enable row level security;
alter table job_updates       enable row level security;
alter table crew_rate_import  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['overhead_expenses','job_updates','crew_rate_import'] loop
    execute format('drop policy if exists team_all on %I', t);
    execute format(
      'create policy team_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop trigger if exists oh_touch on overhead_expenses;
create trigger oh_touch before update on overhead_expenses
  for each row execute function touch_updated_at();
