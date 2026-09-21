-- ============================================================
-- 67_needs_review_resolution.sql
--
-- Audit log + function for manually resolving a needs_review=true
-- job or lead: the client-identity resolver found more than one
-- possible client at creation time and refused to guess (Phase 2A
-- Step 1, migration 60). This is how a human's explicit pick gets
-- recorded.
--
-- resolve_needs_review() only ever sets client_id and clears
-- needs_review on the ONE record passed in. It never merges clients,
-- never touches any other record, and never runs if the record isn't
-- currently needs_review = true (closes a race if two people opened
-- the same record). table_name is restricted by a check constraint
-- and the function only ever branches between two hardcoded
-- statements -- never dynamic/interpolated SQL -- so there is no
-- injection surface even though a table name is passed in.
--
-- Applied and verified 2026-09-22: needs_review_resolution_log table,
-- resolve_needs_review() function both confirmed live. At the time of
-- writing, zero jobs or leads currently have needs_review = true --
-- this is forward-looking infrastructure for the next ambiguous match,
-- not a backlog cleanup.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists needs_review_resolution_log (
  resolution_id      uuid primary key default gen_random_uuid(),
  table_name         text not null check (table_name in ('jobs','leads')),
  record_id          text not null,
  assigned_client_id uuid not null references clients(client_id) on delete cascade,
  resolved_by        text,
  resolved_at        timestamptz not null default now(),
  record_snapshot    jsonb not null
);
create index if not exists needs_review_log_record_idx on needs_review_resolution_log (table_name, record_id);

alter table needs_review_resolution_log enable row level security;
drop policy if exists team_all on needs_review_resolution_log;
create policy team_all on needs_review_resolution_log for all to authenticated using (true) with check (true);

create or replace function resolve_needs_review(p_table text, p_record_id text, p_client_id uuid, p_resolved_by text default null)
returns table (ok boolean, message text)
language plpgsql as $$
declare
  v_client_exists boolean;
  v_job jobs%rowtype;
  v_lead leads%rowtype;
begin
  select exists(select 1 from clients where client_id = p_client_id) into v_client_exists;
  if not v_client_exists then
    return query select false, 'That client no longer exists.';
    return;
  end if;

  if p_table = 'jobs' then
    select * into v_job from jobs where job_id = p_record_id and needs_review = true;
    if not found then
      return query select false, 'Job not found, or already resolved.';
      return;
    end if;
    update jobs set client_id = p_client_id, needs_review = false where job_id = p_record_id;
    insert into needs_review_resolution_log (table_name, record_id, assigned_client_id, resolved_by, record_snapshot)
    values ('jobs', p_record_id, p_client_id, p_resolved_by, to_jsonb(v_job));
  elsif p_table = 'leads' then
    select * into v_lead from leads where lead_id::text = p_record_id and needs_review = true;
    if not found then
      return query select false, 'Lead not found, or already resolved.';
      return;
    end if;
    update leads set client_id = p_client_id, needs_review = false where lead_id::text = p_record_id;
    insert into needs_review_resolution_log (table_name, record_id, assigned_client_id, resolved_by, record_snapshot)
    values ('leads', p_record_id, p_client_id, p_resolved_by, to_jsonb(v_lead));
  else
    return query select false, 'Unknown table.';
    return;
  end if;

  return query select true, 'Resolved.';
end;
$$;
