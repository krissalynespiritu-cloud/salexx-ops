-- ============================================================
-- 65_job_retire_function.sql
--
-- The two functions the Retire Job (Safe Delete) dialog uses:
--
--  job_dependency_counts(job_id) -- read-only. Counts every table
--    that can reference a job: job_costs, time_entries, payments,
--    leads, estimates, job_updates, google_reviews, sub_payments,
--    vendor_invoices, tasks, project_files, material_requests,
--    job_labor_estimates, job_material_estimates. The app calls this
--    FIRST, before showing the confirm button, so the person sees
--    exactly what's attached before deciding anything.
--
--  retire_job(job_id, reason, retired_by) -- re-checks the same
--    counts atomically (closing any race between the dialog opening
--    and the confirm click), and:
--      - refuses if the job doesn't exist, is already retired, or
--        the reason is blank
--      - refuses if ANY dependency count is nonzero -- financial and
--        history records are NEVER reassigned or deleted automatically;
--        a human has to resolve or move them first, elsewhere in the
--        app
--      - otherwise sets jobs.retired = true and writes one row to
--        job_retire_log with a full snapshot of the job, and returns
--
--    No job is ever hard-deleted by this function. A job with zero
--    dependencies is flipped to retired, never dropped from the table.
--
-- Run AFTER 64_job_retire_foundation.sql. Safe to re-run.
-- ============================================================

create or replace function job_dependency_counts(p_job_id text)
returns table (
  job_costs               bigint,
  time_entries            bigint,
  payments                bigint,
  leads                   bigint,
  estimates               bigint,
  job_updates             bigint,
  google_reviews          bigint,
  sub_payments            bigint,
  vendor_invoices         bigint,
  tasks                   bigint,
  project_files           bigint,
  material_requests       bigint,
  job_labor_estimates     bigint,
  job_material_estimates  bigint,
  total                   bigint
)
language sql stable as $$
  with c as (
    select
      (select count(*) from job_costs              where job_id = p_job_id) as job_costs,
      (select count(*) from time_entries            where job_id = p_job_id) as time_entries,
      (select count(*) from payments                where job_id = p_job_id) as payments,
      (select count(*) from leads                   where job_id = p_job_id) as leads,
      (select count(*) from estimates               where job_id = p_job_id) as estimates,
      (select count(*) from job_updates             where job_id = p_job_id) as job_updates,
      (select count(*) from google_reviews          where job_id = p_job_id) as google_reviews,
      (select count(*) from sub_payments            where job_id = p_job_id) as sub_payments,
      (select count(*) from vendor_invoices         where job_id = p_job_id) as vendor_invoices,
      (select count(*) from tasks                   where job_id = p_job_id) as tasks,
      (select count(*) from project_files           where job_id = p_job_id) as project_files,
      (select count(*) from material_requests       where job_id = p_job_id) as material_requests,
      (select count(*) from job_labor_estimates     where job_id = p_job_id) as job_labor_estimates,
      (select count(*) from job_material_estimates  where job_id = p_job_id) as job_material_estimates
  )
  select c.*,
    (c.job_costs + c.time_entries + c.payments + c.leads + c.estimates +
     c.job_updates + c.google_reviews + c.sub_payments + c.vendor_invoices +
     c.tasks + c.project_files + c.material_requests + c.job_labor_estimates +
     c.job_material_estimates) as total
  from c;
$$;

create or replace function retire_job(p_job_id text, p_reason text, p_retired_by text default null)
returns table (ok boolean, message text, dep_total bigint)
language plpgsql as $$
declare
  v_job jobs%rowtype;
  v_dep record;
begin
  if p_reason is null or trim(p_reason) = '' then
    return query select false, 'A reason is required.', null::bigint;
    return;
  end if;

  select * into v_job from jobs where job_id = p_job_id;
  if not found then
    return query select false, 'Job not found.', null::bigint;
    return;
  end if;
  if v_job.retired then
    return query select false, 'Job is already retired.', 0::bigint;
    return;
  end if;

  select * into v_dep from job_dependency_counts(p_job_id);
  if v_dep.total > 0 then
    return query select false,
      format('Blocked: %s linked record(s) still reference this job. Resolve those first.', v_dep.total),
      v_dep.total;
    return;
  end if;

  update jobs set retired = true, retired_at = now(), retired_reason = trim(p_reason)
  where job_id = p_job_id;

  insert into job_retire_log (job_id, retired_by, reason, job_snapshot)
  values (p_job_id, p_retired_by, trim(p_reason), to_jsonb(v_job));

  return query select true, 'Retired.', 0::bigint;
end;
$$;
