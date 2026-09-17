-- ============================================================
-- 59_social_media_planner_import.sql
--
-- One-time backfill of the real Social Media Planner board from
-- the Monday.com export -- 112 posts across 5 non-empty stages
-- (Posted=90, Ads=11, Stuck=7, Raw Footage/Ideas=2, Ready for
-- Scheduling/Captioning=2).
--
-- Only title, stage, posting date, and the final video link are
-- imported -- the Social Media Planner table view shows Content /
-- Status / Date / Link, and the link is the one other field
-- actually useful without opening Monday.com. Caption text,
-- content type, platform, and the raw footage folder link are
-- left out on purpose (the social_posts table still has those
-- columns from migration 58 if they're ever needed later).
--
-- monday_item_id is kept only so this import can't create
-- duplicates if re-run -- it's not shown anywhere in the app.
--
-- Uses ON CONFLICT instead of a plain insert so this is safe to
-- run again even if an earlier version of this file (without the
-- video link) already ran: any post already present gets its link
-- filled in ONLY IF that link is currently blank -- it never
-- overwrites a stage, date, or link you've since edited by hand
-- in the app.
--
-- Run AFTER 58.
-- ============================================================

insert into social_posts (title, stage, posting_date, final_video_link, monday_item_id)
select * from (values
  ('Beaverton Quan', 'Raw Footage / Ideas', NULL::date, NULL, '12905102668'),
  ('Quan Process', 'Raw Footage / Ideas', NULL::date, NULL, '12973394474'),
  ('Blazer Game Ver.2', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1lgQ9vaLcV7HtaJhjSLFKjJKhbsKQ7NA2/view?usp=drive_link', '12006413502'),
  ('10 Things to Do Ver.2', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1l-mweCd7d8NXNxgf8hGdo8e6XTonqG3H/view?usp=drive_link', '12006435298'),
  ('10 Things to Do Ver.3', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1zj_y7v2lTz3BNyjcYjwU295uvpGmohlP/view?usp=drive_link', '12006435434'),
  ('Portland - Exterior painting - Elda', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1EG8PtqMTkUAhfANJVwCRHY027launROY/view?usp=drive_link', '12143817870'),
  ('Sam Before & After 2', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1jbFKRJY1I4eZqtbfSzae7FOYz6sVS9I8/view?usp=drive_link', '12494734039'),
  ('Sam Before & After 1', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1Ak8wpL5t8Kgaw0aXotrGkgDT-DCQyY8r/view?usp=drive_link', '12473508788'),
  ('Parade V2', 'Stuck', NULL::date, 'https://drive.google.com/file/d/1cG6QGmjYJLKfpdEOofB92kNjKDqXe_K2/view?usp=drive_link', '12681495962'),
  ('Speed Run', 'Ready for Scheduling/Captioning', NULL::date, 'https://drive.google.com/file/d/1tQLr90oEoixBpmoxycaDHBroomjdjyOW/view?usp=drive_link', '12905585457'),
  ('Snapping', 'Ready for Scheduling/Captioning', NULL::date, NULL, '12973408881'),
  ('What happens to a house that doesn''t get pressure wash before painting?', 'Posted', '2026-05-11 00:00:00'::date, 'https://drive.google.com/file/d/1FfsOkWfvwyfUai-okX_Ftt1LWzbrVtIa/view?usp=drive_link', '12006466749'),
  ('Funny VO ASMR', 'Posted', '2026-05-13 00:00:00'::date, 'https://drive.google.com/file/d/1Qrg2r81_2z7dI2q7NP_dqCBj-qivF5OZ/view?usp=drive_link', '12006395558'),
  ('Why do you pressure wash the house before you paint it?', 'Posted', '2026-05-14 00:00:00'::date, 'https://drive.google.com/file/d/1wzlbiVNZCFbcJMJtrd0HhWP9dsEgANIZ/view?usp=drive_link', '12006473933'),
  ('Short Compilation', 'Posted', '2026-05-15 00:00:00'::date, 'https://drive.google.com/file/d/1U9_Fyge70vCCLBY2WfZuahStQk0i3m8Y/view?usp=drive_link', '12006461934'),
  ('Lake Oswego - Exterior Paint - Adrianna', 'Posted', '2026-05-17 00:00:00'::date, NULL, '12017516020'),
  ('Lake O - WT & LT - Adrianna Short Reels 1', 'Posted', '2026-05-19 00:00:00'::date, NULL, '12026936295'),
  ('Why do you take the prep so serious?', 'Posted', '2026-05-21 00:00:00'::date, 'https://drive.google.com/file/d/1UtXhdrkn1fwTdgOlp2SIlmRe7JkZaFsn/view?usp=sharing', '12006490502'),
  ('Newberg - Exterior Paint - Kurt (Result)', 'Posted', '2026-05-22 00:00:00'::date, 'https://drive.google.com/drive/folders/1eUCh2OBt5VxgWkLBdORzauKY48leTePL', '12056959527'),
  ('Newberg - Exterior Paint - Kurt', 'Posted', '2026-05-23 00:00:00'::date, 'https://drive.google.com/file/d/1Rwq2evnNYcpspzgbo4GR1NZuCOGwTN23/view?usp=drive_link', '12017671292'),
  ('Newberg - Exterior Paint - Kurt (Before and After)', 'Posted', '2026-05-24 00:00:00'::date, 'https://drive.google.com/file/d/1JKj18mHdVPM9mN_O-VDKa0Ifv7-IM0Wn/view?usp=sharing', '12017541012'),
  ('Lake O - WT & LT - Adrianna Short Reels 2', 'Posted', '2026-05-25 00:00:00'::date, 'https://drive.google.com/file/d/1TWV6tH2t-ZhDXfDzHKDhszVajiCMZvfW/view?usp=drive_link', '12026875506'),
  ('Why they are doing this process for the framing?', 'Posted', '2026-05-28 00:00:00'::date, 'https://drive.google.com/file/d/1QtywvCLYfJ4Kg-AA4VlNAmF6f6xLSi9z/view?usp=drive_link', '12006326564'),
  ('5 AM (Alex Vid)', 'Posted', '2026-05-29 00:00:00'::date, NULL, '12143417799'),
  ('Newberg - Roof - Jon (Alex Talking Head)', 'Posted', '2026-05-30 00:00:00'::date, 'https://drive.google.com/file/d/1c_U_vtdCucvYSDx2O_yah_zptwJl_uiK/view?usp=drive_link', '12068805175'),
  ('Newberg - Exterior Paint - Kurt', 'Posted', '2026-05-31 00:00:00'::date, 'https://drive.google.com/drive/folders/1WrlSBwdNTeTMwwWO9uzu3UchrrA909ox?usp=drive_link', '12122361258'),
  ('Lake O - WT & LT - Adrianna', 'Posted', '2026-05-31 00:00:00'::date, 'https://drive.google.com/file/d/1m1dOZEp18-jGH4A7IaDlH6L8xpmXEGDD/view?usp=drive_link', '12006082617'),
  ('Newberg - LT - Kurt (Short Form 1)', 'Posted', '2026-06-01 00:00:00'::date, 'https://drive.google.com/file/d/1vhY77t7sNQK8pvoMmbD9YU94wJsTTKAq/view?usp=drive_link', '12088536526'),
  ('Why they take off all the plywood from the roofing projects?', 'Posted', '2026-06-04 00:00:00'::date, 'https://drive.google.com/file/d/1Dy8mYGiJrWb8tFWwwZwb8tbjpWsemwDZ/view?usp=drive_link', '12006338126'),
  ('Kid Dancing (Alex Vid)', 'Posted', '2026-06-05 00:00:00'::date, 'https://drive.google.com/file/d/1RNJT66D9zRctqdKPPE1IQQLGCcFeBtDJ/view?usp=sharing', '12143437314'),
  ('Hillsboro - Roofing - Katherine', 'Posted', '2026-06-06 00:00:00'::date, 'https://drive.google.com/file/d/1CC6iokz5JDh8SPdBvbKdzZU3jxCphKHj/view?usp=drive_link', '12122742150'),
  ('Portland - Exterior Painting - Heather', 'Posted', '2026-06-07 00:00:00'::date, 'https://drive.google.com/drive/folders/1_oma82h4HmEvbSDSikmd2fCl_TZWxnae?usp=drive_link', '12143800335'),
  ('Newberg - LT - Kurt (Short Form 2)', 'Posted', '2026-06-08 00:00:00'::date, 'https://drive.google.com/file/d/1IKmcDHm-8gZ5kE0Au9oFZahbKPxk1wi3/view?usp=drive_link', '12088556519'),
  ('Portland - Exterior Painting - Elda', 'Posted', '2026-06-11 00:00:00'::date, 'https://drive.google.com/file/d/1TkR8YJB3doq9_GX14jhZzsR_ulZava5J/view?usp=drive_link', '12143816744'),
  ('Siding  - Behind The Scene', 'Posted', '2026-06-12 00:00:00'::date, 'https://drive.google.com/file/d/1CwLsDz_gEoG4CYp9AzWCsdeQlqpuFnKn/view?usp=drive_link', '12133793265'),
  ('Newberg - Siding - Mexican Lady (Teresa)', 'Posted', '2026-06-13 00:00:00'::date, 'https://drive.google.com/file/d/1gHDClcWfNAUaXzvU8XrvOMMaHZ2llBQT/view?usp=drive_link', '12130803637'),
  ('Newberg - LT - Kurt YT', 'Posted', '2026-06-14 00:00:00'::date, 'https://drive.google.com/file/d/1XU67rdNzGu969u5ojWZAQqjcOxA4R8jT/view?usp=drive_link', '12017671049'),
  ('Newberg - Siding - Mexican Lady (Teresa)', 'Posted', '2026-06-14 00:00:00'::date, 'https://drive.google.com/drive/folders/1mCTMtw3JYm8imwJ6mgAH9oi7U2MRVWXa?usp=drive_link', '12017523488'),
  ('Beaverton - Exterior Siding - Ronald (Process)', 'Posted', '2026-06-18 00:00:00'::date, 'https://drive.google.com/file/d/1FH2_ehwHSgk9ditBAHJvgvrRP6uqs_rX/view?usp=drive_link', '12143816041'),
  ('Beaverton - Decking - Chris B', 'Posted', '2026-06-19 00:00:00'::date, 'https://drive.google.com/file/d/1uxpsj-gHjVFCveWrGpdlp1y_Zq3eOu7w/view?usp=drive_link', '12185812470'),
  ('Newberg - Roof - Jon (Victor Talking Head)', 'Posted', '2026-06-20 00:00:00'::date, 'https://drive.google.com/file/d/1-aPfWw58bqK1f0ZaQYE0SYlkyEGQLKlE/view?usp=sharing', '12068756729'),
  ('Newberg - Siding - Mexican Lady Teresa (Short Clips)', 'Posted', '2026-06-21 00:00:00'::date, 'https://drive.google.com/file/d/1pTAwe3a7bq5lFak_ZZZfSRYuYZwIP9YD/view?usp=drive_link', '12187752353'),
  ('Newberg - Roof - Jon (Short Form 2)', 'Posted', '2026-06-23 00:00:00'::date, 'https://drive.google.com/file/d/1rL13pncfdun8FkZ3CKvJe17i4o74UAGn/view?usp=sharing', '12122159875'),
  ('What type of paint we use?', 'Posted', '2026-06-25 00:00:00'::date, 'https://drive.google.com/file/d/1lXmj5-I-NpBCtoQuV48SaAl-takiH8IM/view?usp=drive_link', '12374634528'),
  ('Nailgun Sound', 'Posted', '2026-06-26 00:00:00'::date, 'https://drive.google.com/file/d/1d_YStMjhOnWa-r9ziTlLA1XS69dHmpB3/view?usp=drive_link', '12374653197'),
  ('Fara''s Deck', 'Posted', '2026-06-28 00:00:00'::date, NULL, '12385278320'),
  ('Diane', 'Posted', '2026-06-29 00:00:00'::date, NULL, '12401074282'),
  ('10 Years Warranty', 'Posted', '2026-07-02 00:00:00'::date, 'https://drive.google.com/file/d/1aFisyVH16-wZRgXpqagmYKKw_4ntZ4bI/view?usp=drive_link', '12376190446'),
  ('FREE ESTIMATES', 'Posted', '2026-07-03 00:00:00'::date, 'https://drive.google.com/file/d/1JVg12ddBmiOcMD-Tphw9MUAldxh-HUpX/view?usp=drive_link', '12426712494'),
  ('Pergola', 'Posted', '2026-07-04 00:00:00'::date, NULL, '12435085245'),
  ('Beaverton - Deck - Diane', 'Posted', '2026-07-05 00:00:00'::date, 'https://drive.google.com/drive/folders/11Mt0Xn8lcSkVqx1TTMq8UzF3i_sCMnKT?usp=drive_link', '12426380795'),
  ('Newberg - Roof - Jon (Long Form Full)', 'Posted', '2026-07-05 00:00:00'::date, 'https://drive.google.com/file/d/1UWKxPBVx6s1C55G7HAtrzFZprjh0Bk7C/view?usp=sharing', '12131732657'),
  ('Pal Happy (Client Google Review)', 'Posted', '2026-07-06 00:00:00'::date, 'https://drive.google.com/file/d/1SAW_w2Oaw7vgpNyBIR9NPt4eHILSA9ex/view?usp=drive_link', '12459073646'),
  ('One Stop Shop', 'Posted', '2026-07-09 00:00:00'::date, 'https://drive.google.com/file/d/1bX3EBJEmcYOjxdSksgo2QbWU46sb5Udi/view?usp=drive_link', '12385302764'),
  ('What motivates you?', 'Posted', '2026-07-10 00:00:00'::date, 'https://drive.google.com/file/d/1zUaVEwDrboK3nAPHhebfnqo-29odbBiN/view?usp=sharing', '12401110905'),
  ('Sam Talking Head', 'Posted', '2026-07-11 00:00:00'::date, 'https://drive.google.com/file/d/1gZ-GabneAEpXpMLM2F3JtapO_RK30wAb/view?usp=drive_link', '12473504988'),
  ('Portland - Painting - Elda', 'Posted', '2026-07-12 00:00:00'::date, 'https://drive.google.com/drive/folders/1xReNCUR7fn9qTk_dH0hHe560e4CDxudq?usp=drive_link', '12426772856'),
  ('Kimberly Educational Video 1', 'Posted', '2026-07-16 00:00:00'::date, 'https://drive.google.com/file/d/1kNEmvt8cBY2cZdYMWWvbt_TiiZaVDQmX/view?usp=drive_link', '12473508910'),
  ('Sam - Funny', 'Posted', '2026-07-17 00:00:00'::date, 'https://drive.google.com/file/d/1ZRkSp8swa9qX7j0hOFCnVJhLBblZoSJ7/view?usp=drive_link', '12494770260'),
  ('Kimberly - Talking Head', 'Posted', '2026-07-18 00:00:00'::date, 'https://drive.google.com/file/d/1DTOLUz-K6-KVJD-cTKdEPLpaf4cTJGV7/view?usp=drive_link', '12543900431'),
  ('Kimberly - Painting - Carousel', 'Posted', '2026-07-19 00:00:00'::date, 'https://drive.google.com/drive/folders/1VuzsiR9gPVddQ6z8moEbG3nIk-gUavFZ?usp=drive_link', '12545199723'),
  ('Kimberly - Short Ver. 1', 'Posted', '2026-07-20 00:00:00'::date, 'https://drive.google.com/file/d/1ga_tB3ucH5TfmI7lTNq4A6tjx-DT3DvW/view?usp=drive_link', '12554132119'),
  ('Kimberly Educational Video 2', 'Posted', '2026-07-23 00:00:00'::date, 'https://drive.google.com/file/d/1nfMt7_aRe0UM3yYA6vefxmW62hJqfVqV/view?usp=drive_link', '12473508913'),
  ('Elda - Painting Ver 1', 'Posted', '2026-07-24 00:00:00'::date, 'https://drive.google.com/file/d/1TJuqXgEMCoSKBGyZaQd0pUypsZalaURh/view?usp=drive_link', '12426382461'),
  ('Morgan - Talking Head', 'Posted', '2026-07-25 00:00:00'::date, NULL, '12583169688'),
  ('Morgan - Before and After', 'Posted', '2026-07-26 00:00:00'::date, NULL, '12583725116'),
  ('Kimberly - Short Ver. 2', 'Posted', '2026-07-27 00:00:00'::date, 'https://drive.google.com/file/d/16gE-YKm6v3KnqBBP0-d63fzLPX0rBtZQ/view?usp=drive_link', '12562799580'),
  ('James Hardie', 'Posted', '2026-07-30 00:00:00'::date, 'https://drive.google.com/file/d/1frUTZ559OOqQnl06Zgq38cpJ8iBVAMnR/view?usp=sharing', '12385299890'),
  ('Client Walking', 'Posted', '2026-07-31 00:00:00'::date, 'https://drive.google.com/file/d/1cWC9ZRIpSCuSFsTzF_00LU0xvuxBf6To/view?usp=drive_link', '12678910551'),
  ('Parade V1', 'Posted', '2026-08-01 00:00:00'::date, 'https://drive.google.com/file/d/1lsWc4RCryKc90lzF9QdhpfKWsrgTR5z_/view?usp=drive_link', '12681570133'),
  ('Sam - Roofing - Portland Ver 1', 'Posted', '2026-08-02 00:00:00'::date, 'https://drive.google.com/file/d/134qn5ek6kleUI3otFImnMHgpJ_hHmcYe/view?usp=drive_link', '12412947922'),
  ('Sam Before & After 3', 'Posted', '2026-08-03 00:00:00'::date, 'https://%20%20%20v', '12494753774'),
  ('Kimberly - Short Ver. 3', 'Posted', '2026-08-03 00:00:00'::date, 'https://drive.google.com/file/d/1o5d_mLnzzO1FGzWv8da8Cd-3-eobC8YE/view?usp=drive_link', '12562799582'),
  ('Sam - Roofing - Portland Ver 2', 'Posted', '2026-08-06 00:00:00'::date, 'https://drive.google.com/file/d/1kjw0FK1Z968rRgLrnU-7weTCSQDRMj-s/view?usp=drive_link', '12426374560'),
  ('Kimberly - YT Version', 'Posted', '2026-08-07 00:00:00'::date, 'https://drive.google.com/file/d/1v9R8FU1xYkCScF9yuUPKM1jlcNzCJOy1/view?usp=drive_link', '12522700736'),
  ('Preston Before and In Progress', 'Posted', '2026-08-07 00:00:00'::date, 'https://drive.google.com/file/d/1FOzkKz2oh9E7Dlc6OaPdYPA6UyH8q6My/view?usp=drive_link', '12006411730'),
  ('Amanda - Beaverton - Talking Head', 'Posted', '2026-08-08 00:00:00'::date, NULL, '12583664205'),
  ('Amanda - Before & After', 'Posted', '2026-08-09 00:00:00'::date, NULL, '12583192373'),
  ('Morgan - Testimonial - Short Form', 'Posted', '2026-08-10 00:00:00'::date, 'https://drive.google.com/file/d/1HKhF7FHNiOiEF8u0Gz_FbDHQM1fDYBtm/view?usp=sharing', '12583180485'),
  ('Deck Educ 01', 'Posted', '2026-08-13 00:00:00'::date, NULL, '12776766367'),
  ('Morgan - Testimonial - Long Form', 'Posted', '2026-08-14 00:00:00'::date, 'https://drive.google.com/file/d/16_ExQWwj0gVKgoumLT7b-A550w0FPfCT/view?usp=drive_link', '12583176342'),
  ('Can I see your work', 'Posted', '2026-08-14 00:00:00'::date, 'https://drive.google.com/file/d/1DRh_BPY7NenmMRyzdt-GBdxVkGyAQxY1/view?usp=drive_link', '12809591700'),
  ('Ronald - Painting - Talking Head', 'Posted', '2026-08-15 00:00:00'::date, NULL, '12583590718'),
  ('Ronald - Carousel', 'Posted', '2026-08-16 00:00:00'::date, NULL, '12797050520'),
  ('Deck Educ 02', 'Posted', '2026-08-20 00:00:00'::date, NULL, '12776757857'),
  ('Work w boss', 'Posted', '2026-08-21 00:00:00'::date, NULL, '12857252377'),
  ('Elda - Painting Ver 2', 'Posted', '2026-08-22 00:00:00'::date, 'https://drive.google.com/file/d/19O00A7Z24VXKPD0XXZwwta-NVXHHEP1m/view?usp=drive_link', '12426355641'),
  ('Brad''s Roof Showcase', 'Posted', '2026-08-23 00:00:00'::date, 'https://drive.google.com/file/d/1gFvmTVoIJgkUNpI8PQk9-5Tx2akILyoi/view?usp=drive_link', '12006411982'),
  ('Amanda - Testimonial - Short Form V1', 'Posted', '2026-08-24 00:00:00'::date, NULL, '12583192895'),
  ('Newberg - Roof - Jon (Short Form 1)', 'Posted', NULL::date, 'https://drive.google.com/drive/folders/1MJHYEpBE2gX3VvnXGDj7HTa2z796sVFI', '12122088243'),
  ('Newberg - LT - Kurt (Short Form Full)', 'Posted', NULL::date, 'https://drive.google.com/file/d/1kdNsvLhWIEQ6NchiK_4dnzXyLn7P_PKc/view?usp=sharing', '12088612634'),
  ('Siding Educ Content 1', 'Posted', '2026-08-27 00:00:00'::date, 'https://drive.google.com/file/d/1bXr26oRVquxNTP7Emd3fWgWAkOCg6t0Q/view?usp=drive_link', '12857273286'),
  ('Bored Video', 'Posted', '2026-08-28 00:00:00'::date, 'https://drive.google.com/file/d/17vsCnt0F0a8TmCTwc3Sn5Vd9Lea-wH8w/view?usp=drive_link', '12857272445'),
  ('David - Talking Head', 'Posted', '2026-08-29 00:00:00'::date, 'https://drive.google.com/file/d/1tc4kjhQHCbVxo1GiX8iMnYtEknJRvwKh/view?usp=drive_link', '12583200684'),
  ('Amanda - Testimonial - Short Form V2', 'Posted', '2026-08-31 00:00:00'::date, NULL, '12835233295'),
  ('Siding Educ Content 2', 'Posted', '2026-09-03 00:00:00'::date, 'https://drive.google.com/file/d/1vstyUmWSEs83DysRzM5UarFpJYKKRAnm/view?usp=drive_link', '12857273261'),
  ('Amanda - Testimonial - Long Form', 'Posted', '2026-09-05 00:00:00'::date, NULL, '12583192651'),
  ('Trust Fall', 'Posted', '2026-08-29 00:00:00'::date, 'https://drive.google.com/file/d/1FDUW1I15KqFMU5Vo600t5v3xVrbWHi7z/view?usp=drive_link', '12905596847'),
  ('Marlene Carousel', 'Posted', '2026-08-29 00:00:00'::date, NULL, '12982110756'),
  ('Marlene - Talking Head', 'Posted', '2026-09-05 00:00:00'::date, NULL, '12982127825'),
  ('Marlene''s Audio Testimonial', 'Posted', '2026-09-07 00:00:00'::date, NULL, '12973433799'),
  ('Rosa Ad', 'Ads', NULL::date, 'https://drive.google.com/file/d/1s1JCDlEjzYscjgH4dt--7sYobF3teq8g/view?usp=drive_link', '12583225382'),
  ('Deck Ad', 'Ads', NULL::date, NULL, '12678910545'),
  ('Painting Ad Lake Oswego', 'Ads', NULL::date, 'https://drive.google.com/file/d/1c7dpdFy8BwR7Ipm2vXqECWbVpcp5Gbdd/view?usp=drive_link', '12708352819'),
  ('Painting Ad Hillsboro', 'Ads', NULL::date, 'https://drive.google.com/file/d/1VJGoiLcAXBGf-HYGaXq_f_xCRkdtrhNb/view?usp=drive_link', '12737960828'),
  ('Painting Ad Beaverton', 'Ads', NULL::date, 'https://drive.google.com/file/d/1cOrmp-fxZUpk3_ysIQKIb8emmSYjNMGd/view?usp=drive_link', '12737959808'),
  ('Painting Ad Portland', 'Ads', NULL::date, 'https://drive.google.com/file/d/1sM9tNHXC9rtXu7mhXYvjhGrmcgNTNJ84/view?usp=drive_link', '12737980474'),
  ('Painting Ad Tigard', 'Ads', NULL::date, 'https://drive.google.com/file/d/1MwtCWomeaHJWEObmJK5wqjXJT4NCIBtv/view?usp=drive_link', '12738034343'),
  ('Paint Ad', 'Ads', NULL::date, 'https://drive.google.com/file/d/1k0u60mCZzlqmVPsWgl6VHpwbaz3ROOct/view?usp=drive_link', '12017671602'),
  ('Jon - Roofing Ad', 'Ads', NULL::date, NULL, '12068843846'),
  ('Siding Ad', 'Ads', NULL::date, 'https://drive.google.com/file/d/1TnnxNVLQYBHLmUY1EMPMV2AXVLZJdo-p/view?usp=drive_link', '12017683199'),
  ('ADS (Adriana)', 'Ads', NULL::date, 'https://drive.google.com/file/d/1lJqqZAWOJn00YCTUTc7ZZkc-sxnDiWgC/view?usp=drive_link', '12006452416')
) as v(title, stage, posting_date, final_video_link, monday_item_id)
on conflict (monday_item_id) where monday_item_id is not null do update
  set final_video_link = excluded.final_video_link
  where social_posts.final_video_link is null;

-- verify
select count(*) from social_posts;
select stage, count(*) from social_posts group by stage order by stage;
