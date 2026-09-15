-- ============================================================
-- 50_weekly_lead_sources.sql
--
-- weekly_metrics was missing the LEADS & SOURCES breakdown that
-- the Weekly Entry sheet tracks alongside New Leads (Total):
-- Reached Out, Facebook/Social, Referral, Website, Phone
-- Call/Nextdoor/Google. Adds the 5 columns and backfills the 10
-- weeks already imported by 39_performance_dashboard.sql from
-- the Weekly Entry sheet (Jul 3 - Sep 4 2026 "Week Of" rows).
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table weekly_metrics add column if not exists reached_out int not null default 0;
alter table weekly_metrics add column if not exists facebook_social int not null default 0;
alter table weekly_metrics add column if not exists referral int not null default 0;
alter table weekly_metrics add column if not exists website int not null default 0;
alter table weekly_metrics add column if not exists phone_nextdoor_google int not null default 0;

update weekly_metrics set reached_out=0, facebook_social=5, referral=0, website=2, phone_nextdoor_google=0 where week_ending='2026-07-09';
update weekly_metrics set reached_out=1, facebook_social=6, referral=0, website=3, phone_nextdoor_google=0 where week_ending='2026-07-16';
update weekly_metrics set reached_out=0, facebook_social=6, referral=0, website=4, phone_nextdoor_google=0 where week_ending='2026-07-23';
update weekly_metrics set reached_out=1, facebook_social=6, referral=0, website=2, phone_nextdoor_google=1 where week_ending='2026-07-30';
update weekly_metrics set reached_out=0, facebook_social=5, referral=1, website=2, phone_nextdoor_google=2 where week_ending='2026-08-06';
update weekly_metrics set reached_out=0, facebook_social=6, referral=0, website=2, phone_nextdoor_google=2 where week_ending='2026-08-13';
update weekly_metrics set reached_out=1, facebook_social=13, referral=2, website=1, phone_nextdoor_google=0 where week_ending='2026-08-20';
update weekly_metrics set reached_out=1, facebook_social=6, referral=1, website=0, phone_nextdoor_google=1 where week_ending='2026-08-27';
update weekly_metrics set reached_out=1, facebook_social=5, referral=1, website=2, phone_nextdoor_google=2 where week_ending='2026-09-03';
update weekly_metrics set reached_out=1, facebook_social=8, referral=1, website=5, phone_nextdoor_google=0 where week_ending='2026-09-10';

-- verify: each week's tracked sources should not exceed its new_leads total
select week_ending, new_leads, reached_out+facebook_social+referral+website+phone_nextdoor_google as sourced
from weekly_metrics where week_ending>='2026-07-09' order by week_ending;
