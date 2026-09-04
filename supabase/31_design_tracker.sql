-- ============================================================
--  Salexx Ops Hub — Design Sold Tracker
--
--  Date / Design Invoice Sent / Design Sold / Close Rate.
--
--  Same shape as the Admin and Closer trackers (23, 24). `leads`
--  has never had fields for "design invoice sent" or "design sold" —
--  design_sent_date / design_sold_date add them so future days
--  compute live from real lead records. Historical days come from the
--  Design Sold Tracker tab of the Financial Performance Dashboard,
--  imported as-is (the sheet is almost empty — 3 invoices sent,
--  2 designs sold across four days in May–July 2026).
--
--  Run any time. Safe to re-run — the import only inserts, never
--  overwrites, and the view is create-or-replace.
-- ============================================================

alter table leads add column if not exists design_sent_date date;
alter table leads add column if not exists design_sold_date date;

create table if not exists design_daily_import (
  log_date     date primary key,
  design_sent  int not null default 0,
  design_sold  int not null default 0
);

insert into design_daily_import (log_date, design_sent, design_sold) values
('2026-05-01',0,0),
('2026-05-02',0,0),
('2026-05-03',0,0),
('2026-05-04',0,0),
('2026-05-05',0,0),
('2026-05-06',0,0),
('2026-05-07',0,0),
('2026-05-08',0,0),
('2026-05-09',0,1),
('2026-05-10',0,0),
('2026-05-11',0,0),
('2026-05-12',0,0),
('2026-05-13',0,0),
('2026-05-14',0,1),
('2026-05-15',0,0),
('2026-05-16',0,0),
('2026-05-17',0,0),
('2026-05-18',0,0),
('2026-05-19',0,0),
('2026-05-20',0,0),
('2026-05-21',0,0),
('2026-05-22',0,0),
('2026-05-23',0,0),
('2026-05-24',0,0),
('2026-05-25',0,0),
('2026-05-26',0,0),
('2026-05-27',0,0),
('2026-05-28',0,0),
('2026-05-29',0,0),
('2026-05-30',1,0),
('2026-05-31',0,0),
('2026-06-01',0,0),
('2026-06-02',0,0),
('2026-06-03',0,0),
('2026-06-04',0,0),
('2026-06-05',0,0),
('2026-06-06',0,0),
('2026-06-07',0,0),
('2026-06-08',0,0),
('2026-06-09',0,0),
('2026-06-10',0,0),
('2026-06-11',0,0),
('2026-06-12',0,0),
('2026-06-13',0,0),
('2026-06-14',0,0),
('2026-06-15',0,0),
('2026-06-16',0,0),
('2026-06-17',0,0),
('2026-06-18',0,0),
('2026-06-19',0,0),
('2026-06-20',0,0),
('2026-06-21',0,0),
('2026-06-22',0,0),
('2026-06-23',0,0),
('2026-06-24',0,0),
('2026-06-25',0,0),
('2026-06-26',0,0),
('2026-06-27',0,0),
('2026-06-28',0,0),
('2026-06-29',0,0),
('2026-06-30',0,0),
('2026-07-01',0,0),
('2026-07-02',0,0),
('2026-07-03',0,0),
('2026-07-04',0,0),
('2026-07-05',0,0),
('2026-07-06',0,0),
('2026-07-07',0,0),
('2026-07-08',0,0),
('2026-07-09',0,0),
('2026-07-10',0,0),
('2026-07-11',0,0),
('2026-07-12',0,0),
('2026-07-13',0,0),
('2026-07-14',0,0),
('2026-07-15',0,0),
('2026-07-16',0,0),
('2026-07-17',0,0),
('2026-07-18',0,0),
('2026-07-19',0,0),
('2026-07-20',0,0),
('2026-07-21',0,0),
('2026-07-22',0,0),
('2026-07-23',0,0),
('2026-07-24',0,0),
('2026-07-25',0,0),
('2026-07-26',0,0),
('2026-07-27',0,0),
('2026-07-28',0,0),
('2026-07-29',2,0),
('2026-07-30',0,0),
('2026-07-31',0,0),
('2026-08-01',0,0),
('2026-08-02',0,0),
('2026-08-03',0,0),
('2026-08-04',0,0),
('2026-08-05',0,0),
('2026-08-06',0,0),
('2026-08-07',0,0),
('2026-08-08',0,0),
('2026-08-09',0,0),
('2026-08-10',0,0),
('2026-08-11',0,0),
('2026-08-12',0,0),
('2026-08-13',0,0),
('2026-08-14',0,0),
('2026-08-15',0,0),
('2026-08-16',0,0),
('2026-08-17',0,0),
('2026-08-18',0,0),
('2026-08-19',0,0),
('2026-08-20',0,0),
('2026-08-21',0,0),
('2026-08-22',0,0),
('2026-08-23',0,0),
('2026-08-24',0,0),
('2026-08-25',0,0),
('2026-08-26',0,0),
('2026-08-27',0,0),
('2026-08-28',0,0),
('2026-08-29',0,0),
('2026-08-30',0,0),
('2026-08-31',0,0)
on conflict (log_date) do nothing;

alter table design_daily_import enable row level security;
drop policy if exists team_all on design_daily_import;
create policy team_all on design_daily_import for all to authenticated using (true) with check (true);

-- One combined log: imported historical rows, computed live for every
-- other date (2026-09-01 onward) from real lead records.
create or replace view design_daily as
with sent as (
  select design_sent_date as d, count(*) as n from leads
  where design_sent_date is not null group by 1
),
sold as (
  select design_sold_date as d, count(*) as n from leads
  where design_sold_date is not null group by 1
),
live as (
  select coalesce(s.d, x.d) as log_date,
         coalesce(s.n, 0) as design_sent,
         coalesce(x.n, 0) as design_sold
  from sent s
  full join sold x on x.d = s.d
  where coalesce(s.d, x.d) not in (select log_date from design_daily_import)
)
select log_date, design_sent, design_sold from design_daily_import
union all
select log_date, design_sent, design_sold from live
order by 1 desc;
