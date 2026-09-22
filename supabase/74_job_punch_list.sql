-- ============================================================
-- 74_job_punch_list.sql
--
-- Second of four slices of "Make Projects the central workspace"
-- (roadmap Phase 3, item #13): a per-job punch list of touch-up
-- items, tied to the existing "Punch list / Touch-ups (if needed)"
-- job_stage value (11_align_stages.sql) but tracked as its own
-- checklist rather than inferred from the stage alone -- a job can
-- sit at that stage with several distinct open items, and knowing
-- which ones are actually done is the point.
--
-- Same append-only-log-with-a-done-flag pattern as material_request_
-- items, minus the ordered/received columns that don't apply here.
--
-- Added to job_dependency_counts() so a job with open or closed punch
-- list items can't be retired without a human resolving them first.
--
-- Purely additive. No job or job_stage value is touched.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists job_punch_items (
  punch_item_id uuid primary key default gen_random_uuid(),
  job_id        text not null references jobs(job_id) on delete cascade,
  description   text not null,
  done          boolean not null default false,
  done_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists job_punch_items_job_idx on job_punch_items (job_id);

alter table job_punch_items enable row level security;
drop policy if exists team_all on job_punch_items;
create policy team_all on job_punch_items for all to authenticated using (true) with check (true);
grant all on job_punch_items to anon, authenticated, service_role;

drop trigger if exists job_punch_items_touch on job_punch_items;
create trigger job_punch_items_touch before update on job_punch_items
  for each row execute function touch_updated_at();

-- Extend job_dependency_counts() (65_job_retire_function.sql, already
-- extended once by 73_job_change_orders.sql) with job_punch_items.
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
      (select count(*) from job_punch_items         where job_id = p_job_id) as job_punch_items
  )
  select c.*,
    (c.job_costs + c.time_entries + c.payments + c.leads + c.estimates +
     c.job_updates + c.google_reviews + c.sub_payments + c.vendor_invoices +
     c.tasks + c.project_files + c.material_requests + c.job_labor_estimates +
     c.job_material_estimates + c.job_change_orders + c.job_punch_items) as total
  from c;
$$;

-- verify -- expect rows 0, policies 1
select
  (select count(*) from job_punch_items) as rows,
  (select count(*) from pg_policies where tablename = 'job_punch_items') as policies;
