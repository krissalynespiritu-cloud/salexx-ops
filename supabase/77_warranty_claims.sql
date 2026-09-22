-- ============================================================
-- 77_warranty_claims.sql
--
-- Roadmap Phase 4, item #22: Warranty / Callback tracking.
--
-- Unlike Change Orders/Punch List/Permits, this isn't embedded in the
-- job detail view -- warranty issues come up after a job is done and
-- the team needs to see all open claims across every job at once, so
-- it's a new standalone "Warranty" page (like Material Requests or
-- Vendor Payables), linked to a job the same way those are.
--
-- Total cost is deliberately NOT a stored column -- it's always
-- labor_cost + material_cost, computed in the UI, the same way this
-- app computes every other derived total rather than storing one
-- that could drift out of sync.
--
-- Purely additive. No job or existing table is touched.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists warranty_claims (
  claim_id       uuid primary key default gen_random_uuid(),
  job_id         text not null references jobs(job_id) on delete cascade,
  issue          text not null,
  reported_date  date not null default current_date,
  assignee       text,
  status         text not null default 'Open' check (status in ('Open','In Progress','Resolved','Closed')),
  resolution     text,
  resolved_date  date,
  labor_cost     numeric not null default 0,
  material_cost  numeric not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists warranty_claims_job_idx on warranty_claims (job_id);
create index if not exists warranty_claims_status_idx on warranty_claims (status);

alter table warranty_claims enable row level security;
drop policy if exists team_all on warranty_claims;
create policy team_all on warranty_claims for all to authenticated using (true) with check (true);
grant all on warranty_claims to anon, authenticated, service_role;

drop trigger if exists warranty_claims_touch on warranty_claims;
create trigger warranty_claims_touch before update on warranty_claims
  for each row execute function touch_updated_at();

-- Extend job_dependency_counts() (65/73/74/76) with warranty_claims,
-- so a job with open or resolved warranty claims can't be retired
-- without a human resolving them first.
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
      (select count(*) from warranty_claims         where job_id = p_job_id) as warranty_claims
  )
  select c.*,
    (c.job_costs + c.time_entries + c.payments + c.leads + c.estimates +
     c.job_updates + c.google_reviews + c.sub_payments + c.vendor_invoices +
     c.tasks + c.project_files + c.material_requests + c.job_labor_estimates +
     c.job_material_estimates + c.job_change_orders + c.job_punch_items +
     c.job_permits + c.warranty_claims) as total
  from c;
$$;

-- verify -- expect rows 0, policies 1
select
  (select count(*) from warranty_claims) as rows,
  (select count(*) from pg_policies where tablename = 'warranty_claims') as policies;
