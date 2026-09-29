-- ============================================================
-- 90_lead_pipeline_stage.sql
--
-- Zapier automations watch GHL's pipeline and, until now, mirrored the
-- stage name into a matching Monday.com item -- Monday is being retired
-- in favor of this app. Rather than mapping every one of GHL's pipeline
-- stage names (Design Presentation, etc. -- names that don't correspond
-- to any existing tracked field on a lead) onto specific boolean/date
-- columns one at a time, this adds one generic text column that simply
-- mirrors whatever GHL calls the stage. It's informational context
-- shown on the Leads Tracker, not a source of truth for anything the
-- app computes -- the real tracked milestones (estimate_booked, shown,
-- design_sent_date, design_sold_date, closed_revenue) stay exactly as
-- they are today, set inside the app itself.
--
-- Safe to re-run.
-- ============================================================

alter table leads add column if not exists pipeline_stage text;
alter table leads add column if not exists pipeline_stage_updated_at timestamptz;

-- verify
select lead_id, name, pipeline_stage, pipeline_stage_updated_at from leads limit 5;
