-- ============================================================
-- 84_social_content_types_rls.sql
--
-- social_content_types (83) was missing the same RLS setup every
-- other team-editable table in this app has, so creating a new label
-- failed with "new row violates row-level security policy" -- there
-- was no policy allowing authenticated inserts (or any other write).
-- Matches the exact team_all pattern used on social_posts (58) and
-- every other table in this app.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table social_content_types enable row level security;
drop policy if exists team_all on social_content_types;
create policy team_all on social_content_types for all to authenticated using (true) with check (true);
