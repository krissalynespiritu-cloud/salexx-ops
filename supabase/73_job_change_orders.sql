-- ============================================================
-- 73_job_change_orders.sql
--
-- First of four slices of "Make Projects the central workspace"
-- (roadmap Phase 3, item #13) that need a real data model: an
-- itemized Change Orders log per job.
--
-- Today jobs.change_orders is a single net dollar adjustment,
-- edited straight on Job Costing -- there's no record of what each
-- change order was, when it happened, or who approved it. This adds
-- job_change_orders as a new, separate log table (description,
-- amount, date, approved by), the same append-only-log pattern as
-- material_requests and job_updates.
--
-- Deliberately NOT touching jobs.change_orders or Job Costing's
-- existing manual field -- some of the 154 jobs may already carry a
-- non-zero change_orders total with no itemized backing, and this
-- migration has no way to know what those numbers represent. Per
-- CLAUDE.md: when uncertain, leave the records alone rather than
-- guess. The new "Change Orders" tab shows both totals side by side
-- so a mismatch is visible to a human, never auto-reconciled.
--
-- Added to job_dependency_counts() so a job with logged change
-- orders can't be retired without a human resolving them first, the
-- same protection every other job-linked table already has.
--
-- Purely additive. No job or jobs.change_orders value is touched.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists job_change_orders (
  change_order_id uuid primary key default gen_random_uuid(),
  job_id          text not null references jobs(job_id) on delete cascade,
  description     text not null,
  amount          numeric not null default 0,
  co_date         date,
  approved_by     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists job_change_orders_job_idx on job_change_orders (job_id);

alter table job_change_orders enable row level security;
drop policy if exists team_all on job_change_orders;
create policy team_all on job_change_orders for all to authenticated using (true) with check (true);
grant all on job_change_orders to anon, authenticated, service_role;

drop trigger if exists job_change_orders_touch on job_change_orders;
create trigger job_change_orders_touch before update on job_change_orders
  for each row execute function touch_updated_at();

-- Add job_change_orders to the existing retire-safety count function
-- (65_job_retire_function.sql) so a job with logged change orders is
-- blocked from retiring until a human resolves them, same as every
-- other dependency.
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
      (select count(*) from job_change_orders       where job_id = p_job_id) as job_change_orders
  )
  select c.*,
    (c.job_costs + c.time_entries + c.payments + c.leads + c.estimates +
     c.job_updates + c.google_reviews + c.sub_payments + c.vendor_invoices +
     c.tasks + c.project_files + c.material_requests + c.job_labor_estimates +
     c.job_material_estimates + c.job_change_orders) as total
  from c;
$$;

-- verify -- expect rows 0, policies 1
select
  (select count(*) from job_change_orders) as rows,
  (select count(*) from pg_policies where tablename = 'job_change_orders') as policies;
