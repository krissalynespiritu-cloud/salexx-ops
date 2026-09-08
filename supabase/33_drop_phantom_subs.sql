-- ============================================================
-- 33_drop_phantom_subs.sql
--
-- Migration 25 moved three misfiled sub_payments rows onto Adriana
-- Britton, "Heather" (SLX-045) and Jacob Bohanam. The Job Costing
-- sheet already accounts for those amounts as Labor, which migration
-- 32 wrote in as job_costs 'Labor' rows. The sub_payments copies are
-- now double-counting inside job_financials.material_cost.
--
-- This removes the two on jobs that ARE reconciled to the sheet.
-- SLX-045 "Heather" is a stale duplicate of "Heather Cole" (SLX-129)
-- and is not on the sheet at all - flag it for a human, do not touch
-- it here.
--
-- Run AFTER 32. Safe to re-run.
-- ============================================================

delete from sub_payments where job_id = 'SLX-041' and contract_amount = 3500.00;
delete from sub_payments where job_id = 'SLX-038' and contract_amount = 730.00;

-- verify: expect PASS
select case
  when (select material_cost from job_margins where job_id = 'SLX-038') = 555.11
   and (select material_cost from job_margins where job_id = 'SLX-041') = 10713.50
  then 'PASS' else 'FAIL - send this to Claude' end as result;
