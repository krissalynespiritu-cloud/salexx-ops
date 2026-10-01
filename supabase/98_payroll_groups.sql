-- ============================================================
-- 98_payroll_groups.sql
--
-- Krissalyn is paid on her own schedule, separately from the crew and
-- the rest of the team, so Labor -> Payroll -> Pay Periods now shows two
-- lists: "Team" (everyone else) and "Krissalyn". Each needs its own
-- Paid/Due marker for the same two-week period, but payroll_periods (08)
-- only had one row per period_start.
--
-- Adds payroll_group and widens the primary key to
-- (period_start, payroll_group). Every existing row becomes 'team',
-- which is what those rows always meant, so nothing changes for the
-- team's existing Paid/Due history. Amounts are still never stored
-- here -- they stay computed live from time_entries x crew.hourly_wage.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table payroll_periods add column if not exists payroll_group text not null default 'team';

alter table payroll_periods drop constraint if exists payroll_periods_pkey;
alter table payroll_periods add constraint payroll_periods_pkey primary key (period_start, payroll_group);

-- verify: every row should now say 'team'
select period_start, payroll_group, paid, paid_on from payroll_periods order by period_start;
