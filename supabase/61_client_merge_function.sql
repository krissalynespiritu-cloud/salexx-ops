-- ============================================================
-- 61_client_merge_function.sql
--
-- Phase 2A Step 2: the atomic merge operation itself, plus the audit
-- log columns needed to make it genuinely reversible. No client is
-- merged by this file -- it only creates the machinery. The actual
-- 6 test merges (high-confidence groups only) are run separately,
-- after this migration is live, and reported on their own.
--
-- ---------- client_merge_log additions ----------
-- The original log (migration 60) can answer who/when/survivor/loser/
-- which field values were picked -- but not "what actually got
-- reassigned" or "could this be undone." Two additions close that:
--
--  reassignment_summary  -- counts per table, e.g.
--                            {"jobs":4,"leads":2,"estimates":1,"tasks":0}
--                            a glance-level sanity check.
--
--  reassigned_record_ids -- the EXACT ids moved, e.g.
--                            {"jobs":["SLX-010"],"leads":["uuid..."],...}
--                            without this, undoing a merge later could
--                            only guess which of the surviving client's
--                            current records used to belong to the
--                            loser -- especially if the surviving
--                            client picks up more jobs afterward.
--
--  pre_merge_snapshot    -- both clients' full field values (name,
--                            phone, email, address, city, first_source,
--                            notes) exactly as they were before the
--                            merge touched anything. Needed because
--                            resolving a field conflict overwrites the
--                            surviving client's own prior value -- the
--                            log otherwise has no record of what that
--                            was, so a reversal can't restore it.
--
-- ---------- merge_clients() ----------
-- One Postgres function, not a sequence of app-side calls, so the
-- reassignment is genuinely atomic: if anything inside raises, nothing
-- committed. Runs with the caller's own permissions (not security
-- definer) -- the existing team_all RLS policy already allows any
-- authenticated user to do everything this function does, so no
-- privilege escalation is introduced.
--
-- ROLE ENFORCEMENT: intentionally NOT added here. There is no roles
-- system yet (confirmed zero role checks anywhere in the app). The
-- clean insertion point for later is marked below with a comment --
-- once profiles.role exists, one `if` at the top of this function
-- can require Owner/Admin without changing anything else about how
-- it works.
--
-- Run any time. Safe to re-run (create-or-replace / add-if-not-exists
-- throughout).
-- ============================================================

alter table client_merge_log add column if not exists reassignment_summary jsonb;
alter table client_merge_log add column if not exists reassigned_record_ids jsonb;
alter table client_merge_log add column if not exists pre_merge_snapshot jsonb;

create or replace function merge_clients(
  p_surviving_id uuid,
  p_losing_id uuid,
  p_field_choices jsonb,
  p_merged_by text
) returns uuid
language plpgsql
as $$
declare
  v_merge_id uuid;
  v_surviving_before jsonb;
  v_losing_before jsonb;
  v_job_ids jsonb;
  v_lead_ids jsonb;
  v_estimate_ids jsonb;
  v_task_ids jsonb;
  v_jobs_count int;
  v_leads_count int;
  v_estimates_count int;
  v_tasks_count int;
begin
  -- ---- ROLE ENFORCEMENT GOES HERE, once profiles.role exists ----
  -- if not exists (select 1 from profiles where email = p_merged_by
  --   and role in ('owner','admin')) then
  --   raise exception 'Only an Owner or Admin can merge clients';
  -- end if;

  if p_surviving_id = p_losing_id then
    raise exception 'Cannot merge a client into itself';
  end if;

  if not exists (select 1 from clients where client_id = p_surviving_id) then
    raise exception 'Surviving client % does not exist', p_surviving_id;
  end if;

  if exists (select 1 from clients where client_id = p_surviving_id and merged_into_client_id is not null) then
    raise exception 'Surviving client % has itself already been merged into another client -- merge into the current survivor instead', p_surviving_id;
  end if;

  if not exists (select 1 from clients where client_id = p_losing_id) then
    raise exception 'Losing client % does not exist', p_losing_id;
  end if;

  if exists (select 1 from clients where client_id = p_losing_id and merged_into_client_id is not null) then
    raise exception 'Losing client % has already been merged into another client -- refusing to merge an already-merged record', p_losing_id;
  end if;

  -- snapshot both clients' full pre-merge state, before anything changes
  select to_jsonb(c) into v_surviving_before from clients c where c.client_id = p_surviving_id;
  select to_jsonb(c) into v_losing_before    from clients c where c.client_id = p_losing_id;

  -- exact ids being moved, captured before the updates run
  select coalesce(jsonb_agg(job_id), '[]'::jsonb)      into v_job_ids      from jobs      where client_id = p_losing_id;
  select coalesce(jsonb_agg(lead_id), '[]'::jsonb)     into v_lead_ids     from leads     where client_id = p_losing_id;
  select coalesce(jsonb_agg(estimate_id), '[]'::jsonb) into v_estimate_ids from estimates where client_id = p_losing_id;
  select coalesce(jsonb_agg(task_id), '[]'::jsonb)     into v_task_ids     from tasks     where client_id = p_losing_id;

  -- apply the chosen field values to the surviving client. Only a key
  -- actually present in p_field_choices touches its column -- an
  -- omitted key leaves the surviving client's existing value alone.
  update clients set
    name         = coalesce(nullif(p_field_choices->>'name', ''), name),
    phone        = case when p_field_choices ? 'phone'        then p_field_choices->>'phone'        else phone        end,
    email        = case when p_field_choices ? 'email'        then p_field_choices->>'email'        else email        end,
    address      = case when p_field_choices ? 'address'      then p_field_choices->>'address'      else address      end,
    city         = case when p_field_choices ? 'city'         then p_field_choices->>'city'          else city         end,
    first_source = case when p_field_choices ? 'first_source' then p_field_choices->>'first_source'  else first_source end,
    notes        = case when p_field_choices ? 'notes'        then p_field_choices->>'notes'          else notes        end
  where client_id = p_surviving_id;

  -- reassign every FK that actually exists (jobs/leads/estimates/tasks
  -- only -- payments and files relate to a client through job_id, so
  -- they resolve correctly automatically once the job moves)
  update jobs      set client_id = p_surviving_id where client_id = p_losing_id;
  get diagnostics v_jobs_count      = row_count;
  update leads      set client_id = p_surviving_id where client_id = p_losing_id;
  get diagnostics v_leads_count     = row_count;
  update estimates set client_id = p_surviving_id where client_id = p_losing_id;
  get diagnostics v_estimates_count = row_count;
  update tasks      set client_id = p_surviving_id where client_id = p_losing_id;
  get diagnostics v_tasks_count     = row_count;

  -- soft-deactivate the losing client -- never deleted, never renamed
  update clients set
    active = false,
    merged_into_client_id = p_surviving_id
  where client_id = p_losing_id;

  insert into client_merge_log (
    surviving_client_id, merged_client_id, merged_by, field_choices,
    reassignment_summary, reassigned_record_ids, pre_merge_snapshot
  ) values (
    p_surviving_id, p_losing_id, p_merged_by, p_field_choices,
    jsonb_build_object('jobs', v_jobs_count, 'leads', v_leads_count, 'estimates', v_estimates_count, 'tasks', v_tasks_count),
    jsonb_build_object('jobs', v_job_ids, 'leads', v_lead_ids, 'estimates', v_estimate_ids, 'tasks', v_task_ids),
    jsonb_build_object('surviving', v_surviving_before, 'merged', v_losing_before)
  ) returning merge_id into v_merge_id;

  return v_merge_id;
end;
$$;

grant execute on function merge_clients(uuid, uuid, jsonb, text) to authenticated;

-- verify: function exists and is callable
select proname, pronargs from pg_proc where proname = 'merge_clients';
