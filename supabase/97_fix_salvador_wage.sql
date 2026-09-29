-- ============================================================
-- 97_fix_salvador_wage.sql
--
-- Salvador's crew row (added via a direct SQL import, not through the
-- app) has hourly_wage = null. The job_financials view does
-- coalesce(c.hourly_wage, 35.00) on the labor-rate lookup, so a null
-- silently falls back to the default $35/hr -- looks like a real rate,
-- isn't one. There is no screen in the app that edits crew wages
-- (fetchCrewRates() only ever reads hourly_wage), so this has to be
-- set directly.
--
-- 0, not null: coalesce() treats an explicit 0 as a real value and
-- keeps it, which is what actually distinguishes "we know this person
-- isn't paid an hourly wage" from "we haven't set a wage yet."
--
-- The app's Time Entry roster (index.html's `people`) is now built
-- straight from crew.role/crew.active instead of a hardcoded list, so
-- also making sure his role is Crew (not Admin -- Admin swaps the job
-- picker for a flat "overhead" label) and he's marked active, in case
-- the SQL import that created his row left either unset.
--
-- Safe to re-run.
-- ============================================================

update crew set hourly_wage = 0, role = 'Crew', active = true where name = 'Salvador';

-- verify
select name, role, hourly_wage, active from crew where name = 'Salvador';
