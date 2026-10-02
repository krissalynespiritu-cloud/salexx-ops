-- ============================================================
-- 99_calendar_events.sql
--
-- Backs the Ops Hub "Calendar" page: a read-only copy of the schedule
-- so the team can see it without opening GHL or Google.
--
-- Fed from the Google Calendar that GHL is linked to (GHL copies its
-- appointments there, and the grey "blocked off slots" live there too),
-- so one Google Calendar Zap covers everything. The 'ghl' source is kept
-- in case GHL appointments are ever sent directly via a GHL workflow
-- webhook later -- nothing uses it today:
--   * source = 'google' -- every event from the linked Google Calendar
--                          (GHL appointments + plain Google events like
--                          the daily REMINDER CALL items)
--   * source = 'ghl'    -- unused for now
--
-- Written ONLY by Zapier (see CALENDAR_ZAPIER_SETUP.md), which upserts
-- on (source, external_id) -- the Google event id
-- -- so an updated or cancelled appointment overwrites its own row
-- instead of adding a duplicate. Cancelled events are kept with
-- status = 'cancelled' (the app hides them), never deleted, so there's
-- a history of what was on the calendar.
--
-- Deliberately NO client/job link columns yet: per CLAUDE.md Phase 2A a
-- contact name like "Juan Romero & Salexx" is not enough evidence to
-- link an appointment to a client record. Contact phone/email are stored
-- so a link can be proposed later from real evidence.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists calendar_events (
  event_id       uuid primary key default gen_random_uuid(),
  source         text not null check (source in ('ghl','google')),
  external_id    text not null,
  calendar_name  text,
  title          text not null default '',
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  all_day        boolean not null default false,
  status         text not null default 'confirmed',
  assigned_to    text,
  contact_name   text,
  contact_phone  text,
  contact_email  text,
  ghl_contact_id text,
  location       text,
  notes          text,
  color          text,           -- Google event colorId '1'..'11' (Lavender..Tomato)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source, external_id)
);

-- color was added after the first version of this file went out; the
-- create-table above is skipped when the table already exists, so add it
-- here too (no-op on a fresh install).
alter table calendar_events add column if not exists color text;

create index if not exists calendar_events_starts_at_idx on calendar_events (starts_at);

-- updated_at tracks the last time Zapier touched the row
create or replace function calendar_events_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists calendar_events_touch on calendar_events;
create trigger calendar_events_touch before update on calendar_events
  for each row execute function calendar_events_touch();

-- Same team-wide access every other table uses. Zapier writes with the
-- secret (service_role) key, which bypasses RLS entirely.
alter table calendar_events enable row level security;
drop policy if exists team_all on calendar_events;
create policy team_all on calendar_events for all to authenticated using (true) with check (true);

-- verify
select count(*) as calendar_events from calendar_events;
