-- ============================================================
-- 83_social_content_types_table.sql
--
-- The 16 content-type labels added in 82 were a hardcoded JS list --
-- fine to pick from, but no way to add a new one or fix a typo
-- without a code change. Moves them into a real table so the
-- Social Media Planner's "Type" picker can create and rename labels
-- itself, matching the "Create or find labels" + "Edit labels"
-- picker on the Monday.com board this replaced.
--
-- social_posts.content_types keeps storing plain label names (not
-- type_id) since it's a lightweight tag array, not a normalized
-- relation -- renaming or deleting a label here cascades to every
-- post's content_types array from the app side (array_replace /
-- array filter), not via a foreign key.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists social_content_types (
  type_id     uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

insert into social_content_types (name, sort_order) values
  ('Ads',0),('Before & After',1),('BTS',2),('Carousel',3),('Educational',4),
  ('Google Blog',5),('Project Update',6),('Short Clips',7),('Short Showcase',8),
  ('Skit/Funny',9),('Talking Head',10),('Team/Culture',11),('Testimonial',12),
  ('Timelapse',13),('Victor Talking',14),('Walkthrough',15)
on conflict (name) do nothing;
