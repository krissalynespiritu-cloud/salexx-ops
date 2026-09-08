-- ============================================================
--  Salexx Ops Hub - Design Sold Tracker
--
--  Date / Design Invoice Sent / Design Sold / Close Rate. Same shape
--  as the Admin and Closer trackers (23, 24).
--
--  leads gets design_sent_date / design_sold_date so future days
--  compute live. Historical days 2026-05-01..2026-08-31 come from the
--  Design Sold Tracker sheet, which is almost empty (3 invoices sent,
--  2 designs sold).
--
--  Run any time. Safe to re-run.
-- ============================================================

alter table leads add column if not exists design_sent_date date;
alter table leads add column if not exists design_sold_date date;

create table if not exists design_daily_import (
  log_date     date primary key,
  design_sent  int not null default 0,
  design_sold  int not null default 0
);

-- every day in the range, all zero to start
insert into design_daily_import (log_date)
select d::date
from generate_series('2026-05-01'::date, '2026-08-31'::date, interval '1 day') d
on conflict (log_date) do nothing;

-- the handful of days with actual activity
update design_daily_import set design_sold = 1 where log_date in ('2026-05-09','2026-05-14');
update design_daily_import set design_sent = 1 where log_date = '2026-05-30';
update design_daily_import set design_sent = 2 where log_date = '2026-07-29';

alter table design_daily_import enable row level security;
drop policy if exists team_all on design_daily_import;
create policy team_all on design_daily_import for all to authenticated using (true) with check (true);

-- imported history, then live from lead records for every later date
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
         coalesce(s.n, 0)   as design_sent,
         coalesce(x.n, 0)   as design_sold
  from sent s
  full join sold x on x.d = s.d
  where coalesce(s.d, x.d) not in (select log_date from design_daily_import)
)
select log_date, design_sent, design_sold from design_daily_import
union all
select log_date, design_sent, design_sold from live
order by 1 desc;

-- verify: expect 123
select count(*) as imported_rows_expect_123 from design_daily_import;
