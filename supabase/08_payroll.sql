-- ============================================================
--  Salexx Ops Hub — Payroll paid/due tracking
--
--  Payroll amounts are never stored — they're always computed live
--  from time_entries + crew.hourly_wage, same source of truth as
--  every other number in the app. This table only remembers whether
--  a given Monday-start week has been marked paid, so the Payroll
--  tab can show Paid/Due like a real payroll screen without a
--  second copy of the money.
--
--  Run AFTER 07_crew_rates.sql. Safe to re-run.
-- ============================================================

create table if not exists payroll_periods (
  period_start  date primary key,        -- always a Monday
  paid          boolean not null default false,
  paid_on       timestamptz,
  paid_by       text,
  created_at    timestamptz not null default now()
);

alter table payroll_periods enable row level security;

drop policy if exists team_all on payroll_periods;
create policy team_all on payroll_periods for all to authenticated
  using (true) with check (true);
