-- ============================================================
--  Salexx Ops Hub — import the real Job Costing sheet
--
--  95 cost rows across 69 jobs, $341,230 total — from the actual
--  Job Costing tab of the Financial Performance Dashboard.
--
--  The seed only ever had 6 cost rows, and four of those were
--  misfiled. This is the real thing: Materials and Labor per job,
--  as recorded by Salexx.
--
--  ON LABOR: the app normally derives labor from time_entries x
--  hourly wage. These are historical completed jobs with no time
--  entries, so the sheet's Labor figure is the only record that
--  exists. It imports as a cost row and is SKIPPED for any job that
--  already has hours logged, so nothing double-counts.
--
--  Matched by client name. Jobs the app doesn't have are reported,
--  not silently dropped.
--
--  Run AFTER 26_add_labor_category.sql, which must be run on its
--  own first (Postgres cannot use a new enum value in the same
--  transaction that creates it). Safe to re-run.
-- ============================================================



create table if not exists costing_import (
  client_name text,
  category    text,
  amount      numeric(12,2)
);
truncate costing_import;

insert into costing_import (client_name, category, amount) values
('Judy Durand','Materials',10630.98),
('Kolene Hammer','Materials',7942.1),
('Santiago Segarra','Materials',13870.6),
('Andrew Plunkett','Materials',4793.14),
('Steve Langella','Materials',13670.4),
('Roberta Michael''s','Materials',74.36),
('Jessica Bronson','Materials',4197.0),
('Casey Wixson','Materials',573.61),
('Joyce','Materials',3637.49),
('Patti W','Materials',6380.44),
('Madeline Duran','Materials',2762.01),
('Stacey Pollard','Materials',987.2),
('Daniel Hernandez','Materials',1702.47),
('Carol Rinaldi','Materials',1813.78),
('Dana Nimz','Materials',7091.32),
('Dana Nimz','Labor',2672.5),
('Brenna White','Labor',3424.5),
('Preston','Labor',2601.0),
('Sara','Materials',6466.44),
('Sara','Labor',2855.0),
('Brad','Materials',949.07),
('Kena James','Materials',398.64),
('Kena James','Labor',1114.67),
('Jacob Bohanam','Materials',555.11),
('Jacob Bohanam','Labor',730.0),
('Adriana Britton','Materials',10713.5),
('Adriana Britton','Labor',14388.0),
('Cherylene','Materials',6607.07),
('Cherylene','Labor',973.0),
('Heather Cole','Materials',10860.0),
('Heather Cole','Labor',18314.0),
('Tom Eagleston','Materials',1657.49),
('Tom Eagleston','Labor',3843.5),
('John Richardson','Materials',4301.67),
('John Richardson','Labor',4209.0),
('Dave Pendleton','Materials',1361.39),
('Carrie Hoppe','Labor',595.25),
('Jane Vitek Dixon','Labor',3500.0),
('Elda Hernandez','Materials',756.54),
('Elda Hernandez','Labor',504.0),
('Fara Heath','Materials',7541.94),
('Fara Heath','Labor',3087.0),
('Linda Chinn','Materials',979.22),
('Linda Chinn','Labor',1221.5),
('Jesus/Teresa Santana','Materials',1898.09),
('Ronald Lai','Materials',2457.65),
('Ronald Lai','Labor',10235.0),
('Katherine Stinson','Materials',384.39),
('Katherine Stinson','Labor',2996.0),
('Chris Boucher','Materials',4058.58),
('Chris Boucher','Labor',4733.5),
('Patti Cook','Materials',1112.0),
('Patti Cook','Labor',572.0),
('Pepper Davison','Materials',735.58),
('Pepper Davison','Labor',1607.0),
('Angelina Rockelman','Materials',684.88),
('Sarah Lyn Lawton','Materials',10321.2),
('Sarah Lyn Lawton','Labor',7130.5),
('Robyn Brant','Materials',6123.49),
('Kimberly Joy','Materials',732.69),
('Kimberly Joy','Labor',3276.0),
('Darlene Lufkin','Materials',5388.64),
('Noor','Materials',1203.55),
('Robyn Bryant','Materials',5238.43),
('Robyn Bryant','Labor',730.5),
('Angelina R','Labor',811.0),
('Sam Sabin','Labor',3418.0),
('David Morton','Labor',2089.5),
('Mark','Labor',280.0),
('Darlene (Paint)','Materials',1507.5),
('Jesus santana/Teresa','Materials',408.22),
('Amanda Davies','Labor',1675.25),
('Diane Dickey','Materials',3343.08),
('Diane Dickey','Labor',1242.0),
('Cristian Rheinisch','Labor',2747.5),
('Morgan Steel','Materials',11371.7),
('Morgan Steel','Labor',1620.0),
('Derek Bliss','Labor',2029.0),
('John Tran','Labor',7994.0),
('Rhonda W','Labor',399.0),
('Jenni B','Labor',1194.5),
('Lexi Vandomelen','Labor',1121.0),
('Ryan Carle','Labor',560.0),
('David Dybdahl','Materials',346.08),
('David Dybdahl','Labor',908.5),
('Marlene Miller','Materials',1121.65),
('Marlene Miller','Labor',4150.5),
('Doug Baldwin','Materials',317.5),
('Puck Ja','Materials',364.97),
('Puck Ja','Labor',875.5),
('Joney Hanby','Labor',845.5),
('Quan Phan','Materials',11113.5),
('Quan Phan','Labor',7698.23),
('Lorraine Katz','Labor',560.0),
('Kathy','Labor',189.0);

-- Only jobs that exist, and only where this exact cost isn't already
-- recorded. Labor is skipped where hours are already logged.
insert into job_costs (job_id, category, amount, notes)
select
  j.job_id,
  i.category::cost_category,
  i.amount,
  'Imported from Job Costing sheet'
from costing_import i
join lateral (
  select job_id from jobs
  where lower(trim(client_name)) = lower(trim(i.client_name))
  order by job_id limit 1
) j on true
where not exists (
  select 1 from job_costs c
  where c.job_id = j.job_id
    and c.category = i.category::cost_category
    and c.amount = i.amount
)
and not (
  i.category = 'Labor'
  and exists (select 1 from time_entries t
              where t.job_id = j.job_id and t.kind = 'Job')
);

-- ---------- what didn't land ----------
create or replace view costing_import_unmatched as
select i.client_name, i.category, i.amount
from costing_import i
where not exists (
  select 1 from jobs j
  where lower(trim(j.client_name)) = lower(trim(i.client_name))
)
order by i.client_name;

-- ---------- the payoff ----------
create or replace view costing_coverage as
select
  count(*)                                              as jobs_total,
  count(*) filter (where not unpriced and revenue is not null) as jobs_costed,
  count(*) filter (where unpriced)                      as jobs_unpriced,
  round(sum(gross_profit) / nullif(sum(revenue) filter
        (where not unpriced), 0) * 100, 1)              as weighted_margin_pct
from job_margins;
