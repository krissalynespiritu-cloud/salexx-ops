-- ============================================================
-- 76_job_permits.sql
--
-- Roadmap Phase 4, item #20: Permits & Inspections, per job.
--
-- jobs.permit_required already exists (synced from Monday.com --
-- whether a permit is needed at all for this job). This adds the
-- actual tracking once one is needed: job_permits, one row per
-- permit pulled for the job (a job can need more than one, e.g.
-- Building + Electrical), each carrying its own permit number,
-- submitted/approved dates, and inspection scheduled/result/result
-- date -- the exact field list the roadmap calls for
-- (required/submitted/approved/number/scheduled/passed/failed),
-- with "required" read from the existing jobs.permit_required
-- instead of duplicated here.
--
-- Same append-only-log pattern as job_change_orders/job_punch_items.
-- Added to job_dependency_counts() so a job with logged permits can't
-- be retired without a human resolving them first.
--
-- Purely additive. jobs.permit_required is untouched.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists job_permits (
  permit_id                 uuid primary key default gen_random_uuid(),
  job_id                    text not null references jobs(job_id) on delete cascade,
  permit_type               text not null default 'Building',
  permit_number             text,
  submitted_date            date,
  approved_date             date,
  inspection_scheduled_date date,
  inspection_result         text not null default 'Pending' check (inspection_result in ('Pending','Passed','Failed')),
  inspection_result_date    date,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists job_permits_job_idx on job_permits (job_id);

alter table job_permits enable row level security;
drop policy if exists team_all on job_permits;
create policy team_all on job_permits for all to authenticated using (true) with check (true);
grant all on job_permits to anon, authenticated, service_role;

drop trigger if exists job_permits_touch on job_permits;
create trigger job_permits_touch before update on job_permits
  for each row execute function touch_updated_at();

-- Extend job_dependency_counts() (65/73/74) with job_permits.
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
      (select count(*) from job_permits             where job_id = p_job_id) as job_permits
  )
  select c.*,
    (c.job_costs + c.time_entries + c.payments + c.leads + c.estimates +
     c.job_updates + c.google_reviews + c.sub_payments + c.vendor_invoices +
     c.tasks + c.project_files + c.material_requests + c.job_labor_estimates +
     c.job_material_estimates + c.job_change_orders + c.job_punch_items +
     c.job_permits) as total
  from c;
$$;

-- verify -- expect rows 0, policies 1
select
  (select count(*) from job_permits) as rows,
  (select count(*) from pg_policies where tablename = 'job_permits') as policies;
