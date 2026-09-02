-- ============================================================
--  Salexx Ops Hub — import Monday Updates
--
--  60 update threads across 26 jobs. Rosa Hernandez wrote 45,
--  Alex Mendoza 15.
--
--  This is the only place this information exists. The spreadsheets
--  never had it. "Project is on pause she ordered the wrong size",
--  "permit still under revision", "attempted welcome call no answer" —
--  the reasons behind every stalled job. Losing it means losing the
--  why, and keeping only the what.
--
--  Author names are matched to profiles where a signed-in user exists,
--  otherwise kept as plain text so nothing is dropped.
--
--  Run AFTER 10_reconcile.sql. Safe to re-run — the unique index below
--  stops a second run duplicating anything.
-- ============================================================

create table if not exists monday_updates_import (
  monday_item_id text,
  author         text,
  body           text,
  posted_at      timestamptz,
  monday_post_id text primary key
);
truncate monday_updates_import;

insert into monday_updates_import
  (monday_item_id, author, body, posted_at, monday_post_id) values
('11187519510','Rosa Hernandez','Alejandra working on engineering for permit','2026-08-18 19:30:28+00','5471168812'),
('11187519510','Alex Mendoza','Alejandra is going to visit client today to get measurments for project','2026-08-28 18:44:03+00','5500992288'),
('11533625881','Rosa Hernandez','Noor is all set with permit','2026-08-18 19:29:41+00','5471165869'),
('11533625881','Alex Mendoza','salvador needs to order beam','2026-08-28 18:38:26+00','5500975300'),
('11969421783','Rosa Hernandez','Payment was made today for Josie’s permit fees','2026-08-18 19:30:00+00','5471167012'),
('11969421783','Alex Mendoza','permit still under revision','2026-08-28 18:44:40+00','5500994197'),
('12019211365','Alex Mendoza','follow up with her','2026-08-28 18:46:30+00','5501000244'),
('12307104617','Rosa Hernandez','There’s some messages from the permit tech that wants us to fix','2026-08-18 19:31:08+00','5471171194'),
('12307104617','Alex Mendoza','just need to sumbit acknowledment form','2026-08-28 18:45:19+00','5500996547'),
('12316075590','Rosa Hernandez','Started Derek’s painting portion today .','2026-07-20 20:46:16+00','5389762950'),
('12316075590','Rosa Hernandez','Derek completed and closed out 7/21/26','2026-07-22 16:38:42+00','5395761416'),
('12401129682','Rosa Hernandez','Lexi wants the posts darker. Did not start project. Waiting to restain posts.','2026-08-18 19:27:33+00','5471156578'),
('12401129682','Rosa Hernandez','Started project today','2026-08-21 17:58:50+00','5481775658'),
('12401129682','Alex Mendoza','will be buying material waiitng till they get everything','2026-08-24 19:38:47+00','5487293809'),
('12473365529','Rosa Hernandez','8/3 pressure washed
8/4 doing siding repairs before paint
8/5 finished siding repairs','2026-08-04 16:39:38+00','5431440090'),
('12473365529','Rosa Hernandez','Painting completed. Waiting for her door to be delivered to be installed.','2026-08-06 18:56:00+00','5439472211'),
('12473365529','Rosa Hernandez','Door arrived and waiting to find a day to install','2026-08-07 17:52:11+00','5442783656'),
('12473365529','Alex Mendoza','Project is on pause she orderd the wrong size.','2026-08-10 22:59:12+00','5448500425'),
('12473365529','Rosa Hernandez','Jenni B has been informed about our crew going tomorrow at 8 am for her door install, no confirmation from her yet','2026-08-14 00:14:02+00','5459928434'),
('12473365529','Alex Mendoza','waiting on new door orderd to arrive and install','2026-08-28 18:34:30+00','5500962933'),
('12473448565','Rosa Hernandez','Started project 7/20
7/22 pausing project untill we get windows and decking delivered.','2026-07-23 20:46:06+00','5400123306'),
('12473448565','Rosa Hernandez','Informed John on going back Thursday 7am','2026-08-05 00:08:55+00','5433033331'),
('12473448565','Rosa Hernandez','Project almost complete Salvador will be working on final touches through out this week','2026-08-18 19:40:08+00','5471203404'),
('12473448565','Rosa Hernandez','Informed waiting on delivery on screen door','2026-08-21 18:08:16+00','5481812732'),
('12531946607','Rosa Hernandez','8/3 started project','2026-08-04 16:41:06+00','5431445785'),
('12531946607','Rosa Hernandez','Painting completed. Pouring concrete today.','2026-08-06 18:55:26+00','5439469775'),
('12531946607','Alex Mendoza','wrapped up project 8/8','2026-08-10 23:00:40+00','5448502697'),
('12603385878','Rosa Hernandez','Siding is done, still waiting for windows to arrive.','2026-08-04 16:37:54+00','5431432642'),
('12603385878','Rosa Hernandez','Would like to do her project around 8/24th-26th','2026-08-13 23:39:57+00','5459878109'),
('12603385878','Rosa Hernandez','Ordered new door','2026-08-21 18:04:03+00','5481795007'),
('12603385878','Alex Mendoza','Salavdor spoke to her and will be going back project in 2 weeks','2026-08-28 18:34:01+00','5500961493'),
('12605095069','Rosa Hernandez','Started Joney project today 7/23','2026-07-23 20:42:20+00','5400111683'),
('12605095069','Rosa Hernandez','Final walkthrough complete and project closed out','2026-07-27 22:14:41+00','5408611365'),
('12662828559','Rosa Hernandez','8/4 did welcome call, he said week of the 24th works for him will be in contact to confirm exact date and time','2026-08-04 22:52:23+00','5432913400'),
('12662828559','Rosa Hernandez','Started David’s project 8/17','2026-08-18 19:32:15+00','5471174859'),
('12662828559','Rosa Hernandez','Project completed Slavador just needs to go do some final touches','2026-08-21 18:09:11+00','5481816116'),
('12715774796','Rosa Hernandez','Attempted welcome call no answer','2026-08-04 22:55:27+00','5432918058'),
('12715774796','Rosa Hernandez','Attempted welcome call today no answer','2026-08-14 23:27:08+00','5462766107'),
('12715774796','Rosa Hernandez','Attempted welcome call no answer sent a message','2026-08-18 19:43:49+00','5471217398'),
('12715774796','Alex Mendoza','pushing back due to rain call to inform','2026-08-28 18:33:34+00','5500960189'),
('12731361590','Alex Mendoza','Did welcome call. Would like to get project started before summer ends. No upcoming dates where they will be away pretty much open.

Wants trex select :malted barley / railing: aluminum bronze railing color

Potential project: possible stairs and small landing till next year/','2026-08-10 22:32:53+00','5448384581'),
('12731361590','Rosa Hernandez','Doug has been informed of start date','2026-08-14 00:10:49+00','5459924586'),
('12741976294','Rosa Hernandez','Attempted Welcome call no answer','2026-08-10 22:35:27+00','5448389394'),
('12741976294','Rosa Hernandez','Started painting today 8/19','2026-08-19 20:59:55+00','5475526815'),
('12786107950','Rosa Hernandez','Attempted welcome call no answer','2026-08-14 19:42:27+00','5462315115'),
('12786107950','Rosa Hernandez','Attempted welcome call no answer sent message/ Donald confirmed start date and said that works for him','2026-08-18 19:48:05+00','5471232066'),
('12799650167','Rosa Hernandez','Cotton White SW 7104 color they wants','2026-08-18 20:00:56+00','5471277890'),
('12799936902','Rosa Hernandez','Pressure wash Saturday and Monday do siding repairs and preproikg for paint','2026-08-18 22:42:14+00','5471757913'),
('12799936902','Rosa Hernandez','Did welcome call with him and dates seem good','2026-08-18 22:42:33+00','5471758472'),
('12799936902','Rosa Hernandez','Body:
Cotton White (Satin) SW7104

Trim: White','2026-08-18 22:43:21+00','5471759685'),
('12799936902','Alex Mendoza','give Puck a call to schedule final walkthrough','2026-08-24 19:39:33+00','5487296347'),
('12800084428','Rosa Hernandez','Started Marlene’s Proejct today doing siding repairs and painting','2026-08-18 19:32:55+00','5471177543'),
('12838854890','Alex Mendoza','started today','2026-08-24 19:37:04+00','5487287923'),
('12905955808','Alex Mendoza','whiskey barrel trex','2026-08-28 18:41:31+00','5500984538'),
('11484568925','Rosa Hernandez','Finishing up final touches on paint','2026-08-04 16:38:09+00','5431433637'),
('11484568925','Rosa Hernandez','Paint completed 8/3','2026-08-10 23:18:14+00','5448585002'),
('11683576845','Rosa Hernandez','Sub will be going this week Friday after 12pm to finish painting','2026-07-22 17:25:41+00','5395971043'),
('12569498647','Rosa Hernandez','Started project 7/22 and wrapped up painting portion 7/22. Will be going back Saturday to do gutters','2026-07-23 20:43:58+00','5400116767'),
('12800089499','Rosa Hernandez','Sam has been informed of going tomorrow he said anytime after 8am works.','2026-08-14 00:12:10+00','5459926043'),
('12800089499','Rosa Hernandez','Ridges were installed and completed 8/14','2026-08-18 19:36:39+00','5471191265')
on conflict (monday_post_id) do nothing;

-- Stops a re-run creating 60 duplicate notes.
create unique index if not exists job_updates_monday_key
  on job_updates (monday_post_id) where monday_post_id is not null;

insert into job_updates (job_id, author, author_id, body, kind, posted_at, monday_post_id)
select
  j.job_id,
  i.author,
  -- link to a real profile when the name matches a signed-in user
  (select p.user_id from profiles p
    where lower(p.full_name) = lower(i.author)
       or lower(split_part(p.full_name,' ',1)) = lower(split_part(i.author,' ',1))
    limit 1),
  i.body,
  'Note',
  coalesce(i.posted_at, now()),
  i.monday_post_id
from monday_updates_import i
join jobs j on j.monday_item_id = i.monday_item_id
on conflict (monday_post_id) do nothing;

-- Anything that didn't land: an update whose job isn't in the app.
create or replace view updates_without_jobs as
select i.monday_item_id, i.author, left(i.body, 80) as body_start, i.posted_at
from monday_updates_import i
where not exists (select 1 from jobs j where j.monday_item_id = i.monday_item_id);

