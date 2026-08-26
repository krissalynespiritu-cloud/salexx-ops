-- ============================================================
--  Salexx Ops Hub — Subcontractor directory
--
--  jobs.crew_type only ever said "In House" vs "Sub out" — it never
--  said WHO the sub was, whether their insurance is current, or
--  whether a W9 is on file. This is a standalone roster for that.
--  Not linked to job_costs yet — that's a natural fast-follow if
--  you want per-job sub assignment, not needed for the directory
--  itself to be useful (insurance/W9 tracking works standalone).
--
--  Run AFTER 08_payroll.sql. Safe to re-run.
-- ============================================================

create table if not exists subcontractors (
  sub_id             uuid primary key default gen_random_uuid(),
  name               text not null unique,
  trade              text,
  phone              text,
  email              text,
  insurance_provider text,
  insurance_expiry   date,
  w9_on_file         boolean not null default false,
  active             boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table subcontractors enable row level security;

drop policy if exists team_all on subcontractors;
create policy team_all on subcontractors for all to authenticated
  using (true) with check (true);

drop trigger if exists sub_touch on subcontractors;
create trigger sub_touch before update on subcontractors
  for each row execute function touch_updated_at();
