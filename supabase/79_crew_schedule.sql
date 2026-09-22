-- ============================================================
-- 79_crew_schedule.sql
--
-- Roadmap Phase 4, items #24/#25: a weekly Crew Schedule with
-- crew-to-job assignments and double-booking warnings, added as a
-- fourth tab under Labor (alongside Time Entry / Project Hours /
-- Payroll -- same people, same jobs, just planning ahead instead of
-- logging what already happened).
--
-- Deliberately narrow, per discussion: whole-day, morning, or
-- afternoon assignments (`shift`) rather than an hour-by-hour
-- calendar. This is planning, not a timesheet -- actual hours are
-- still logged separately in Time Entry (time_entries), completely
-- unrelated to this table.
--
-- Two assignments for the same person on the same day conflict only
-- if their shifts overlap (two Full Day, two Morning, a Full Day and
-- anything else) -- Morning + Afternoon for two different jobs is a
-- normal, valid split day and is NOT flagged. The app computes this
-- client-side from the raw rows; nothing here enforces it at the
-- database level, since a double-booking is a warning to review, not
-- an error to block.
--
-- Purely additive. No job, task, or time_entries row is touched.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists crew_assignments (
  assignment_id   uuid primary key default gen_random_uuid(),
  job_id          text not null references jobs(job_id) on delete cascade,
  person          text not null,
  assignment_date date not null,
  shift           text not null default 'Full Day' check (shift in ('Full Day','Morning','Afternoon')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists crew_assignments_date_idx on crew_assignments (assignment_date);
create index if not exists crew_assignments_person_date_idx on crew_assignments (person, assignment_date);
create index if not exists crew_assignments_job_idx on crew_assignments (job_id);

alter table crew_assignments enable row level security;
drop policy if exists team_all on crew_assignments;
create policy team_all on crew_assignments for all to authenticated using (true) with check (true);
grant all on crew_assignments to anon, authenticated, service_role;

drop trigger if exists crew_assignments_touch on crew_assignments;
create trigger crew_assignments_touch before update on crew_assignments
  for each row execute function touch_updated_at();

-- Extend job_dependency_counts() (65/73/74/76/77) with
-- crew_assignments, so a job with future crew assignments can't be
-- retired without a human resolving them first.
drop function if exists job_dependency_counts(text);
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
  job_change_orders       bigint,
  job_punch_items         bigint,
  job_permits             bigint,
  warranty_claims         bigint,
  crew_assignments        bigint,
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
      (select count(*) from job_material_estimates  where job_id = p_job_id) as job_material_estimates,
      (select count(*) from job_change_orders       where job_id = p_job_id) as job_change_orders,
      (select count(*) from job_punch_items         where job_id = p_job_id) as job_punch_items,
      (select count(*) from job_permits             where job_id = p_job_id) as job_permits,
      (select count(*) from warranty_claims         where job_id = p_job_id) as warranty_claims,
      (select count(*) from crew_assignments        where job_id = p_job_id) as crew_assignments
  )
  select c.*,
    (c.job_costs + c.time_entries + c.payments + c.leads + c.estimates +
     c.job_updates + c.google_reviews + c.sub_payments + c.vendor_invoices +
     c.tasks + c.project_files + c.material_requests + c.job_labor_estimates +
     c.job_material_estimates + c.job_change_orders + c.job_punch_items +
     c.job_permits + c.warranty_claims + c.crew_assignments) as total
  from c;
$$;

-- verify -- expect rows 0, policies 1
select
  (select count(*) from crew_assignments) as rows,
  (select count(*) from pg_policies where tablename = 'crew_assignments') as policies;
