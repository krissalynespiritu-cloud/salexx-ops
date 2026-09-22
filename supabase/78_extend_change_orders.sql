-- ============================================================
-- 78_extend_change_orders.sql
--
-- Roadmap Phase 4, item #19 (Change Orders), extending the log
-- added in 73_job_change_orders.sql to match the roadmap's fuller
-- field list: description, reason, amount, cost impact, dates,
-- status, approver.
--
-- Adds:
--   reason         -- why the change happened (Client Request,
--                     Design Change, Unforeseen Condition, Code
--                     Requirement, Other)
--   cost_impact    -- the internal cost impact of the change,
--                     separate from `amount` (what the client is
--                     charged) -- a change order can raise the price
--                     more or less than it actually costs to do
--   status         -- Pending / Approved / Rejected
--   approved_date  -- when it was actually approved (co_date already
--                     existed as the requested/logged date)
--
-- Backs the roadmap's formula (original contract + approved change
-- orders - discounts = current contract), now shown on the Change
-- Orders tab computed from only the Approved rows -- Pending and
-- Rejected rows are logged but don't count toward it.
--
-- Every existing row (if any were logged between 73 going live and
-- this migration) defaults to status = 'Pending'. This is NOT a
-- guess that they're unapproved -- there's no reliable signal either
-- way, and per CLAUDE.md, an unknown default is the honest choice,
-- never assumed Approved. Anyone already logged can be flipped to
-- Approved from the tab in a few seconds if that's accurate.
--
-- Purely additive. No existing job_change_orders row's description,
-- amount, co_date, or approved_by is touched.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table job_change_orders add column if not exists reason text;
alter table job_change_orders add column if not exists cost_impact numeric not null default 0;
alter table job_change_orders add column if not exists status text not null default 'Pending' check (status in ('Pending','Approved','Rejected'));
alter table job_change_orders add column if not exists approved_date date;

-- verify -- shows every existing row's new columns (status should be
-- 'Pending' for all of them until reviewed)
select change_order_id, job_id, description, status, cost_impact, approved_date
from job_change_orders
order by created_at desc;
