-- ============================================================
-- 58_social_media_planner.sql
--
-- New Social Media Planner page: a content pipeline (grouped table
-- + calendar view of the same data) for organic/paid social posts,
-- separate from FB Ads (which tracks ad spend/leads/ROAS, not
-- content production).
--
-- stage is the pipeline column a post sits in, matching the
-- Monday.com board this replaces: Raw Footage / Ideas, Editing in
-- Progress, Stuck, Ready for Scheduling/Captioning, Scheduled,
-- Posted, Ads. platform and content_type are free text (platform is
-- often a comma-separated list like "FB + IG, Google, TikTok" in the
-- source data, so it isn't a strict single-select).
--
-- monday_item_id keeps the Monday.com item id from the import (59)
-- so the matching "Updates" export (full post captions, one per
-- item) could be re-joined later if more come in the same format.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists social_posts (
  post_id          uuid primary key default gen_random_uuid(),
  title            text not null,
  caption          text,
  stage            text not null default 'Raw Footage / Ideas'
    check (stage in ('Raw Footage / Ideas','Editing in Progress','Stuck','Ready for Scheduling/Captioning','Scheduled','Posted','Ads')),
  posting_date     date,
  content_type     text,
  platform         text,
  final_video_link text,
  raw_folder_link  text,
  monday_item_id   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists social_posts_stage_idx on social_posts (stage);
create index if not exists social_posts_posting_date_idx on social_posts (posting_date);
create unique index if not exists social_posts_monday_item_id_idx on social_posts (monday_item_id) where monday_item_id is not null;

alter table social_posts enable row level security;
drop policy if exists team_all on social_posts;
create policy team_all on social_posts for all to authenticated using (true) with check (true);
grant all on social_posts to anon, authenticated, service_role;

drop trigger if exists social_posts_touch on social_posts;
create trigger social_posts_touch before update on social_posts
  for each row execute function touch_updated_at();

-- verify
select count(*) from information_schema.tables where table_name = 'social_posts';
