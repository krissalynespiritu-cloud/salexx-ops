-- ============================================================
-- 38_lead_source_report.sql
--
-- Backs the rebuilt Lead Source Report page (per-source funnel,
-- contact rate, revenue, project size, closed-deal list, monthly
-- marketing trend), modeled on the Sales Tracking Dashboard.
--
-- WHAT WAS DONE (applied once via the app on 2026-09-09, since it
-- depends on name-matching against the Sales Tracking Dashboard
-- workbook which is not checked in here):
--
--   * 114 leads marked estimate_booked with a date, from the
--     workbook's "Estimates Tracker" tab, matched to leads by name
--     and date.
--   * 106 leads marked shown with a date, from the "Shows Tracker"
--     tab, same matching.
--   * 21 leads linked to their won job by client name; each job got
--     jobs.lead_source stamped from the lead, and 15 of those leads
--     (the ones whose job is priced) were marked Won with the job's
--     revenue and sold date.
--
-- On a full rebuild, re-run that import from the workbook. The
-- statements below are the parts that ARE reproducible from data
-- already in the database, plus the Facebook Ads spend.
--
-- Run any time. Safe to re-run.
-- ============================================================

-- 1. any lead that booked an estimate is at least "Estimated"
update leads set status = 'Estimated'
where estimate_booked and status = 'New';

-- 2. link the 21 name-matched leads to their jobs and stamp the
--    job's lead source (only where it is still blank)
update jobs j set lead_source = l.source
from leads l
where l.job_id = j.job_id
  and j.lead_source is null;

-- 3. Facebook Ads monthly spend, Jan-Aug 2026, from the workbook's
--    Facebook Ads tab. leads = leads attributed that month.
delete from ad_spend where platform = 'Facebook Ads';
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-01-01', 'Facebook Ads', 'Monthly', 1701.00,  0, null);
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-02-01', 'Facebook Ads', 'Monthly', 1607.60,  0, null);
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-03-01', 'Facebook Ads', 'Monthly', 1500.00, 19, 'Cheapest leads but poor conversion');
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-04-01', 'Facebook Ads', 'Monthly', 3141.00, 16, 'Most expensive leads but highest revenue');
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-05-01', 'Facebook Ads', 'Monthly', 2969.00, 23, 'Mid-range CPL but zero closes');
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-06-01', 'Facebook Ads', 'Monthly', 2329.00, 22, 'Excellent balance of cost and revenue');
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-07-01', 'Facebook Ads', 'Monthly', 2058.00, 22, 'Strongest contact rate and lowest CPL so far.');
insert into ad_spend (month, platform, campaign, spend, leads, notes) values ('2026-08-01', 'Facebook Ads', 'Monthly', 2958.00, 22, 'Highest contact rate yet (71.43%) but zero closes.');

-- verify
select
  (select count(*) from leads where estimate_booked)              as est_booked,
  (select count(*) from leads where shown)                        as shown,
  (select count(*) from leads where status = 'Won')               as won,
  (select count(*) from jobs  where lead_source is not null)      as jobs_with_source,
  (select count(*) from ad_spend where platform = 'Facebook Ads') as fb_ad_months;
