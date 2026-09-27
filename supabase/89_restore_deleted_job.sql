-- ============================================================
-- 89_restore_deleted_job.sql
--
-- force_delete_job() (88_force_delete_job.sql) only logged a snapshot
-- of the JOB row plus counts of what it deleted -- enough for an audit
-- trail, but not enough to actually bring anything back. This makes a
-- force delete genuinely undoable:
--
--   1. force_delete_job() now also captures the full row content of
--      every linked table it's about to delete (not just counts) into
--      job_force_delete_log.linked_rows, including material_request_
--      items (cascade-deleted via material_requests, so never counted
--      by job_dependency_counts on its own, but still real data that
--      needs its own snapshot to be restorable).
--   2. restore_deleted_job(log_id) re-inserts the job row, then every
--      linked row, in an order that respects material_requests ->
--      material_request_items and material_requests -> vendor_invoices
--      foreign keys, then marks the log entry restored so it can't be
--      replayed twice. Refuses to run if a job with that ID already
--      exists (e.g. a new job was later created reusing the ID) or if
--      this entry was already restored.
--
-- Run AFTER 88_force_delete_job.sql. Safe to re-run.
-- ============================================================

alter table job_force_delete_log add column if not exists linked_rows jsonb;
alter table job_force_delete_log add column if not exists restored_at timestamptz;
alter table job_force_delete_log add column if not exists restored_by text;

create or replace function force_delete_job(p_job_id text, p_deleted_by text default null, p_reason text default null)
returns jsonb
language plpgsql as $$
declare
  v_job jsonb;
  v_dep jsonb;
  v_linked jsonb;
begin
  select to_jsonb(j) into v_job from jobs j where job_id = p_job_id;
  if v_job is null then
    raise exception 'Job % not found', p_job_id;
  end if;

  select to_jsonb(d) into v_dep from job_dependency_counts(p_job_id) d;

  select jsonb_build_object(
    'job_costs',              coalesce((select jsonb_agg(to_jsonb(t)) from job_costs t where t.job_id = p_job_id), '[]'::jsonb),
    'time_entries',           coalesce((select jsonb_agg(to_jsonb(t)) from time_entries t where t.job_id = p_job_id), '[]'::jsonb),
    'payments',               coalesce((select jsonb_agg(to_jsonb(t)) from payments t where t.job_id = p_job_id), '[]'::jsonb),
    'leads',                  coalesce((select jsonb_agg(to_jsonb(t)) from leads t where t.job_id = p_job_id), '[]'::jsonb),
    'estimates',              coalesce((select jsonb_agg(to_jsonb(t)) from estimates t where t.job_id = p_job_id), '[]'::jsonb),
    'job_updates',            coalesce((select jsonb_agg(to_jsonb(t)) from job_updates t where t.job_id = p_job_id), '[]'::jsonb),
    'google_reviews',         coalesce((select jsonb_agg(to_jsonb(t)) from google_reviews t where t.job_id = p_job_id), '[]'::jsonb),
    'sub_payments',           coalesce((select jsonb_agg(to_jsonb(t)) from sub_payments t where t.job_id = p_job_id), '[]'::jsonb),
    'material_requests',      coalesce((select jsonb_agg(to_jsonb(t)) from material_requests t where t.job_id = p_job_id), '[]'::jsonb),
    'material_request_items', coalesce((select jsonb_agg(to_jsonb(i)) from material_request_items i join material_requests mr on mr.request_id = i.request_id where mr.job_id = p_job_id), '[]'::jsonb),
    'vendor_invoices',        coalesce((select jsonb_agg(to_jsonb(t)) from vendor_invoices t where t.job_id = p_job_id), '[]'::jsonb),
    'tasks',                  coalesce((select jsonb_agg(to_jsonb(t)) from tasks t where t.job_id = p_job_id), '[]'::jsonb),
    'project_files',          coalesce((select jsonb_agg(to_jsonb(t)) from project_files t where t.job_id = p_job_id), '[]'::jsonb),
    'job_labor_estimates',    coalesce((select jsonb_agg(to_jsonb(t)) from job_labor_estimates t where t.job_id = p_job_id), '[]'::jsonb),
    'job_material_estimates', coalesce((select jsonb_agg(to_jsonb(t)) from job_material_estimates t where t.job_id = p_job_id), '[]'::jsonb),
    'job_change_orders',      coalesce((select jsonb_agg(to_jsonb(t)) from job_change_orders t where t.job_id = p_job_id), '[]'::jsonb),
    'job_punch_items',        coalesce((select jsonb_agg(to_jsonb(t)) from job_punch_items t where t.job_id = p_job_id), '[]'::jsonb),
    'job_permits',            coalesce((select jsonb_agg(to_jsonb(t)) from job_permits t where t.job_id = p_job_id), '[]'::jsonb),
    'warranty_claims',        coalesce((select jsonb_agg(to_jsonb(t)) from warranty_claims t where t.job_id = p_job_id), '[]'::jsonb),
    'crew_assignments',       coalesce((select jsonb_agg(to_jsonb(t)) from crew_assignments t where t.job_id = p_job_id), '[]'::jsonb)
  ) into v_linked;

  insert into job_force_delete_log (job_id, job_snapshot, deleted_counts, linked_rows, deleted_by, reason)
  values (p_job_id, v_job, v_dep, v_linked, p_deleted_by, p_reason);

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

create or replace function restore_deleted_job(p_log_id uuid, p_restored_by text default null)
returns text
language plpgsql as $$
declare
  v_log job_force_delete_log%rowtype;
begin
  select * into v_log from job_force_delete_log where log_id = p_log_id;
  if v_log.log_id is null then
    raise exception 'Delete-log entry not found';
  end if;
  if v_log.restored_at is not null then
    raise exception 'This job was already restored on %', v_log.restored_at;
  end if;
  if exists (select 1 from jobs where job_id = v_log.job_id) then
    raise exception 'A job with ID % already exists -- cannot auto-restore over it', v_log.job_id;
  end if;

  insert into jobs select * from jsonb_populate_record(null::jobs, v_log.job_snapshot);

  insert into job_costs              select * from jsonb_populate_recordset(null::job_costs,              coalesce(v_log.linked_rows->'job_costs', '[]'::jsonb));
  insert into time_entries           select * from jsonb_populate_recordset(null::time_entries,           coalesce(v_log.linked_rows->'time_entries', '[]'::jsonb));
  insert into payments               select * from jsonb_populate_recordset(null::payments,               coalesce(v_log.linked_rows->'payments', '[]'::jsonb));
  insert into leads                  select * from jsonb_populate_recordset(null::leads,                  coalesce(v_log.linked_rows->'leads', '[]'::jsonb));
  insert into estimates              select * from jsonb_populate_recordset(null::estimates,               coalesce(v_log.linked_rows->'estimates', '[]'::jsonb));
  insert into job_updates            select * from jsonb_populate_recordset(null::job_updates,             coalesce(v_log.linked_rows->'job_updates', '[]'::jsonb));
  insert into google_reviews         select * from jsonb_populate_recordset(null::google_reviews,          coalesce(v_log.linked_rows->'google_reviews', '[]'::jsonb));
  insert into sub_payments           select * from jsonb_populate_recordset(null::sub_payments,            coalesce(v_log.linked_rows->'sub_payments', '[]'::jsonb));
  insert into material_requests      select * from jsonb_populate_recordset(null::material_requests,       coalesce(v_log.linked_rows->'material_requests', '[]'::jsonb));
  insert into material_request_items select * from jsonb_populate_recordset(null::material_request_items,  coalesce(v_log.linked_rows->'material_request_items', '[]'::jsonb));
  insert into vendor_invoices        select * from jsonb_populate_recordset(null::vendor_invoices,         coalesce(v_log.linked_rows->'vendor_invoices', '[]'::jsonb));
  insert into tasks                  select * from jsonb_populate_recordset(null::tasks,                   coalesce(v_log.linked_rows->'tasks', '[]'::jsonb));
  insert into project_files          select * from jsonb_populate_recordset(null::project_files,           coalesce(v_log.linked_rows->'project_files', '[]'::jsonb));
  insert into job_labor_estimates    select * from jsonb_populate_recordset(null::job_labor_estimates,     coalesce(v_log.linked_rows->'job_labor_estimates', '[]'::jsonb));
  insert into job_material_estimates select * from jsonb_populate_recordset(null::job_material_estimates,  coalesce(v_log.linked_rows->'job_material_estimates', '[]'::jsonb));
  insert into job_change_orders      select * from jsonb_populate_recordset(null::job_change_orders,       coalesce(v_log.linked_rows->'job_change_orders', '[]'::jsonb));
  insert into job_punch_items        select * from jsonb_populate_recordset(null::job_punch_items,         coalesce(v_log.linked_rows->'job_punch_items', '[]'::jsonb));
  insert into job_permits            select * from jsonb_populate_recordset(null::job_permits,             coalesce(v_log.linked_rows->'job_permits', '[]'::jsonb));
  insert into warranty_claims        select * from jsonb_populate_recordset(null::warranty_claims,         coalesce(v_log.linked_rows->'warranty_claims', '[]'::jsonb));
  insert into crew_assignments       select * from jsonb_populate_recordset(null::crew_assignments,        coalesce(v_log.linked_rows->'crew_assignments', '[]'::jsonb));

  update job_force_delete_log set restored_at = now(), restored_by = p_restored_by where log_id = p_log_id;

  return v_log.job_id;
end;
$$;

-- verify -- lists any not-yet-restored deletions (expect 0 rows on a fresh install)
select job_id, deleted_at, deleted_by, reason from job_force_delete_log where restored_at is null;
