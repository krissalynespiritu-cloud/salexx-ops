-- ============================================================
--  Salexx Ops Hub — raise the company overhead rate 12% -> 18%
--
--  Every job's margin is computed live in job_financials as
--  revenue * (jobs.overhead_pct / 100). Until now that rate was
--  12% on every job (the column default from 01_schema.sql). The
--  real chargeable overhead, from overhead_rate_check, sits around
--  22-23% of booked revenue, so 18% is a deliberate step toward
--  the true number without going all the way.
--
--  This does three things:
--    1. jobs.overhead_pct     default 12.00 -> 18.00 (new jobs)
--    2. settings.overhead_pct default 12.00 -> 18.00, and the row
--    3. every existing job still on the old 12.00 rate -> 18.00
--
--  Only rows at exactly 12.00 are touched, so any job that was
--  deliberately given a custom overhead rate keeps it.
--
--  EXPECT the dashboard's weighted margin to drop by roughly six
--  points of revenue after this runs — that is the point: the old
--  number was flattering because overhead was under-charged.
--
--  Run AFTER 27. Safe to re-run (the update is a no-op once every
--  job is already at 18.00).
-- ============================================================

alter table jobs     alter column overhead_pct set default 18.00;
alter table settings alter column overhead_pct set default 18.00;

update jobs set overhead_pct = 18.00 where overhead_pct = 12.00;

update settings set overhead_pct = 18.00, updated_at = now() where id = 1;


-- ---------- verify ----------
-- currently_charged_pct in this view should now read 18.0 (or close,
-- if some jobs carry a custom rate). suggested_overhead_pct is
-- unchanged — it is computed from real expense data, not this rate.
--   select currently_charged_pct, suggested_overhead_pct from overhead_rate_check;
--
-- Jobs NOT at 18.00 after this runs (i.e. the deliberate overrides):
--   select job_id, client_name, overhead_pct from jobs
--   where overhead_pct <> 18.00 order by overhead_pct;
