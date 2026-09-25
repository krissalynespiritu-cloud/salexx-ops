-- ============================================================
-- 85_job_costing_approved.sql
--
-- "Reviewed" (jobs.costing_reviewed) already exists and is wired
-- into margin-completeness logic and the Profitability page's
-- "Costing reviewed only" filter -- left untouched here.
--
-- This adds a separate, second sign-off stage: a job can be
-- Reviewed but not yet Approved. Purely a status flag -- it does
-- not affect margin/completeness calculations anywhere.
-- ============================================================

alter table jobs add column if not exists costing_approved boolean not null default false;
