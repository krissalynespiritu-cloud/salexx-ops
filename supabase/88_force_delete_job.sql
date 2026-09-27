-- ============================================================
-- 88_force_delete_job.sql
--
-- Retire Job (65_job_retire_function.sql) and Delete Job both refuse
-- to touch a job that still has linked records (job_costs,
-- time_entries, payments, leads, estimates, job_updates,
-- google_reviews, sub_payments, vendor_invoices, tasks,
-- project_files, material_requests, either budget-estimate table,
-- job_change_orders, job_punch_items, job_permits, warranty_claims,
-- crew_assignments) -- on purpose, so nothing gets silently orphaned.
--
-- For a genuinely junk/test job, resolving each linked record by hand
-- first is real friction. force_delete_job() is the deliberate escape
-- hatch: it snapshots the job and exactly what it's about to destroy
-- into job_force_delete_log first, then deletes every linked row
-- listed above, then the job itself, all in one transaction (function
-- body is one implicit transaction -- if anything fails, nothing is
-- deleted).
--
-- This is genuinely destructive and NOT recoverable from within the
-- app -- unlike retire_job(), which only flips a flag. The app's own
-- UI requires a written reason and typing the exact job ID before
-- calling this. Run AFTER 79_crew_schedule.sql. Safe to re-run.
-- ============================================================

create table if not exists job_force_delete_log (
  log_id         uuid primary key default gen_random_uuid(),
  job_id         text not null,
  job_snapshot   jsonb not null,
  deleted_counts jsonb not null,
  deleted_by     text,
  reason         text,
  deleted_at     timestamptz not null default now()
);

alter table job_force_delete_log enable row level security;
drop policy if exists team_all on job_force_delete_log;
create policy team_all on job_force_delete_log for all to authenticated using (true) with check (true);
grant all on job_force_delete_log to anon, authenticated, service_role;

create or replace function force_delete_job(p_job_id text, p_deleted_by text default null, p_reason text default null)
returns jsonb
language plpgsql as $$
declare
  v_job jsonb;
  v_dep jsonb;
begin
  select to_jsonb(j) into v_job from jobs j where job_id = p_job_id;
  if v_job is null then
    raise exception 'Job % not found', p_job_id;
  end if;

  select to_jsonb(d) into v_dep from job_dependency_counts(p_job_id) d;

  insert into job_force_delete_log (job_id, job_snapshot, deleted_counts, deleted_by, reason)
  values (p_job_id, v_job, v_dep, p_deleted_by, p_reason);

  delete from job_costs              where job_id = p_job_id;
  delete from time_entries           where job_id = p_job_id;
  delete from payments               where job_id = p_job_id;
  delete from leads                  where job_id = p_job_id;
  delete from estimates              where job_id = p_job_id;
  delete from job_updates            where job_id = p_job_id;
  delete from google_reviews         where job_id = p_job_id;
  delete from sub_payments           where job_id = p_job_id;
  delete from vendor_invoices        where job_id = p_job_id;
  delete from tasks                  where job_id = p_job_id;
  delete from project_files          where job_id = p_job_id;
  delete from material_requests      where job_id = p_job_id; -- cascades to material_request_items
  delete from job_labor_estimates    where job_id = p_job_id;
  delete from job_material_estimates where job_id = p_job_id;
  delete from job_change_orders      where job_id = p_job_id;
  delete from job_punch_items        where job_id = p_job_id;
  delete from job_permits            where job_id = p_job_id;
  delete from warranty_claims        where job_id = p_job_id;
  delete from crew_assignments       where job_id = p_job_id;

  delete from jobs where job_id = p_job_id;

  return v_dep;
end;
$$;

-- verify -- should return 0 rows (table exists, no test junk left behind)
select * from job_force_delete_log limit 0;
