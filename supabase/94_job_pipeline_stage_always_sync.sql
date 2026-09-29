-- ============================================================
-- 94_job_pipeline_stage_always_sync.sql
--
-- "Whatever changes in GHL should auto-update in the app" -- not
-- gated on every single GHL stage name being pre-confirmed and
-- mapped first. This adds the same informational mirror pattern
-- already used for leads (90_lead_pipeline_stage.sql) onto jobs too:
--
--   - jobs.pipeline_stage / pipeline_stage_updated_at ALWAYS get set
--     to whatever raw stage name GHL sends, every time, no matter
--     what it says -- visible on the job as context, same as the
--     violet-dot pattern on Leads Tracker.
--   - IN ADDITION, if that stage name has a confirmed mapping in
--     ghl_stage_map (or matches a real job_stage_list value directly),
--     the job's real, structured `stage` column also updates -- so
--     the well-understood stages (Ready for Scheduling, Completed,
--     etc.) drive actual app behavior (margin rollups, stage filters,
--     etc.), while anything not yet mapped is still visible on the
--     job immediately rather than silently discarded.
--
-- Still refuses to touch `stage` (the structured field) when a client
-- has zero or multiple active jobs -- CLAUDE.md Phase 2A: never guess
-- which job a contact match "really" means. The informational mirror
-- always applies to every active job for that client, since showing
-- "here's what GHL last said" carries no identity risk the way
-- silently changing a specific job's real stage would.
--
-- Safe to re-run.
-- ============================================================

alter table jobs add column if not exists pipeline_stage text;
alter table jobs add column if not exists pipeline_stage_updated_at timestamptz;

-- Explicit translation for GHL stage names that don't match a real
-- job_stage value even ignoring case, or that name a finishing-touch
-- concept the app tracks as a boolean milestone rather than a stage
-- (see 95_trim_stage_enum_milestones.sql -- "Final Walkthrough" and
-- "Review Requested" both map to Completed here since neither is a
-- real stage value anymore). Editable any time with a plain insert --
-- no code change needed to add or correct a mapping later.
create table if not exists ghl_stage_map (
  ghl_stage text primary key,
  app_stage text not null
);
insert into ghl_stage_map (ghl_stage, app_stage) values
  ('Designs Sold', 'Designs Sold'),
  ('Permitting / Drawings', 'Permitting / Drawings'),
  ('Ready for Scheduling', 'Ready For Scheduling'),
  ('Project Scheduled', 'Project Scheduled'),
  ('In Progress', 'In Progress'),
  ('Final Walkthrough', 'Completed'),
  ('Needs Some Touches', 'Punch list / Touch-ups (if needed)'),
  ('Completed', 'Completed'),
  ('Review Requested', 'Completed')
on conflict (ghl_stage) do update set app_stage = excluded.app_stage;

create or replace function set_job_stage_by_contact(p_email text default null, p_phone text default null, p_stage text default null)
returns void
language plpgsql as $$
declare
  v_client_id uuid;
  v_job_count int;
  v_real_stage text;
begin
  select c.client_id into v_client_id
  from clients c
  where (p_email is not null and c.email = p_email)
     or (p_phone is not null and c.phone = p_phone)
  limit 1;

  if v_client_id is null then
    return;
  end if;

  -- always mirror the raw GHL stage onto every active job for this client
  update jobs
  set pipeline_stage = p_stage, pipeline_stage_updated_at = now()
  where client_id = v_client_id and not retired;

  -- resolve to a real job_stage value, if we have a confident mapping
  select app_stage into v_real_stage from ghl_stage_map where lower(ghl_stage) = lower(p_stage) limit 1;
  if v_real_stage is null then
    select stage into v_real_stage from job_stage_list where lower(stage) = lower(p_stage) limit 1;
  end if;
  if v_real_stage is null then
    return;
  end if;

  select count(*) into v_job_count
  from jobs j
  where j.client_id = v_client_id and not j.retired;

  if v_job_count = 1 then
    update jobs set stage = v_real_stage::job_stage
    where client_id = v_client_id and not retired;
  end if;
end;
$$;

-- verify
select job_id, client_name, stage, pipeline_stage, pipeline_stage_updated_at from jobs where pipeline_stage is not null limit 5;
