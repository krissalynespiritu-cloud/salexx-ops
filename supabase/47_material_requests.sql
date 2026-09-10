-- ============================================================
-- 47_material_requests.sql
--
-- Rebuilds the Google "Material Handoff Form" inside the app. Filled
-- after a job closes to organize and order materials; the request
-- goes into an in-app queue that Alex and Salvador work from.
--
-- Two tables:
--   material_requests       -- one per job: project type, status,
--                              the spec fields (roof sq, siding type,
--                              paint finish, deck size, window counts,
--                              ...), checklist, supplier, delivery date
--   material_request_items  -- the quantity line items (Shingles 12
--                              bundles, Drip Edge 140 LF, ...), each
--                              with ordered / received checkboxes
--
-- The standard item list for each trade lives in the app, not here --
-- creating a Roofing request seeds the roofing lines, and lines can be
-- added or removed per request. Storing items as rows (not columns) is
-- what lets "materials for this client" be one query across all their
-- jobs.
--
-- Quantities only -- no prices. Same team_all trust model as the rest
-- of the app.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists material_requests (
  request_id            uuid primary key default gen_random_uuid(),
  job_id                text not null references jobs(job_id) on delete cascade,
  project_type          text not null,                 -- Roofing | Siding | Paint | Deck | Windows | Other
  status                text not null default 'Draft', -- Draft | Submitted | Ordered | Received
  requested_by          text,
  submitted_at          timestamptz,
  ordered_at            timestamptz,
  received_at           timestamptz,
  preferred_supplier    text,
  target_delivery_date  date,
  measurements_verified boolean,
  colors_confirmed      boolean,
  change_orders_noted   boolean,
  spec                  jsonb not null default '{}'::jsonb,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists material_requests_job_idx    on material_requests (job_id);
create index if not exists material_requests_status_idx on material_requests (status);

create table if not exists material_request_items (
  item_id     uuid primary key default gen_random_uuid(),
  request_id  uuid not null references material_requests(request_id) on delete cascade,
  section     text,
  item_name   text not null,
  unit        text,
  quantity    numeric,
  ordered     boolean not null default false,
  received    boolean not null default false,
  line_note   text,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists material_request_items_req_idx on material_request_items (request_id);

alter table material_requests      enable row level security;
alter table material_request_items enable row level security;
drop policy if exists team_all on material_requests;
drop policy if exists team_all on material_request_items;
create policy team_all on material_requests
  for all to authenticated using (true) with check (true);
create policy team_all on material_request_items
  for all to authenticated using (true) with check (true);

grant all on material_requests      to anon, authenticated, service_role;
grant all on material_request_items to anon, authenticated, service_role;

-- a per-job / per-client rollup for the tracking view
create or replace view material_request_summary as
select
  mr.request_id, mr.job_id, j.client_name, j.client_id,
  mr.project_type, mr.status, mr.submitted_at, mr.target_delivery_date,
  count(mi.item_id)                                    as line_count,
  count(mi.item_id) filter (where mi.quantity is not null) as lines_filled,
  count(mi.item_id) filter (where mi.ordered)          as lines_ordered,
  count(mi.item_id) filter (where mi.received)         as lines_received
from material_requests mr
join jobs j on j.job_id = mr.job_id
left join material_request_items mi on mi.request_id = mr.request_id
group by mr.request_id, j.client_name, j.client_id;

-- verify -- expect requests 0, items 0, policies 2
select
  (select count(*) from material_requests)                                as requests,
  (select count(*) from material_request_items)                           as items,
  (select count(*) from pg_policies
     where tablename in ('material_requests','material_request_items'))    as policies;
