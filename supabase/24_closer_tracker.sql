-- ============================================================
--  Salexx Ops Hub — Closer Tracker
--
--  Date / Shows Received / Closed Deals / Revenue / Close Rate / Avg Deal Size.
--
--  Same shape as Admin Tracker (23_admin_tracker.sql): leads has no field for
--  "did this lead show up, and when" — only estimate_booked (an appointment
--  exists at all). shown/shown_date fixes that going forward. sale_date and
--  closed_revenue already exist on leads (05_phase3.sql) but nothing in the
--  app has ever read or written them — every lead has sat at status='New'
--  all along. Historical days (before those fields were ever used) are
--  imported as-is; not attempting to match the spreadsheet's named per-deal
--  rows to real lead records — that's exactly the kind of name-guessing this
--  project's Monday-sync work already ruled out as too risky.
--
--  Run any time. Safe to re-run — the import only inserts, never
--  overwrites, and the view is create-or-replace.
-- ============================================================

alter table leads add column if not exists shown boolean not null default false;
alter table leads add column if not exists shown_date date;

create table if not exists closer_daily_import (
  log_date          date primary key,
  shows_received    int not null default 0,
  closed_deals      int not null default 0,
  revenue           numeric(12,2) not null default 0
);

insert into closer_daily_import (log_date, shows_received, closed_deals, revenue) values
('2026-04-03',12,1,0.0),
('2026-04-04',5,3,0.0),
('2026-04-05',0,0,0.0),
('2026-04-06',0,0,0.0),
('2026-04-07',0,0,0.0),
('2026-04-08',0,0,0.0),
('2026-04-09',0,0,0.0),
('2026-04-10',0,0,0.0),
('2026-04-11',0,0,0.0),
('2026-04-12',0,0,0.0),
('2026-04-13',0,0,0.0),
('2026-04-14',0,1,11995.45),
('2026-04-15',0,1,5000.0),
('2026-04-16',0,0,0.0),
('2026-04-17',1,0,0.0),
('2026-04-18',1,1,20151.09),
('2026-04-19',0,0,0.0),
('2026-04-20',0,0,0.0),
('2026-04-21',0,0,0.0),
('2026-04-22',3,1,5297.32),
('2026-04-23',2,2,16276.06),
('2026-04-24',2,0,0.0),
('2026-04-25',0,0,0.0),
('2026-04-26',0,0,0.0),
('2026-04-27',1,0,0.0),
('2026-04-28',1,0,0.0),
('2026-04-29',4,2,32001.41),
('2026-04-30',0,0,0.0),
('2026-05-01',0,1,10550.25),
('2026-05-02',1,0,0.0),
('2026-05-03',0,0,0.0),
('2026-05-04',0,1,17275.23),
('2026-05-05',3,2,18900.54),
('2026-05-06',1,0,0.0),
('2026-05-07',5,0,0.0),
('2026-05-08',2,0,0.0),
('2026-05-09',1,0,0.0),
('2026-05-10',0,0,0.0),
('2026-05-11',4,1,14497.32),
('2026-05-12',1,1,4075.54),
('2026-05-13',3,0,0.0),
('2026-05-14',1,0,0.0),
('2026-05-15',0,0,0.0),
('2026-05-16',0,1,13250.56),
('2026-05-17',0,0,0.0),
('2026-05-18',1,0,0.0),
('2026-05-19',1,1,30600.75),
('2026-05-20',2,0,0.0),
('2026-05-21',0,0,0.0),
('2026-05-22',2,0,0.0),
('2026-05-23',0,0,0.0),
('2026-05-24',0,0,0.0),
('2026-05-25',0,0,0.0),
('2026-05-26',5,0,0.0),
('2026-05-27',2,0,0.0),
('2026-05-28',4,2,26875.81),
('2026-05-29',2,1,1265.0),
('2026-05-30',0,0,0.0),
('2026-05-31',0,0,0.0),
('2026-06-01',4,0,0.0),
('2026-06-02',2,0,0.0),
('2026-06-03',3,0,0.0),
('2026-06-04',1,0,0.0),
('2026-06-05',0,0,0.0),
('2026-06-06',0,0,0.0),
('2026-06-07',0,0,0.0),
('2026-06-08',1,0,0.0),
('2026-06-09',2,0,0.0),
('2026-06-10',4,1,2500.0),
('2026-06-11',2,0,0.0),
('2026-06-12',3,0,0.0),
('2026-06-13',0,0,0.0),
('2026-06-14',0,0,0.0),
('2026-06-15',0,0,0.0),
('2026-06-16',0,0,0.0),
('2026-06-17',0,0,0.0),
('2026-06-18',0,2,39901.09),
('2026-06-19',0,1,7200.45),
('2026-06-20',0,0,0.0),
('2026-06-21',0,0,0.0),
('2026-06-22',5,0,0.0),
('2026-06-23',3,2,40774.0),
('2026-06-24',2,0,0.0),
('2026-06-25',2,0,0.0),
('2026-06-26',1,0,0.0),
('2026-06-27',1,0,0.0),
('2026-06-28',0,0,0.0),
('2026-06-29',2,2,14228.26),
('2026-06-30',2,1,4450.54),
('2026-07-01',2,0,0.0),
('2026-07-02',2,0,0.0),
('2026-07-03',0,0,0.0),
('2026-07-04',2,0,0.0),
('2026-07-05',0,0,0.0),
('2026-07-06',4,0,0.0),
('2026-07-07',2,0,0.0),
('2026-07-08',2,2,50228.76),
('2026-07-09',2,0,0.0),
('2026-07-10',0,0,0.0),
('2026-07-11',0,0,0.0),
('2026-07-12',0,0,0.0),
('2026-07-13',4,0,0.0),
('2026-07-14',2,1,0.0),
('2026-07-15',1,0,0.0),
('2026-07-16',1,0,0.0),
('2026-07-17',2,0,0.0),
('2026-07-18',0,1,3295.54),
('2026-07-19',0,0,0.0),
('2026-07-20',4,0,0.0),
('2026-07-21',1,0,0.0),
('2026-07-22',2,1,4000.0),
('2026-07-23',1,0,0.0),
('2026-07-24',2,0,0.0),
('2026-07-25',0,0,0.0),
('2026-07-26',0,0,0.0),
('2026-07-27',3,0,0.0),
('2026-07-28',1,0,0.0),
('2026-07-29',1,1,8497.75),
('2026-07-30',1,0,0.0),
('2026-07-31',0,0,0.0),
('2026-08-01',0,0,0.0),
('2026-08-02',0,0,0.0),
('2026-08-03',3,0,0.0),
('2026-08-04',4,1,19521.04),
('2026-08-05',1,0,0.0),
('2026-08-06',0,1,32450.25),
('2026-08-07',1,1,13171.09),
('2026-08-08',1,0,0.0),
('2026-08-09',0,0,0.0),
('2026-08-10',2,0,0.0),
('2026-08-11',6,0,0.0),
('2026-08-12',0,1,14997.45),
('2026-08-13',2,1,14275.0),
('2026-08-14',1,0,0.0),
('2026-08-15',0,0,0.0),
('2026-08-16',0,0,0.0),
('2026-08-17',0,0,0.0),
('2026-08-18',1,0,0.0),
('2026-08-19',4,1,48000.0),
('2026-08-20',1,0,0.0),
('2026-08-21',0,0,0.0),
('2026-08-22',0,0,0.0),
('2026-08-23',0,0,0.0),
('2026-08-24',2,0,0.0),
('2026-08-25',0,0,0.0),
('2026-08-26',3,1,19779.25),
('2026-08-27',1,0,0.0),
('2026-08-28',2,0,0.0),
('2026-08-29',0,1,1497.54),
('2026-08-30',0,0,0.0),
('2026-08-31',0,0,0.0)
on conflict (log_date) do nothing;

alter table closer_daily_import enable row level security;
drop policy if exists team_all on closer_daily_import;
create policy team_all on closer_daily_import for all to authenticated using (true) with check (true);

-- One combined log: imported historical rows, computed live for every
-- other date (2026-09-01 onward) from real lead records.
create or replace view closer_daily as
with shows as (
  select shown_date as d, count(*) as n from leads
  where shown_date is not null group by 1
),
closed as (
  select sale_date as d, count(*) as n, sum(closed_revenue) as rev from leads
  where status = 'Won' and sale_date is not null
  group by 1
),
live as (
  select coalesce(s.d, c.d) as log_date,
         coalesce(s.n, 0) as shows_received,
         coalesce(c.n, 0) as closed_deals,
         coalesce(c.rev, 0) as revenue
  from shows s
  full join closed c on c.d = s.d
  where coalesce(s.d, c.d) not in (select log_date from closer_daily_import)
)
select log_date, shows_received, closed_deals, revenue from closer_daily_import
union all
select log_date, shows_received, closed_deals, revenue from live
order by 1 desc;
