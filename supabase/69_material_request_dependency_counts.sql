-- ============================================================
-- 69_material_request_dependency_counts.sql
--
-- Same delete-safety pattern as job_dependency_counts() (migration
-- 65) and estimate_dependency_counts() (migration 68), scoped to
-- material_requests: the one table that references it via
-- ON DELETE CASCADE is material_request_items -- the ordered/
-- received quantity lines tracked against that request. A hard
-- delete on material_requests silently wipes those today with no
-- warning; this function is what the app checks BEFORE allowing
-- that delete.
--
-- vendor_invoices.request_id is ON DELETE SET NULL, not CASCADE --
-- linked invoices already survive a material_requests delete
-- untouched (just unlinked), so they're intentionally not counted
-- here.
--
-- Read-only. No table changes, no audit log, no soft-delete state --
-- deleteMatReqRecord() stays a real, permanent delete; this only
-- gates whether it's allowed to run.
--
-- Run any time. Safe to re-run.
-- ============================================================

create or replace function material_request_dependency_counts(p_request_id uuid)
returns table (
  material_request_items bigint,
  total                   bigint
)
language sql stable as $$
  select
    count(*) as material_request_items,
    count(*) as total
  from material_request_items
  where request_id = p_request_id;
$$;
