-- ============================================================
-- 103_retire_keep_history.sql
--
-- Archiving finished 2025 jobs (Kris, 2026-10-03: "retire those
-- completed 2025 jobs, only 2026 must stay").
--
-- retire_job() (65_*) refuses any job that still has linked records,
-- which is right for retiring a duplicate/invalid job -- but a real,
-- finished job from last year always has its cost lines attached, and
-- those belong to it. So this adds a second, narrower path:
--
--  retire_job_keep_history(job_id, reason, retired_by)
--    * ONLY for jobs in stage 'Completed' (everything else -> refused,
--      use retire_job / the app's "Retire (safe delete)" instead)
--    * same checks as retire_job: reason required, job exists, not
--      already retired
--    * flips jobs.retired = true and leaves every linked record exactly
--      where it is -- nothing is deleted, moved or reassigned. Because
--      job_financials / job_margins / client_value already skip retired
--      jobs (66_*), the job's revenue AND its costs leave the reports
--      together, so no margin is distorted.
--    * logs to job_retire_log with the full job snapshot PLUS the
--      dependency counts it kept (new column kept_dependencies)
--
--  unretire_job(job_id, by) -- puts a retired job back (retired=false)
--    and stamps the latest job_retire_log row with who/when. Works for
--    jobs retired by either function.
--
-- Then retires the 6 Completed 2025 jobs the plain retire refused
-- (audit 2026-10-03, approved by Kris -- option A). Each call is guarded
-- on job_id + still Completed + completed in 2025 + not retired, so a
-- re-run, or a job that was changed meanwhile, is a no-op.
--
-- Already retired the same day with plain retire_job (no dependencies):
-- SLX-002 Diane Engebretson, SLX-013 Jenny Kalmbach, SLX-020 Ray & Kylee.
-- Jobs SOLD in 2025 but COMPLETED in 2026 are deliberately kept.
--
-- Safe to re-run.
-- ============================================================

alter table job_retire_log add column if not exists kept_dependencies jsonb;
alter table job_retire_log add column if not exists unretired_at timestamptz;
alter table job_retire_log add column if not exists unretired_by text;

create or replace function retire_job_keep_history(p_job_id text, p_reason text, p_retired_by text default null)
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

  select * into v_job from jobs where job_id = p_job_id for update;
  if not found then
    return query select false, 'Job not found.', null::bigint;
    return;
  end if;
  if v_job.retired then
    return query select false, 'Job is already retired.', 0::bigint;
    return;
  end if;
  if v_job.stage::text <> 'Completed' then
    return query select false,
      format('Only Completed jobs can be archived with their history (this one is %s). Use Retire (safe delete) instead.', v_job.stage),
      null::bigint;
    return;
  end if;

  select * into v_dep from job_dependency_counts(p_job_id);

  update jobs set retired = true, retired_at = now(), retired_reason = trim(p_reason)
  where job_id = p_job_id;

  insert into job_retire_log (job_id, retired_by, reason, job_snapshot, kept_dependencies)
  values (p_job_id, p_retired_by, trim(p_reason), to_jsonb(v_job), to_jsonb(v_dep));

  return query select true,
    format('Archived. %s linked record(s) kept with the job.', coalesce(v_dep.total, 0)),
    coalesce(v_dep.total, 0)::bigint;
end;
$$;

create or replace function unretire_job(p_job_id text, p_by text default null)
returns table (ok boolean, message text)
language plpgsql as $$
begin
  if not exists (select 1 from jobs where job_id = p_job_id) then
    return query select false, 'Job not found.';
    return;
  end if;
  if not exists (select 1 from jobs where job_id = p_job_id and retired) then
    return query select false, 'Job is not retired.';
    return;
  end if;

  update jobs set retired = false, retired_at = null, retired_reason = null
  where job_id = p_job_id;

  update job_retire_log set unretired_at = now(), unretired_by = p_by
  where retire_id = (select retire_id from job_retire_log
                     where job_id = p_job_id and unretired_at is null
                     order by retired_at desc limit 1);

  return query select true, 'Restored.';
end;
$$;

-- Retire the 6 Completed 2025 jobs that have cost records attached.
select j.job_id, j.client_name, r.ok, r.message
from jobs j
cross join lateral retire_job_keep_history(j.job_id, '2025 – archived (completed in 2025)', 'Kris (migration 103)') r
where j.job_id in ('SLX-009','SLX-010','SLX-011','SLX-012','SLX-014','SLX-022')
  and j.stage::text = 'Completed'
  and j.completed_date >= '2025-01-01' and j.completed_date < '2026-01-01'
  and not j.retired
order by j.job_id;

-- verify: should list all 9 archived 2025 jobs
select job_id, client_name, retired, retired_reason, completed_date
from jobs where retired and retired_reason like '2025 – archived%' order by job_id;
