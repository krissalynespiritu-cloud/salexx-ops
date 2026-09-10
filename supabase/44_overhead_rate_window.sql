-- ============================================================
-- 44_overhead_rate_window.sql
--
-- The "Suggested rate" tile on the Overhead page was comparing one
-- year of overhead against ALL-TIME booked revenue (every job in the
-- system, ~2+ years, ~$2.7M). That understates the rate badly -- it
-- showed ~6.5% while jobs are charged 18%.
--
-- This redefines overhead_rate_check so the revenue denominator is
-- the trailing 12 months (jobs whose completed date -- or sold date
-- if not yet completed -- falls in the last year). Same overhead
-- numerator, a matching time window.
--
-- It also adds an all-in rate (full overhead including office payroll,
-- divided by the same revenue) -- that is the number that actually
-- lines up against the 18% charged.
--
-- CREATE OR REPLACE VIEW cannot rename or reorder existing columns,
-- so the original seven columns stay exactly as they were and the two
-- new ones are appended at the end.
--
-- Touches no data -- just the view. Run any time. Safe to re-run.
-- ============================================================

create or replace view overhead_rate_check as
with oh as (
  select
    sum(yearly_cost)                                  as total_yearly,
    sum(yearly_cost) filter (where in_job_rate)       as chargeable_yearly,
    sum(yearly_cost) filter (where not in_job_rate)   as payroll_yearly
  from overhead_expenses
  where active
),
rev as (
  select coalesce(sum(revenue), 0) as booked_revenue
  from job_margins
  where revenue is not null
    and coalesce(completed_date, sold_date) >= (current_date - interval '12 months')
)
select
  oh.total_yearly,
  oh.chargeable_yearly,
  oh.payroll_yearly,
  rev.booked_revenue,
  round(100.0 * oh.chargeable_yearly / nullif(rev.booked_revenue, 0), 1)
    as suggested_overhead_pct,
  round(100.0 * oh.total_yearly / nullif(rev.booked_revenue, 0), 1)
    as pct_if_payroll_included_do_not_use,
  (select round(avg(overhead_pct), 1) from jobs) as currently_charged_pct,
  round(100.0 * oh.total_yearly / nullif(rev.booked_revenue, 0), 1)
    as overhead_pct_all_in,
  'trailing 12 months'::text as booked_revenue_window
from oh, rev;

-- verify
select
  to_char(booked_revenue,'FM999,999,990.00') as trailing_12mo_revenue,
  suggested_overhead_pct                     as chargeable_rate_pct,
  overhead_pct_all_in                        as all_in_rate_pct,
  currently_charged_pct
from overhead_rate_check;
