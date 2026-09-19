-- ============================================================
-- 62_hide_inactive_clients_from_view.sql
--
-- Phase 2A Step 3, item 5: a client that's been merged away
-- (active = false, set by merge_clients() in migration 61) is
-- currently still showing up on the main Clients page, mixed in
-- with real active clients -- client_value never filtered on
-- `active` because that column didn't exist when the view was
-- first written (migration 18), and nothing has updated it since.
--
-- This is a display-only fix. It does not touch the `clients`
-- table itself -- every merged-away client row, its full field
-- history, and its client_merge_log entry are all untouched and
-- still queryable directly. Only the derived, read-facing
-- client_value view (and the two views built on top of it,
-- repeat_clients and source_lifetime_value) now leaves out
-- clients.active = false rows.
--
-- No client, job, lead, estimate, or payment data changes. Purely
-- a `where` clause added to an existing view definition.
--
-- Run any time. Safe to re-run.
-- ============================================================

create or replace view client_value as
select
  c.client_id,
  c.name,
  c.phone,
  c.email,
  c.city,
  c.first_source,
  c.first_job_date,
  count(j.job_id)                                       as projects,
  count(j.job_id) filter (where j.stage = 'Completed')  as completed,
  sum(m.revenue)                                        as lifetime_value,
  sum(m.gross_profit)                                   as lifetime_gross_profit,
  round(avg(m.margin_pct), 1)                           as avg_margin_pct,
  max(j.completed_date)                                 as last_job_date,
  string_agg(distinct j.job_type, ', ')                 as trades,
  (count(j.job_id) > 1)                                 as is_repeat
from clients c
left join jobs        j on j.client_id = c.client_id
left join job_margins m on m.job_id    = j.job_id
where c.active
group by c.client_id, c.name, c.phone, c.email, c.city, c.first_source, c.first_job_date;

-- repeat_clients and source_lifetime_value both select from
-- client_value, so they inherit the active-only filter automatically
-- once it's redefined -- redeclaring them here only to be explicit
-- that this migration doesn't need to touch them separately.

-- verify: expect 144 (150 total clients minus the 6 already merged
-- away), and none of the 6 known merged-away client_ids present
select count(*) as active_clients_in_view from client_value;
