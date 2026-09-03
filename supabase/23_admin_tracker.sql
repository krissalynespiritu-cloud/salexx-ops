-- ============================================================
--  Salexx Ops Hub — Admin Tracker
--
--  Date / Leads Assigned / Appointments Set / Set Rate.
--
--  "Leads Assigned" per day is computable straight from leads.lead_date.
--  "Appointments Set" is not — it counts whichever day an appointment
--  actually got booked, which is often a different day than the lead
--  came in (backlog work). leads had no field for that, only whether
--  one is booked at all (estimate_booked). estimate_booked_date fixes
--  that going forward; historical days (before this column existed)
--  are imported as-is from the spreadsheet instead of guessed at.
--
--  Run any time. Safe to re-run — the import only inserts, never
--  overwrites, and the view is create-or-replace.
-- ============================================================

alter table leads add column if not exists estimate_booked_date date;

create table if not exists admin_daily_import (
  log_date          date primary key,
  leads_assigned    int not null default 0,
  appointments_set  int not null default 0
);

insert into admin_daily_import (log_date, leads_assigned, appointments_set) values
('2026-04-03',0,0),
('2026-04-04',1,0),
('2026-04-05',0,0),
('2026-04-06',4,2),
('2026-04-07',1,2),
('2026-04-08',1,1),
('2026-04-09',2,2),
('2026-04-10',0,2),
('2026-04-11',1,0),
('2026-04-12',1,0),
('2026-04-13',1,4),
('2026-04-14',3,4),
('2026-04-15',1,0),
('2026-04-16',0,1),
('2026-04-17',0,0),
('2026-04-18',0,0),
('2026-04-19',1,0),
('2026-04-20',2,4),
('2026-04-21',3,1),
('2026-04-22',1,1),
('2026-04-23',1,1),
('2026-04-24',1,0),
('2026-04-25',1,1),
('2026-04-26',1,0),
('2026-04-27',3,3),
('2026-04-28',2,2),
('2026-04-29',1,1),
('2026-04-30',2,2),
('2026-05-01',1,5),
('2026-05-02',0,0),
('2026-05-03',0,0),
('2026-05-04',1,0),
('2026-05-05',6,3),
('2026-05-06',4,4),
('2026-05-07',3,4),
('2026-05-08',1,2),
('2026-05-09',1,0),
('2026-05-10',1,0),
('2026-05-11',1,5),
('2026-05-12',0,2),
('2026-05-13',1,3),
('2026-05-14',0,0),
('2026-05-15',0,0),
('2026-05-16',0,0),
('2026-05-17',1,0),
('2026-05-18',0,1),
('2026-05-19',0,1),
('2026-05-20',1,0),
('2026-05-21',1,0),
('2026-05-22',0,2),
('2026-05-23',2,0),
('2026-05-24',1,0),
('2026-05-25',3,0),
('2026-05-26',2,5),
('2026-05-27',2,1),
('2026-05-28',3,4),
('2026-05-29',4,2),
('2026-05-30',1,0),
('2026-05-31',2,0),
('2026-06-01',1,3),
('2026-06-02',1,2),
('2026-06-03',0,3),
('2026-06-04',0,1),
('2026-06-05',0,0),
('2026-06-06',0,0),
('2026-06-07',1,0),
('2026-06-08',0,1),
('2026-06-09',1,2),
('2026-06-10',1,4),
('2026-06-11',3,2),
('2026-06-12',1,3),
('2026-06-13',0,1),
('2026-06-14',1,1),
('2026-06-15',1,1),
('2026-06-16',0,1),
('2026-06-17',1,1),
('2026-06-18',1,1),
('2026-06-19',0,1),
('2026-06-20',1,1),
('2026-06-21',0,1),
('2026-06-22',6,6),
('2026-06-23',3,4),
('2026-06-24',3,3),
('2026-06-25',1,4),
('2026-06-26',0,2),
('2026-06-27',1,2),
('2026-06-28',0,1),
('2026-06-29',3,2),
('2026-06-30',0,2),
('2026-07-01',0,2),
('2026-07-02',2,2),
('2026-07-03',0,0),
('2026-07-04',1,0),
('2026-07-05',1,0),
('2026-07-06',2,3),
('2026-07-07',2,1),
('2026-07-08',1,2),
('2026-07-09',2,2),
('2026-07-10',0,0),
('2026-07-11',2,0),
('2026-07-12',1,0),
('2026-07-13',1,4),
('2026-07-14',0,2),
('2026-07-15',3,1),
('2026-07-16',1,1),
('2026-07-17',2,2),
('2026-07-18',0,0),
('2026-07-19',1,0),
('2026-07-20',3,5),
('2026-07-21',1,1),
('2026-07-22',3,2),
('2026-07-23',0,1),
('2026-07-24',1,2),
('2026-07-25',2,0),
('2026-07-26',0,0),
('2026-07-27',2,3),
('2026-07-28',3,1),
('2026-07-29',3,1),
('2026-07-30',2,1),
('2026-07-31',1,0),
('2026-08-01',0,0),
('2026-08-02',1,0),
('2026-08-03',2,3),
('2026-08-04',5,4),
('2026-08-05',1,1),
('2026-08-06',0,0),
('2026-08-07',3,1),
('2026-08-08',1,1),
('2026-08-09',0,0),
('2026-08-10',2,2),
('2026-08-11',6,6),
('2026-08-12',1,0),
('2026-08-13',3,2),
('2026-08-14',0,1),
('2026-08-15',0,0),
('2026-08-16',0,0),
('2026-08-17',3,0),
('2026-08-18',0,1),
('2026-08-19',3,4),
('2026-08-20',2,1),
('2026-08-21',3,0),
('2026-08-22',2,0),
('2026-08-23',0,0),
('2026-08-24',3,3),
('2026-08-25',0,0),
('2026-08-26',3,3),
('2026-08-27',5,1),
('2026-08-28',2,2),
('2026-08-29',0,0),
('2026-08-30',0,0),
('2026-08-31',4,0),
('2026-09-01',9,4),
('2026-09-02',0,1)
on conflict (log_date) do nothing;

alter table admin_daily_import enable row level security;
drop policy if exists team_all on admin_daily_import;
create policy team_all on admin_daily_import for all to authenticated using (true) with check (true);

-- One combined log: imported historical rows, computed live for every
-- other date (today onward) from real lead records.
create or replace view admin_daily as
with assigned as (
  select lead_date as d, count(*) as n from leads group by 1
),
booked as (
  select estimate_booked_date as d, count(*) as n from leads
  where estimate_booked_date is not null
  group by 1
),
live as (
  select coalesce(a.d, b.d) as log_date,
         coalesce(a.n, 0) as leads_assigned,
         coalesce(b.n, 0) as appointments_set
  from assigned a
  full join booked b on b.d = a.d
  where coalesce(a.d, b.d) not in (select log_date from admin_daily_import)
)
select log_date, leads_assigned, appointments_set from admin_daily_import
union all
select log_date, leads_assigned, appointments_set from live
order by 1 desc;
