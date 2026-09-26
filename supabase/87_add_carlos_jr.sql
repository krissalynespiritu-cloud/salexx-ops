-- ============================================================
-- 87_add_carlos_jr.sql
--
-- New crew member: Carlos Jr., $22/hr. Added to the `crew` table so
-- time_entry_costs (03_phase1.sql) picks up his real wage instead of
-- falling back to settings.labor_rate, and to index.html's people[]
-- roster so he shows up on the Time Entry page.
--
-- Safe to re-run (on conflict does nothing).
-- ============================================================

insert into crew (name, role, hourly_wage)
values ('Carlos Jr.', 'Crew', 22.00)
on conflict (name) do nothing;

-- verify
select name, role, hourly_wage from crew where name = 'Carlos Jr.';
