-- ============================================================
-- 68_estimate_dependency_counts.sql
--
-- Read-only counterpart to job_dependency_counts(), scoped to
-- estimates: the three tables that reference an estimate via
-- ON DELETE CASCADE (job_labor_estimates.linked_estimate_id,
-- job_material_estimates.linked_estimate_id, job_updates.estimate_id).
-- A hard delete on estimates silently wipes any of these today --
-- this function is what the app checks BEFORE allowing that delete,
-- so a filled-out labor/material budget or an update note can't
-- disappear with no warning.
--
-- Read-only. No table changes, no audit log, no soft-delete state --
-- deleteEstimate() stays a real, permanent delete; this only gates
-- whether it's allowed to run.
--
-- Run any time. Safe to re-run.
-- ============================================================

create or replace function estimate_dependency_counts(p_estimate_id uuid)
returns table (
  job_labor_estimates    bigint,
  job_material_estimates bigint,
  job_updates            bigint,
  total                  bigint
)
language sql stable as $$
  with c as (
    select
      (select count(*) from job_labor_estimates    where linked_estimate_id = p_estimate_id) as job_labor_estimates,
      (select count(*) from job_material_estimates where linked_estimate_id = p_estimate_id) as job_material_estimates,
      (select count(*) from job_updates            where estimate_id = p_estimate_id) as job_updates
  )
  select c.*, (c.job_labor_estimates + c.job_material_estimates + c.job_updates) as total
  from c;
$$;
