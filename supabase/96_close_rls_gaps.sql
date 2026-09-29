-- ============================================================
-- 96_close_rls_gaps.sql
--
-- Fix Plan v2 "not re-checked, verify before closing": an audit of
-- every `create table` against every `enable row level security`
-- statement across all prior migrations found 3 real gaps --
-- these were never given RLS, so (per Supabase's default grants to
-- the anon/authenticated roles) they were readable/writable directly
-- over the REST API by anyone with just the publishable key:
--
--   - ghl_stage_map (94_job_pipeline_stage_always_sync.sql) -- my own
--     oversight from earlier this session; low sensitivity (just
--     stage-name translations) but should follow the same rule as
--     everything else.
--   - costing_import (27_import_real_costs.sql) -- a one-time CSV
--     staging table for a cost import, left behind permanently. Real
--     client names and dollar amounts.
--   - monday_updates_import (20_import_updates.sql) -- same story,
--     staging table for a Monday.com update-text import, left behind
--     permanently. Real job update text.
--
-- Same team-wide policy as everything else in this app: signed in,
-- or you see nothing. Safe to re-run.
-- ============================================================

alter table ghl_stage_map        enable row level security;
alter table costing_import       enable row level security;
alter table monday_updates_import enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ghl_stage_map','costing_import','monday_updates_import'] loop
    execute format('drop policy if exists team_all on %I', t);
    execute format(
      'create policy team_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- verify: each should show rowsecurity = true
select relname, relrowsecurity from pg_class
where relname in ('ghl_stage_map','costing_import','monday_updates_import');
