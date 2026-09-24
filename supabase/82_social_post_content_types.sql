-- ============================================================
-- 82_social_post_content_types.sql
--
-- Social Media Planner gets a real "Type of Content" field: a
-- multi-select set of labels per post (Carousel, Talking Head,
-- Before & After, etc.), matching the multi-label picker on the
-- Monday.com board this planner replaced.
--
-- The original content_type column (58_social_media_planner.sql) was
-- free text, singular, and never populated by the import (59) or
-- referenced anywhere in the app -- confirmed empty on every row, so
-- it's dropped outright rather than left sitting alongside the new
-- array column.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table social_posts drop column if exists content_type;
alter table social_posts add column if not exists content_types text[] not null default '{}';
