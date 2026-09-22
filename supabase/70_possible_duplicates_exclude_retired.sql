-- ============================================================
-- 70_possible_duplicates_exclude_retired.sql
--
-- possible_duplicates (19_reconcile.sql) predates the `retired`
-- column (migration 64) and was never updated to exclude retired
-- jobs from its candidate groups -- the same gap migration 66 fixed
-- for job_financials. A job already resolved via Retire Job would
-- otherwise keep showing up here as if it still needed review.
--
-- Candidate logic is otherwise byte-for-byte unchanged: same client
-- name, more than one job, at least one not linked to Monday.
--
-- Read-only view definition change. No data modified.
--
-- Run any time. Safe to re-run.
-- ============================================================

create or replace view possible_duplicates as
select
  lower(trim(client_name)) as client_key,
  count(*)                 as job_count,
  count(*) filter (where monday_item_id is null) as unlinked,
  string_agg(job_id || ' [' || coalesce(stage::text,'?') || ' ' ||
             coalesce(contract_price::text,'no price') || ']', ' | '
             order by job_id) as jobs
from jobs
where not retired
group by 1
having count(*) > 1 and count(*) filter (where monday_item_id is null) > 0
order by 2 desc;
