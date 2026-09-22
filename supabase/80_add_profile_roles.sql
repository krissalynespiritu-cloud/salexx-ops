-- ============================================================
-- 80_add_profile_roles.sql
--
-- Roadmap Phase 2/P2 item #93: first slice of roles/permissions.
-- Per discussion, this is deliberately just the infrastructure --
-- Owner / Admin / Staff added to every profile -- with ZERO
-- enforcement change. Every table's RLS policy is still the same
-- `for all to authenticated using (true)` it's always been; nothing
-- is restricted by this migration.
--
-- Everyone defaults to 'Staff', the least-privileged value, since
-- there's no way to know who should be Owner/Admin without being
-- told -- never guessed. The real owner (and any admins) need their
-- role set once, either directly in Supabase or from the new Team
-- page's role dropdown (which itself has no access restriction yet,
-- same "anyone can edit anything" model as the rest of the app today).
--
-- Enforcing actual restrictions (e.g. payroll/margins visibility) is
-- a deliberately separate, later, explicitly-approved step -- this
-- migration and its UI only make roles visible and assignable.
--
-- Purely additive. No existing profile's data is touched beyond the
-- new column's default value.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table profiles add column if not exists role text not null default 'Staff' check (role in ('Owner','Admin','Staff'));

-- verify -- shows every current profile and its (default) role
select user_id, full_name, job_title, role from profiles order by full_name;
