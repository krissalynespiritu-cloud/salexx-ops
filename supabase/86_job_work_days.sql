-- ============================================================
-- 86_job_work_days.sql
--
-- Job Costing shows total labor cost and total hours, but nothing
-- about how long the crew was actually on a job -- not the planned
-- schedule, but the real spread of days someone logged time against
-- it. This rolls time_entries up per job into a day count plus the
-- first/last day worked, the same way job_vendor_invoice_totals
-- (36_vendor_invoices.sql) rolls up invoices per job.
--
-- Distinct work_date, not row count -- a job can have several people
-- (or several blocks for one person) logged on the same day, and that
-- should still count as one day worked, not several.
--
-- Safe to re-run.
-- ============================================================

create or replace view job_work_days as
select
  job_id,
  count(distinct work_date) as days_worked,
  min(work_date) as first_work_date,
  max(work_date) as last_work_date
from time_entries
where kind = 'Job' and job_id is not null
group by job_id;

-- verify
select job_id, days_worked, first_work_date, last_work_date
from job_work_days
order by days_worked desc
limit 5;
