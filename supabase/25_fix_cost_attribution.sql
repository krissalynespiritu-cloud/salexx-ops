-- ============================================================
--  Salexx Ops Hub — reattach misfiled cost rows
--
--  The six cost rows in 02_seed.sql were extracted from the old
--  workbooks during an early prototype, when the SLX numbering was
--  different. SLX-052 was Adriana Britton then and SLX-047 was
--  Heather Cole. When the seed was regenerated with final ids, the
--  client list shifted but the cost rows kept the old numbers.
--
--  Result: Adriana's $14,214 of cost landed on Elda Hernandez's
--  $5,175 job, showing -186% margin. Not a real loss — a misfiled row.
--
--  Matched by CLIENT NAME, not job id, because ids have shifted
--  several times since. Only touches rows whose amount matches
--  exactly, so it can't move anything entered since.
--
--  Run AFTER 24. Safe to re-run.
-- ============================================================

-- ---------- materials ----------
update job_costs c set job_id = t.correct_id
from (values
  ('SLX-052', 10714.00, 'Adriana Britton'),
  ('SLX-047', 10860.00, 'Heather'),
  ('SLX-044',   949.00, 'Brad'),
  ('SLX-050',   555.00, 'Jacob Bohanam')
) as v(wrong_id, amount, client)
join lateral (
  select job_id as correct_id from jobs
  where lower(trim(client_name)) = lower(trim(v.client))
  order by job_id limit 1
) t on true
where c.job_id = v.wrong_id
  and c.category = 'Materials'
  and c.amount = v.amount;

-- ---------- subcontractors (moved to sub_payments by file 10) ----------
update sub_payments s set job_id = t.correct_id
from (values
  ('SLX-052', 3500.00, 'Adriana Britton'),
  ('SLX-047', 6600.00, 'Heather'),
  ('SLX-050',  730.00, 'Jacob Bohanam')
) as v(wrong_id, amount, client)
join lateral (
  select job_id as correct_id from jobs
  where lower(trim(client_name)) = lower(trim(v.client))
  order by job_id limit 1
) t on true
where s.job_id = v.wrong_id
  and s.contract_amount = v.amount;

-- Judy Durand ($10,631) and Kolene Hammer ($7,942) kept their original
-- ids by coincidence and were already correct. Left alone.


-- ---------- verify ----------
-- Every job whose costs exceed its revenue. After this runs, a job
-- appearing here is a genuine loss worth investigating, not a data bug.
create or replace view jobs_costing_more_than_revenue as
select job_id, client_name, revenue, total_job_cost, gross_profit,
       margin_pct, hours, material_cost, additional_cost
from job_margins
where margin_pct is not null and gross_profit < 0
order by margin_pct;

-- The six seeded jobs, so the reattachment can be eyeballed.
create or replace view seeded_cost_check as
select m.job_id, m.client_name, m.revenue, m.material_cost,
       m.total_job_cost, m.margin_pct
from job_margins m
where lower(m.client_name) in
  ('adriana britton','heather','brad','jacob bohanam',
   'judy durand','kolene hammer','elda hernandez','kurt lorenzen',
   'dave pendleton')
order by m.client_name;
