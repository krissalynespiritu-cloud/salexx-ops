-- ============================================================
-- 55_estimate_cost_budgeting.sql
--
-- Lets the crew/materials cost budget (built for the job's Est. vs
-- Actual tab in migration 54) also be filled in at the Estimate
-- stage, before a job exists -- so a bid can be costed out while
-- it's still a quote. Reuses the same two tables instead of a
-- parallel set: a row now belongs to either a job or an estimate.
--
--  * job_labor_estimates / job_material_estimates: job_id becomes
--    nullable, a new nullable linked_estimate_id (FK to estimates)
--    is added -- named linked_ to avoid colliding with each table's
--    own primary key, which migration 54 already called
--    estimate_id -- and a check constraint requires at least one of
--    job_id / linked_estimate_id to be set.
--  * estimates gets crew_leader_fee, matching jobs.crew_leader_fee,
--    so the CLMF field works the same way at both stages.
--
-- No automatic carry-over yet: if an estimate becomes a job, its
-- budget rows stay attached to linked_estimate_id and aren't copied
-- onto the new job_id. Re-enter on the job's tab for now.
--
-- Run AFTER 54. Safe to re-run.
-- ============================================================

alter table job_labor_estimates alter column job_id drop not null;
alter table job_labor_estimates add column if not exists linked_estimate_id uuid references estimates(estimate_id) on delete cascade;
alter table job_labor_estimates drop constraint if exists job_labor_estimates_owner_check;
alter table job_labor_estimates add constraint job_labor_estimates_owner_check check (job_id is not null or linked_estimate_id is not null);
create index if not exists job_labor_estimates_linked_estimate_idx on job_labor_estimates (linked_estimate_id);

alter table job_material_estimates alter column job_id drop not null;
alter table job_material_estimates add column if not exists linked_estimate_id uuid references estimates(estimate_id) on delete cascade;
alter table job_material_estimates drop constraint if exists job_material_estimates_owner_check;
alter table job_material_estimates add constraint job_material_estimates_owner_check check (job_id is not null or linked_estimate_id is not null);
create index if not exists job_material_estimates_linked_estimate_idx on job_material_estimates (linked_estimate_id);

alter table estimates add column if not exists crew_leader_fee numeric(10,2) not null default 0;

-- verify
select
  (select count(*) from information_schema.columns where table_name='job_labor_estimates' and column_name='linked_estimate_id') as labor_linked_col,
  (select count(*) from information_schema.columns where table_name='job_material_estimates' and column_name='linked_estimate_id') as mat_linked_col,
  (select count(*) from information_schema.columns where table_name='estimates' and column_name='crew_leader_fee') as estimates_clmf_col;
