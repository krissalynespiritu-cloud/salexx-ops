-- ============================================================
--  Salexx Ops Hub — Phase 1 expansion
--  estimates · crew · payments
--
--  Closes the money loop: lead → estimate → job → payment.
--  Right now the system knows $1.4M was sold and nothing about
--  what was collected.
--
--  Run AFTER 01_schema.sql and 02_seed.sql. Safe to re-run.
-- ============================================================

do $$ begin
  create type estimate_status as enum
    ('Draft','Sent','Shown','Accepted','Invoiced','Lost','Cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum
    ('Check','Card','ACH / Transfer','Cash','Financing','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crew_role as enum ('Crew','Admin','Manager','Subcontractor');
exception when duplicate_object then null; end $$;


-- ============================================================
--  crew — replaces the hardcoded people[] array in index.html
--  and the Manager1/2/3 tabs.
-- ============================================================
create table if not exists crew (
  person_id     uuid primary key default gen_random_uuid(),
  name          text not null unique,
  role          crew_role not null default 'Crew',
  hourly_wage   numeric(8,2),        -- null = fall back to settings.labor_rate
  active        boolean not null default true,
  started_on    date,
  notes         text,
  created_at    timestamptz not null default now()
);

insert into crew (name, role) values
  ('Carlos','Crew'), ('Tito','Crew'), ('Roberto','Crew'), ('Ronald','Crew'),
  ('Avelino','Crew'), ('Edy','Crew'),
  ('Rosa','Admin'), ('Krissalyn','Admin'), ('Alex','Manager'), ('Victor','Admin')
on conflict (name) do nothing;


-- ============================================================
--  estimates — the missing middle of the funnel.
--
--  Today a lead becomes a job with nothing in between, so
--  "how many estimates did we send and what happened to them"
--  is unanswerable. One lead can get several estimates; only
--  the accepted one becomes a job.
-- ============================================================
create table if not exists estimates (
  estimate_id   uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(lead_id) on delete set null,
  job_id        text references jobs(job_id) on delete set null,
  client_name   text not null,
  job_type      text,
  amount        numeric(12,2),
  status        estimate_status not null default 'Draft',
  estimator     text references crew(name) on delete set null,
  sent_date     date,
  shown_date    date,          -- the "Shows Tracker"
  decided_date  date,          -- accepted or lost
  design_sent   boolean not null default false,
  design_sold   boolean not null default false,
  design_paid   boolean not null default false,
  lost_reason   text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
  -- No constraint tying Accepted -> job_id: an estimate is often marked
  -- accepted before the job record is created, and Postgres won't allow
  -- a time-based grace period in a CHECK (now() isn't IMMUTABLE).
  -- The orphan check below finds these instead.
);
create index if not exists est_status_idx on estimates (status);
create index if not exists est_sent_idx   on estimates (sent_date);


-- ============================================================
--  payments — what actually came in.
--
--  Sold is not collected. This is the difference between
--  "we had a good year" and "we can make payroll".
-- ============================================================
create table if not exists payments (
  payment_id    uuid primary key default gen_random_uuid(),
  job_id        text not null references jobs(job_id) on delete restrict,
  amount        numeric(12,2) not null check (amount <> 0),
  paid_on       date not null,
  method        payment_method,
  reference     text,          -- check number, transaction id
  is_deposit    boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists pay_job_idx  on payments (job_id);
create index if not exists pay_date_idx on payments (paid_on);


-- ============================================================
--  Labor cost per person.
--
--  Every hour currently costs $35 whether it's Tito or a sub.
--  This uses each person's wage when one is set and falls back
--  to the company rate when it isn't — so nothing breaks today,
--  and accuracy improves as wages get filled in.
-- ============================================================
create or replace view time_entry_costs as
select
  t.entry_id, t.job_id, t.person, t.work_date, t.hours, t.kind, t.paid,
  coalesce(c.hourly_wage, (select coalesce(max(labor_rate), 35.00) from settings))
    as effective_rate,
  t.hours * coalesce(c.hourly_wage,
    (select coalesce(max(labor_rate), 35.00) from settings)) as labor_cost
from time_entries t
left join crew c on c.name = t.person;


-- ============================================================
--  Money in vs money out, per job.
-- ============================================================
create or replace view job_payments as
select
  j.job_id,
  j.client_name,
  m.revenue,
  coalesce(sum(p.amount), 0)                        as collected,
  coalesce(m.revenue, 0) - coalesce(sum(p.amount), 0) as balance_due,
  max(p.paid_on)                                    as last_payment_on,
  count(p.payment_id)                               as payment_count,
  case
    when m.revenue is null                              then 'No contract'
    when coalesce(sum(p.amount), 0) = 0                 then 'Nothing collected'
    when coalesce(sum(p.amount), 0) >= m.revenue        then 'Paid in full'
    else 'Partially paid'
  end                                               as payment_status
from jobs j
left join job_margins m on m.job_id = j.job_id
left join payments   p on p.job_id = j.job_id
group by j.job_id, j.client_name, m.revenue;


-- ============================================================
--  Estimate funnel — replaces Estimates Tracker, Shows Tracker,
--  Design Sent/Sold/Paid, and Estimate-per-day in one query.
-- ============================================================
create or replace view estimate_funnel as
select
  date_trunc('month', coalesce(sent_date, created_at::date))::date as month,
  count(*)                                          as estimates,
  count(*) filter (where status = 'Sent')           as sent,
  count(*) filter (where shown_date is not null)    as shown,
  count(*) filter (where status = 'Accepted')       as accepted,
  count(*) filter (where status = 'Lost')           as lost,
  count(*) filter (where design_sent)               as design_sent,
  count(*) filter (where design_sold)               as design_sold,
  sum(amount)                                       as total_value,
  sum(amount) filter (where status = 'Accepted')    as won_value,
  round(100.0 * count(*) filter (where status = 'Accepted')
        / nullif(count(*) filter (where status in ('Accepted','Lost')), 0), 1)
                                                    as close_rate_pct
from estimates
group by 1
order by 1 desc;


-- ---------- RLS: same team-wide policy as everything else ----------
alter table crew      enable row level security;
alter table estimates enable row level security;
alter table payments  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['crew','estimates','payments'] loop
    execute format('drop policy if exists team_all on %I', t);
    execute format(
      'create policy team_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop trigger if exists estimates_touch on estimates;
create trigger estimates_touch before update on estimates
  for each row execute function touch_updated_at();


-- Accepted estimates that never got linked to a job. Not an error at the
-- moment of acceptance — but if one sits here for a week, someone forgot
-- to create the job.
create or replace view estimates_needing_jobs as
select estimate_id, client_name, amount, decided_date, estimator,
       current_date - coalesce(decided_date, created_at::date) as days_waiting
from estimates
where status = 'Accepted' and job_id is null
order by days_waiting desc;
