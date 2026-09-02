-- ============================================================
--  Salexx Ops Hub — job_stage_list
--
--  The Project Delivery board needs the full, ordered list of stages
--  — including ones with zero jobs right now — to render every group
--  the way Monday does. PostgREST can't introspect an enum type
--  directly, so this exposes it as a tiny view read straight from
--  Postgres's own catalog. If a stage is ever renamed or reordered
--  again (like 11_align_stages.sql just did), the board updates
--  itself — nothing to keep in sync by hand.
--
--  Run any time. Safe to re-run.
-- ============================================================

create or replace view job_stage_list as
select enumlabel as stage, enumsortorder as ord
from pg_enum
where enumtypid = 'job_stage'::regtype
order by enumsortorder;

grant select on job_stage_list to authenticated;
