-- ============================================================
-- 60_client_relationship_foundation.sql
--
-- Phase 2A Step 1: gives clients a real foundation before any
-- duplicate cleanup happens. Purely additive -- no client is
-- merged, deleted, or renamed by this file.
--
-- Three things:
--
--  1. Lets estimates and tasks point at a client directly, the same
--     way jobs and leads already do -- closing the one link in the
--     chain (Lead -> Estimate -> Job -> Client) that never existed.
--
--  2. Adds a `needs_review` flag to leads, jobs, estimates, and
--     tasks -- the four tables that carry a client_id. This is
--     deliberately NOT on `clients` itself: the ambiguity this flags
--     belongs to the record that failed to resolve a client at
--     creation time (e.g. a new lead whose email matches two
--     different existing clients), not to any client record. Reading
--     it: client_id = null + needs_review = false means "genuinely
--     new, no match found"; client_id = null + needs_review = true
--     means "the system found more than one possible client and
--     refused to guess -- a human needs to pick."
--
--  3. Adds the columns a future manual merge tool will need
--     (clients.merged_into_client_id, clients.active, and a
--     client_merge_log audit table) without building that tool yet.
--
-- The one backfill here (estimates.client_id) only fires where the
-- link is already provable through an existing lead_id or job_id --
-- never from name matching. 128 of 149 estimates have no such link
-- and are deliberately left client_id = null, same as today.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table estimates add column if not exists client_id uuid
  references clients(client_id) on delete set null;
create index if not exists estimates_client_idx on estimates (client_id);
alter table estimates add column if not exists needs_review boolean not null default false;
create index if not exists estimates_needs_review_idx on estimates (needs_review) where needs_review;

alter table tasks add column if not exists client_id uuid
  references clients(client_id) on delete set null;
create index if not exists tasks_client_idx on tasks (client_id);
alter table tasks add column if not exists needs_review boolean not null default false;
create index if not exists tasks_needs_review_idx on tasks (needs_review) where needs_review;

alter table leads add column if not exists needs_review boolean not null default false;
create index if not exists leads_needs_review_idx on leads (needs_review) where needs_review;

alter table jobs add column if not exists needs_review boolean not null default false;
create index if not exists jobs_needs_review_idx on jobs (needs_review) where needs_review;

alter table clients add column if not exists merged_into_client_id uuid
  references clients(client_id) on delete set null;
create index if not exists clients_merged_into_idx on clients (merged_into_client_id)
  where merged_into_client_id is not null;

alter table clients add column if not exists active boolean not null default true;

create table if not exists client_merge_log (
  merge_id            uuid primary key default gen_random_uuid(),
  surviving_client_id uuid not null references clients(client_id) on delete cascade,
  merged_client_id    uuid not null references clients(client_id) on delete cascade,
  merged_by           text,
  merged_at           timestamptz not null default now(),
  field_choices       jsonb
);
create index if not exists client_merge_log_surviving_idx on client_merge_log (surviving_client_id);
create index if not exists client_merge_log_merged_idx on client_merge_log (merged_client_id);

alter table client_merge_log enable row level security;
drop policy if exists team_all on client_merge_log;
create policy team_all on client_merge_log for all to authenticated using (true) with check (true);

-- ---------- safe backfill: estimates.client_id, provable links only ----------
-- Via the estimate's linked lead first (matches the priority order used in
-- the acceptance flow: lead's client_id before job's).
update estimates e set client_id = l.client_id
from leads l
where e.client_id is null
  and e.lead_id = l.lead_id
  and l.client_id is not null;

-- Via the estimate's linked job, only where the lead path didn't resolve it.
update estimates e set client_id = j.client_id
from jobs j
where e.client_id is null
  and e.job_id = j.job_id
  and j.client_id is not null;

-- verify: expect 21 filled, 128 left null (not a failure -- no provable link yet)
select
  count(*) filter (where client_id is not null) as newly_or_already_linked,
  count(*) filter (where client_id is null)     as still_unlinked,
  count(*)                                       as total
from estimates;
