-- ============================================================
-- 40_repair_rls.sql
--
-- The app reads 0 rows from the base tables (jobs, leads, crew,
-- settings, ...) while every VIEW still returns all the data.
-- The data is intact; the signed-in role has lost its access.
--
-- This repairs both possible causes:
--   1. the team_all RLS policies were dropped
--   2. the table/sequence GRANTs to anon/authenticated were revoked
--      (happens if the public schema was ever dropped and recreated)
--
-- No data is touched. Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- 1. grants: let the API roles reach the tables at all
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- 2. re-create the team_all policy on every RLS-enabled table,
--    and make sure RLS is actually enabled
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not like 'pg_%'
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('drop policy if exists team_all on public.%I', r.relname);
    execute format(
      'create policy team_all on public.%I for all to authenticated using (true) with check (true)',
      r.relname);
  end loop;
end $$;

drop policy if exists settings_read on settings;
create policy settings_read on settings for select to authenticated using (true);

-- verify: base-table counts should now match, and every table has a policy
select
  (select count(*) from jobs)          as jobs,
  (select count(*) from leads)          as leads,
  (select count(*) from crew)           as crew,
  (select count(*) from weekly_metrics) as weekly_metrics,
  (select count(*) from pg_policies where schemaname='public') as policy_count;
