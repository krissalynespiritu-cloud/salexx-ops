-- ============================================================
--  Salexx Ops Hub — sync from the live Monday "Project Delivery" board
--
--  132 items. Monday is the source of truth for stage, contract
--  price, location, crew type, and the Drive folder link — those are
--  what Rosa and Alex maintain there every day.
--
--  This fixes a real mismatch: the app currently shows 24 jobs in
--  "Designs Sold" because blank statuses in the old spreadsheets were
--  defaulted there. Monday says 2. Monday is right.
--
--  Matching is by monday_item_id first (how every re-run stays stable).
--  For jobs with no id yet, a client-name match links them ONLY when it's
--  unambiguous — exactly one still-unlinked job and exactly one Monday row
--  share that name. Repeat clients are real (same person, different
--  projects at different times), so when a name matches more than one job
--  or more than one Monday row, it's left unmatched on purpose rather than
--  guessed — see the two review queries near the bottom of this file.
--  Jobs the app has that Monday doesn't are left alone, not deleted.
--
--  Run AFTER 06_lead_import.sql and 11_align_stages.sql. Safe to re-run.
-- ============================================================

create temporary table monday_import (
  monday_item_id  text primary key,
  client_name     text,
  stage           text,
  job_type        text,
  address_city    text,
  crew            text,
  contract_price  numeric(12,2),
  sold_date       date,
  completed_date  date,
  drive_folder_url text,
  permit_required boolean
) on commit drop;

insert into monday_import values
('12019211365','Molly Robertson','Designs Sold','Decking, Window replacement','1010 Charles st newberg or','In House',null,'2026-06-11',null,'https://drive.google.com/drive/folders/1TKzIptp72VNoIKULJmpvCLdewA88tlZI',null),
('12825005262','Sarah Lyn Lawton','Designs Sold',null,null,null,null,null,null,'https://drive.google.com/drive/folders/1BSYUEboR6666l3fQml9APGEfe2nKbMWy',null),
('12307104617','Kim Barrett','Permitting / Drawings','Patio Cover','12911 SW 147th Place Tigard OR 97223','In House',27600.75,'2026-06-18',null,'https://drive.google.com/drive/folders/1L8EO-x9v8uXTT0Ot0tzqn0PKAGpYq6wf',null),
('11969421783','Josie Hudspeth','Permitting / Drawings','Outdoor Structure + Decking + Concrete','1054 Se Franklin st portland or','In House',31900.0,'2026-06-23',null,'https://drive.google.com/drive/folders/1YK_qC3R2wJ3BzFWrBb7bOJ7CS-4No1Ar',true),
('11187519510','Angelina Rockelman','Permitting / Drawings','Patio Cover','2238 SE Thrush Avenue Hillsboro OR 97123','In House',14497.32,'2026-05-11',null,'https://drive.google.com/drive/folders/1p3d-nh21fvpFZSo3Xw_txMDFmMfCc4eT',true),
('11533625881','Noor','Ready For Scheduling','Hardscaping','8328 SW Perennial Pl, Beaverton, OR 97007','In House',44869.82,'2025-12-15',null,'https://drive.google.com/drive/folders/1hVBbaMdP4TwI1fN0GqF37FKYR8wfgr0e',true),
('12928063573','Kathy Whitney','Ready For Scheduling',null,'1203 E 7th St Newberg OR',null,null,null,null,'https://drive.google.com/drive/folders/1litifdm5-Eu4fqQn86AJkOFS2dsNSK9Z',null),
('12905955808','Phil Rose','Project Scheduled','Decking',null,null,19779.25,'2026-08-26',null,'https://drive.google.com/drive/folders/1CKPixb1wkntzIOc4risiIuSYqSj7meC3',null),
('12715774796','Tim Packard','Project Scheduled','Roofing','269 15th st Lafayette OR','In House',19521.04,'2026-08-04',null,'https://drive.google.com/drive/folders/1zWsg-aXl5BXMcfc4_6j-XACfYGTvyqSK',null),
('12786107950','Donald Carothers','Project Scheduled','Exterior Painting','525 Church St Dayton OR 97114','Sub out',14997.45,'2026-08-12',null,'https://drive.google.com/drive/folders/1yFuwFFEwwz1wTJEUhCNaEqpkva3PKMom',null),
('12731361590','Doug Baldwin','Project Scheduled','Decking','1395 sw 31st st Gresham OR','In House',32450.25,'2026-08-06',null,'https://drive.google.com/drive/folders/1xJmhTRK3rpRoW9Y_VNqai5ZCiaqfeeG_',null),
('12473448565','John Tran','In Progress','Decking','11220 sw chickadee terrce Beaverton OR 97007 Beaverton OR 97007','In House',40000.0,'2026-07-07',null,'https://drive.google.com/drive/folders/1tdIqDgh64ifdPD9pdk6jkTAuNkLUdDn0',null),
('12603385878','Sarah Lyn Lawton','In Progress','Siding + Windows','1985 Northwest 156th Avenue Beaverton OR 97006','In House',24800.0,'2026-05-19',null,'https://drive.google.com/drive/folders/1sCV2R6RTQd9Uc2MC_TQWsNKYu7oV2w-n',null),
('12473365529','Jenni Bee','In Progress','Siding + Painting','11375 sw 95th ave Tigard OR',null,10228.76,'2026-07-07',null,'https://drive.google.com/drive/folders/1BqDiOkKgy9cFq-vLRuZsG9gc2wRbCIbo',null),
('12838854890','Quan Phan','In Progress','Exterior Painting','9915 SW Ironstone Beaverton OR',null,48000.0,'2026-08-19',null,'https://drive.google.com/drive/folders/1A-7_gxkSmtk0AbQ2O-5ViM7bcrU5lx3l',null),
('12401129682','Lexi Vandomelen','In Progress','Interior + Staircase','9079 Southwest Waverly Drive Tigard OR 97224','In House',3777.5,'2026-03-20',null,'https://drive.google.com/drive/folders/1QM4cVxLr-KS9NYTtS6mjncI4SMLH6Czr',null),
('12799936902','Puck Ja','In Progress','Siding','5373 NW Lianna Way, Portland, OR 97229','In House',null,null,null,'https://drive.google.com/drive/folders/11hj9XmLQczkpjXS0tCXo43DaEbUk-YLI',null),
('12799650167','Puck Ja','In Progress','Exterior Painting','5373 NW Lianna Way, Portland, OR 97229','Sub out',14275.0,'2026-08-13',null,'https://drive.google.com/drive/folders/1mJyF5UgR32lvPLy8dYKYG90Tmx8qLcPG',null),
('11428534651','Kena James','Punch list / Touch-ups (if needed)','Staircase','2415 dillow drive West Linn OR 97068 West Linn OR 97068',null,7820.75,'2026-03-17','2026-05-11','https://drive.google.com/drive/folders/1rIUBKsLDWAmggvX_nrdx11MU7o8CpxrQ',null),
('11438825230','Brad','Punch list / Touch-ups (if needed)','Roofing + Staircase','12251 NE Dudley Rd, Newberg, OR 97132 FORT BRAGG CA 95437',null,46450.0,'2026-03-05','2026-03-05','https://drive.google.com/drive/folders/14pb6GWYVDr4z2vf4RYQzbnTMU1zvzyK1',null),
('11393704561','Adriana Britton','Punch list / Touch-ups (if needed)','Siding + Painting','4012 se rio vesta st Portland Or',null,77916.1,'2026-01-08','2026-05-08','https://drive.google.com/drive/folders/1UGrZHniJ0-8VTKgN6voaJTbop3Ybks_I',null),
('12093107025','Jesus Santana','Punch list / Touch-ups (if needed)',null,null,'Sub out',31865.0,'2025-10-25','2026-05-26','https://drive.google.com/drive/folders/14EJ1t_tXgOXePvhHwXjtkHlHUMyyPuLa',null),
('10741679395','Jason Largent','Final payment due','Holiday Lights','10516 Southwest Titan Lane, Tigard Or',null,400.0,'2025-12-15','2026-01-18','https://drive.google.com/drive/folders/1_B5c7_A1Qm2XiDKNMfm0M9e0DeANNR1M',null),
('10748570503','Jerry Dowell','Final payment due',null,null,null,19342.42,'2025-05-29','2025-05-30','https://drive.google.com/drive/folders/1XUtaFWGCwsyju2NUlhFabk-uNPNl88j5',null),
('10748554908','Edward','Final payment due',null,null,null,3200.0,'2026-08-14','2025-09-20',null,null),
('10748570600','Jody','Final payment due',null,null,null,14900.0,'2024-07-18','2024-07-24',null,null),
('10748566561','Alison Wong','Final payment due',null,null,null,875.0,'2024-11-08','2024-11-08',null,null),
('10748566774','Nathan Shielee','Final payment due',null,null,null,14625.0,'2024-11-09','2025-01-24',null,null),
('12662828559','David Dybdahl','Final Photos / Videos','Decking','1471 wilamette falls drive West Linn OR','In House',8497.75,'2026-07-29','2026-08-20','https://drive.google.com/drive/folders/1dMeoWlTonsCgbTpYIrcYpaBVlQ5dHdFz',null),
('11726791495','Cheryl Main','Final Photos / Videos','Decking','16689 SW Rubicon lane Tigard Or','In House',17500.0,'2026-04-09','2026-04-15','https://drive.google.com/drive/folders/1IuX-lAB5mtBDKzScRHj4F-mykC9ye3nq',null),
('11751596067','Katherine Stinson','Final Photos / Videos','Roofing','525 NE Amanda Pl Hillsboro OR 97124','In House',14200.45,'2026-04-15','2026-06-01','https://drive.google.com/drive/folders/1Nvspf59Re7OkJkLluKI0Fv-A7o8Jz0L6',null),
('11996382305','Linda Chinn','Final Photos / Videos','Decking','1119 E Foothills drive NEWBERG OR 97132','In House',4650.54,'2026-05-12','2026-06-13','https://drive.google.com/drive/folders/1NUE4-VIuFy3BjXPowVEYGU0BGsZuguTR',null),
('10741795518','Casey Wixson','Final Photos / Videos','Siding',null,'In House',32925.65,'2025-08-29','2026-04-06','https://drive.google.com/drive/folders/1VcP1KUSv7BPaeDHO1OXciF_jmngrXl79',null),
('12316075590','Derek Bliss','Final Photos / Videos','Siding + Painting','11205 sw champoeg ct east Wilsonville OR 97070',null,12885.34,'2026-06-18','2026-07-21','https://drive.google.com/drive/folders/11jM8nI1KvjNQYnUDTkFqc8uL_kreBCxE',null),
('11790177315','Chris Bouschor','Final Photos / Videos','Decking + Fence','13925 sw weir Rd Beaverton OR Beaverton OR','In House',21896.09,'2026-04-18','2026-06-15','https://drive.google.com/drive/folders/1XvgNw6LpfwaDPslp_6lG3-292S0EzEQO',null),
('12531946607','Rhonda Wilson','Final Photos / Videos','Painting + Concrete','1817 e fulton st NEWBERG OR 97132','Sub out',13700.0,'2026-07-14','2026-08-08','https://drive.google.com/drive/folders/1EeDSTEtx89CIhoOn2R_wRslJ400vmP55',null),
('12741976294','Marlene Miller','Final Photos / Videos','Exterior Painting','14618 SW Pinot Court Tigard OR 97224 Tigard OR 97224','In House',13171.09,'2026-08-07','2026-08-21','https://drive.google.com/drive/folders/17hMqpAkezjbMYVf2Pw9JjBEnN6tIEEWQ',null),
('12800084428','Marlene Miller','Final Photos / Videos','Siding','14618 SW Pinot Court Tigard OR 97224 Tigard OR 97224','In House',null,null,'2026-08-20','https://drive.google.com/drive/folders/1hwPLB9-4m5kd2ieVsyi9MLJ_hw_B5mSH',null),
('12605095069','Joney Hanby','Completed','Decking','8042 sw 40th ave PORTLAND OR 97219',null,4000.0,'2026-07-22','2026-07-27','https://drive.google.com/drive/folders/1dLWk_eNFVyT97bBxg4ZSlZCyzvF8-hiv',null),
('12030935760','Amanda Davies','Completed','Windows & Door + Painting','14734 Sw Grandview Ln Portland Oregon 97224',null,14625.56,'2026-05-16','2026-07-15','https://drive.google.com/drive/folders/1dGDW1WZQDQ5qBm6-kPFgnFM2BtmomRuW',null),
('11935816205','Kimberly Joy','Completed','Patio Cover + Painting','9306 Southeast Winsor Drive Milwaukie OR 97222','In House',17620.0,'2026-05-05','2026-07-08','https://drive.google.com/drive/folders/1D5flWXTJFxtOq9qF3TOLRyus7YnH9p99',null),
('11584687284','(Ferguson House Rental) Cherylene A Joyner','Completed','Roofing','21450 SW Ferguson Terrace, Sherwood',null,13496.12,'2026-03-24','2026-04-25','https://drive.google.com/drive/folders/1BLFuk-L2QJgyIvklVyfBoDhRL-_uaow4',null),
('11007260756','Heather Cole','Completed','Siding + Painting','4231 SE Madison St, Portland, OR 97215 PORTLAND OR 97205','Sub out',70605.5,'2025-12-19','2026-05-28','https://drive.google.com/drive/folders/1PD0qOnAgoUqBfKBbyE6SoKKynbkfXthD',null),
('11165847351','Mike Streicher','Completed','Railings','4783 clubhouse ln Newberg OR 97132',null,5800.0,'2026-02-02','2026-04-20','https://drive.google.com/drive/folders/1tW6EqHzGH48qA2qJjQHbOiSByw2c-An_',null),
('11428557211','Paige Caballero','Completed','Roofing',null,null,8065.45,'2026-03-04','2026-03-21','https://drive.google.com/drive/folders/1huQA5YbwdRF3_q3az8ypfP500Ma7fiKm',null),
('10741644870','Stacy Pollard','Completed','Siding',null,null,20450.56,'2025-10-06','2025-12-17','https://drive.google.com/drive/folders/1zHnX_Lb82I-tA0cJXi1pn9XWCWiJzdRJ',null),
('10917900235','Alan Finke','Completed','Roofing','611 Hulet Ave, Newberg Oregon 97132',null,8602.52,'2025-01-15','2026-05-15','https://drive.google.com/drive/folders/1icF6s2IYNJ9Kuenu7UwlpaJG3MuM2YHb?usp=drive_link',null),
('10741651039','Madeline Durand','Completed','Decking',null,null,37370.88,'2025-08-20','2025-11-19','https://drive.google.com/drive/folders/1yOwazqf8XZTzlZH02ZGVmTrin2zPhBCh',null),
('10741784421','Steve & Erin Langella','Completed','Siding + Roofing + Painting + Gutters',null,null,100540.0,'2025-06-16','2025-10-29','https://drive.google.com/drive/folders/1S1OeX3WTTvZGd3_UVcv5r2bj6skSrnBf',null),
('10741793514','Joyce','Completed','Siding + Painting',null,null,32754.67,'2025-10-02','2026-04-09','https://drive.google.com/drive/folders/1IzzNY_2_92ctvm-09bX9PpyswPnJhLcU',null),
('10741801288','Jessica','Completed','Siding',null,null,31125.98,'2025-08-08','2025-10-24','https://drive.google.com/drive/folders/1ZiaYVQHNgCfsZOG9AE7bmQCo2KPV2-Ef',null),
('10741803204','Frank sister','Completed','Painting',null,null,null,null,null,null,null),
('10741795418','Jenny K','Completed','Painting',null,null,375.0,'2025-10-07','2025-10-06',null,null),
('10741803538','Santiago  Segarra','Completed','Window Replacement',null,null,36050.32,'2025-06-25','2025-10-06','https://drive.google.com/drive/folders/1lgwndzEuYXPWsRKw_aLbJedZXMAN8MMj',null),
('10741801745','Roberta Michaels','Completed','Flooring + Painting + Carpentry',null,null,11098.78,'2025-07-24','2025-10-12','https://drive.google.com/drive/folders/16ZSX4Nws4xIJieq26eXugTDnKCT6d4VG',null),
('10741796050','Andrew Aman','Completed','Roofing + Gutters',null,null,33841.44,'2025-04-14','2025-10-01','https://drive.google.com/drive/folders/1YXteXbxChrwJc-JPU95GVZMNUVMJLWkb',null),
('10741803820','Wendy Olson','Completed','Flat Roof',null,null,50530.0,'2024-09-02','2025-08-05','https://drive.google.com/drive/folders/1HUNo7cUEy91aYBMq7NXTeRO__Nvu1aW2',null),
('10741805988','Chuck Simpson','Completed','Fence + Siding + Painting',null,null,8000.0,'2025-07-13','2025-07-23','https://drive.google.com/drive/folders/1LENYYx2hPgNUK-Jo_A1AcHy-QF6wZVIH',null),
('10741803916','Sherri Scott','Completed','Decking + Fence',null,null,6525.65,'2025-06-14','2025-07-09','https://drive.google.com/drive/folders/11Y5B9e22ioOs7sZp3WUMzp2gjyCfTs0v',null),
('10741804349','Chuck Simpson','Completed','Painting',null,null,20319.34,'2025-04-16','2025-06-28','https://drive.google.com/drive/folders/15G3QnjZ-cc77G-AorvsHvBv83M9loPNT',null),
('10748773266','Sebastian','Completed','Painting',null,null,23073.87,'2025-07-10','2025-08-12','https://drive.google.com/drive/folders/1zZqTUs9VZ5I0RXoVF8CjFQ1jaHy8-TCK',null),
('10748782798','Lexi Vandomelen','Completed','Siding + Painting',null,null,14673.75,'2025-06-25','2025-07-26','https://drive.google.com/drive/folders/1U_ZXy-v_18gXgNWnrew9srg6T_2iXb77',null),
('10748770133','Eva Kaltenbach','Completed','Siding + Painting',null,null,5699.33,'2025-07-15','2025-08-05','https://drive.google.com/drive/folders/1UK06OkrXkN-471hzcYs9liM3GjbSZ3np',null),
('10686773825','Candy Collins','Completed','Patio Cover','2005 Valeri Drive Newberg OR 97132',null,12528.64,'2025-12-09','2025-12-10','https://drive.google.com/drive/folders/138zuK0Y0GjeVlcr0uhYb7uS4WNWvKv4w',null),
('10748765970','Linda Pettiford','Completed','Painting',null,null,16555.0,'2024-02-11','2024-07-11','https://drive.google.com/drive/folders/1ba1pPmjgbnYswTIxu0H_Jw1l4kOjw-K_',null),
('10748781000','Judy Durand','Completed','Decking',null,null,27633.55,'2025-06-26','2025-08-02','https://drive.google.com/drive/folders/1BRC4_plRM2-jP-h_tLklD4JeJnT4YUkG',null),
('10748783220','Bill Morgan','Completed','Siding + Painting',null,null,9775.55,'2025-07-10','2025-08-12','https://drive.google.com/drive/folders/19HRYfqY6v3j1PZsxeLpznrams-q99Wg9',null),
('10748784919','George Goodman','Completed','Siding + Painting',null,null,28315.64,'2025-06-17','2025-08-21','https://drive.google.com/drive/folders/1MVgR5DvzxFykXRruA2ZtukmQaxhlzHqn',null),
('10748781288','Tara Hieggelke','Completed','Painting',null,null,4300.88,'2025-07-22','2025-09-01','https://drive.google.com/drive/folders/162OAW-lCRqxsERAROyyloHOAtcghnCgp',null),
('10748783918','Eric Underwood','Completed','Siding + Painting',null,null,3575.69,'2025-08-01','2025-06-20','https://drive.google.com/drive/folders/1i_dv9wvI3aQLVu87cFH7UT8kuP3Y34bB',null),
('10748780321','Kolene Hammer','Completed','Retaining Walls',null,null,30664.88,'2025-06-10','2025-09-03','https://drive.google.com/drive/folders/1usyQI8BjUjev1l83c65R3TBNGiBuhj7r',null),
('10748779515','Phil','Completed','Decking',null,null,23167.31,'2025-05-27','2025-05-31',null,null),
('10748784901','Andrew & Dawn Plunkett','Completed','Decking',null,null,12598.78,'2025-08-22','2025-09-13','https://drive.google.com/drive/folders/1ohF2nkQUAYSWJoAn5FYnMHOYo1udBop6',null),
('10748793256','Eric Bergquam','Completed','Siding + Painting + Decking',null,null,76348.45,'2025-05-14','2025-09-04',null,null),
('10748790483','David Morton','Completed','Roofing',null,null,5775.73,'2025-08-25','2025-09-04','https://drive.google.com/drive/folders/19DrnDdlmD7ekyxK3P0m1X_ZL7nsNgTWn',null),
('10748797004','Kim Scott','Completed','Siding + Painting',null,null,8798.78,'2025-08-05','2026-05-15','https://drive.google.com/drive/folders/1421BqdfSXwm2NV24Yksh60cZiLOxWr92',null),
('10748863094','Dana Sibilla','Completed','Concrete',null,null,21883.0,'2025-06-01','2025-09-17',null,null),
('10748857273','Taha Abdallah','Completed','Flooring + Painting + Carpentry',null,null,1619.0,'2025-10-16','2025-10-17','https://drive.google.com/drive/folders/1e2oKR7z2oEYkKzqIDA51BfHVFnquX1p9',null),
('10748857588','Patti W','Completed','Decking',null,null,21822.77,'2025-07-14','2025-11-01','https://drive.google.com/drive/folders/1sVlNhJZg2vJj2GSTtoX6DoX3e-VnrZDy',null),
('10748856985','Jesus Santana/Teresa','Completed','Siding + Painting',null,null,31865.0,'2025-10-01','2026-05-28','https://drive.google.com/drive/folders/1bCJ3-R3rWjmYir6mI5NDTERQDKayA-bL',null),
('10748857953','Darlene Lufkin','Completed','Siding + Painting',null,null,18098.0,'2025-11-10','2026-02-17','https://drive.google.com/drive/folders/1CBwpx6PN1WyeL5XJlYUwOxOq6cOu0x6q',null),
('10748865520','Stephen Browning','Completed','Roofing',null,null,20260.67,'2025-08-15','2025-12-04','https://drive.google.com/drive/folders/1K0jlqJAbsX0UmOOMcu-RvTCN5nxIeMaw',null),
('10752897110','Jairaj Singh','Completed',null,'10516 Southwest Titan Lane Tigard OR 97224',null,485.0,'2025-12-03','2025-12-03',null,null),
('10741674720','Elizabeth Faoro','Completed',null,null,null,3950.0,'2025-11-10','2025-12-20','https://drive.google.com/drive/folders/1hOZ8d_KKr5we58R4mhqHOsYIpC5DdfFh?usp=drive_link',null),
('11007256639','Dan Brown','Completed',null,'611 Hulet Ave, Newberg Oregon 97132',null,1575.0,'2025-12-12','2025-12-12','https://drive.google.com/drive/folders/1yC3NQYMaAARCr9doV2-DzxW9YY91662P',null),
('11007247840','Sarah (newberg Church Of Nazeri)','Completed',null,'611 Hulet Ave, Newberg Oregon 97132',null,2825.0,'2025-12-30','2026-01-04','https://drive.google.com/drive/folders/1lUnZ2S6tii3cfGbZ7I7ASxr6O3W3Lh0k',null),
('10741679108','Linda patterford','Completed',null,null,null,8520.0,'2024-09-04','2025-08-05','https://drive.google.com/drive/folders/1BtSUhZdNPJ12lWXIlNohjGB--kVnn634?usp=drive_link',null),
('10750119854','Kylee & Cody Ray','Completed','Roofing','303 METLZER AVE Molalla, Or 97038',null,26549.0,'2025-11-26','2026-01-17','https://drive.google.com/drive/folders/1xd4fDPovzQmLyIVZIUC8FLiyn1Vjb2mB',null),
('10774154374','christina','Completed','Siding','20145 sw jaquith rd Newberg OR 97007',null,1470.56,'2026-01-27','2026-01-27',null,null),
('10686794120','Jerry Hallmark','Completed','Window Replacement','2902 east second st unit 11 Newberg 97132',null,11375.45,'2026-01-23','2026-02-09','https://drive.google.com/drive/folders/19ACPNJJzqGouekwxqfTbmdcTEJy3JRvK?usp=drive_link',null),
('11187472731','Michael Smith','Completed',null,'437 West Oxford Newberg OR 97132',null,3175.34,'2026-02-03','2026-02-11','https://drive.google.com/drive/folders/1OLaR3qMPyoycW2MVBMKbJ5s0vrQ59uXS',null),
('10677247376','Noor Azlina Ismai & Fauzi','Completed','Retaining Walls','8328 SW Perennial Pl, Beaverton, OR 97007',null,44869.82,'2026-01-18','2026-02-13','https://drive.google.com/drive/folders/1GkpeBfCD-00ySLj-Qc0Gf8-cgzX-RE78',null),
('11151392266','Daniel Hernandez','Completed','Siding + Painting','17835 SW Galewood Dr. Sherwood Or',null,8440.0,'2026-01-31','2026-03-03','https://drive.google.com/drive/folders/1LjGYhQM3dmsy4IyIa7ggkrNGHVfEnPdC',true),
('10793033266','Sara Dennis','Completed','Roofing','2264 SE Singing Woods Dr, Hillsboro, OR 97123',null,32395.43,'2025-12-16','2026-03-03',null,null),
('11323703175','Preston','Completed','Railings','14901 SW Sophia Ln Tigard Or',null,13875.75,'2026-02-19','2026-03-17','https://drive.google.com/drive/folders/1giEeIA15yrOBqdKhu2ZKoTSfCwPiE-ab',null),
('11447242093','Heather','Completed','Interior Flooring','22986 sw washington st sherwood or',null,1898.25,'2026-03-05','2026-03-18','https://drive.google.com/drive/folders/1S0ibzcRuHE0VVR8jXfx0WSHO95de-aI5',null),
('11532151256','Jacob Bohanam','Completed','Exterior + Interior','19265 NE KENS HILL LANE NEWBERG OR 97132',null,42277.2,'2026-04-07','2026-06-02','https://drive.google.com/drive/folders/1wmTWERNuySJCHi32M5GvSLUB46CeqMr_',null),
('11485500863','Kathy Turner','Completed',null,'1713 juniper st Forest Grove OR',null,8293.11,'2026-03-17','2026-03-19','https://drive.google.com/drive/folders/1UxO6ntw-7blezP3JYdbfZhZ2LIeE1zNs',null),
('10677226318','Dana Nimz','Completed','Concrete + Decking','14899 Southwest Sophia Lane Tigard OR 97224',null,29990.45,'2025-09-10','2026-04-25',null,null),
('11007259967','Carol Rinaldi','Completed','Decking + Fence','1000 S McKern Ct Newberg Oregon 97132',null,10393.88,'2025-08-14','2026-03-05','https://drive.google.com/drive/folders/10bc1kHORY2fsnDVUAjppCNIImc6LpwXP',null),
('11094458186','Kurt Lorenzen','Completed','Painting','912 NE Camelia Drive, Newberg, Oregon, 97132',null,8415.9,'2026-01-23','2026-05-18','https://drive.google.com/drive/folders/1V_Rnh_WxU3Ok3CcbsXttEcfe5iZdAxzV',null),
('12605502109','Kurt Lorenzen','Completed','Painting','912 NE Camelia Drive, Newberg, Oregon, 97132',null,21500.89,'2025-06-03','2025-10-11','https://drive.google.com/drive/folders/1tDSQ5a3PogSmyVhNcM93M1go-T0n8-sr',null),
('10741797379','Gian','Completed',null,null,null,null,null,null,'https://drive.google.com/drive/folders/1fjGhUXCBDve7hZZ80qel55UzXpDGFJfR?usp=drive_link',null),
('12139917979','Mark','Completed','Siding','1159 se 56th ave Hillsboro OR','In House',1590.0,'2026-05-29','2026-06-20','https://drive.google.com/drive/folders/10G_K6rq0wIEt3mkYinok2kRYBMxDsQUJ',null),
('12325222839','Cristian Rheinisch','Completed','Interior','3735 N College St Newberg OR 97132','In House',8875.45,'2026-06-18','2026-06-24','https://drive.google.com/drive/folders/1kMBHi2XiEfN_tGH0aw9UZP1GXEiX4csy',null),
('11921732619','Fara Heath','Completed','Decking','11517 sw 58th ct portland Portland','In House',18100.0,'2026-05-04','2026-06-17','https://drive.google.com/drive/folders/1ygTiL3k0EZHWYj43C5eXuc0nBbW_lqi6',null),
('12244313192','Elda Hernandez','Completed','Siding','6024 se harney st Portland OR 97206 Portland OR 97206','In House',2500.0,'2026-06-10','2026-06-19','https://drive.google.com/drive/folders/1YXsvjJN0oxwllq7yus9da5pj9pQRQ7DW',null),
('10741599974','Joyce (Dallas)','Completed','Painting',null,null,32754.67,'2025-10-02','2026-04-09','https://drive.google.com/drive/folders/1yWT2rkw-FrZhVFtkI3GH07y3nxGol908?usp=drive_link',null),
('11671164370','Jane Vitek Dixon','Completed','Roofing','187 Fairway Newberg OR 97128 Newberg OR 97128','Sub out',21723.74,'2026-04-06','2026-06-02','https://drive.google.com/drive/folders/1YPLC24fvtZHIhVhNkPBq2RCHIlLIqa05',null),
('11823322163','Carrie Hoppe','Completed','Concrete','1816 N Millican Creek St Lafayette Oregon 97127','In House',5897.32,'2026-04-24','2026-05-14','https://drive.google.com/drive/folders/1_iSJeUIouVSoeD-DT77L-tCxi7vrV0ha',null),
('10741598911','Casey Wixson','Completed','Painting',null,null,32925.65,'2025-08-29','2026-04-06','https://drive.google.com/drive/folders/1jAAH7vKwQXf4GDfk9XZf5hmc_tNFUJNu?usp=drive_link',null),
('12130103208','Sam Sabin','Completed','Roofing','2809 se 75th ave Portland OR','In House',16810.56,'2026-05-28','2026-07-01','https://drive.google.com/drive/folders/1gDe4gPTxmQ6p48P-ZiE0VwDhWMWCsg2l',null),
('11903072636','Tom Egleston','Completed','Siding','13601 sw ridge terrace Tigard OR',null,12505.0,'2026-05-01','2026-05-07','https://drive.google.com/drive/folders/1VM4Ui-kz5fMq9E8jwOF6HzAhUTArYufT',null),
('12342846975','Diane Dickey','Completed','Decking + Fence','5959 sw 161st ave Beaverton OR','In House',8874.0,'2026-06-22','2026-06-26','https://drive.google.com/drive/folders/19X-vhAs6XkNj3VBEdGX26-JGOLo4gVHq',null),
('11600169614','Robyn Brant','Completed','Flat Roof','10751 main st Donald OR','Sub out',13825.65,'2026-03-24','2026-07-17','https://drive.google.com/drive/folders/1Eid41wOKJKk2m0SNOFxj16-GpHQfevjk',null),
('11310378218','Brenna White','Completed','Painting','15050 SW Patricia Ave HILLSBORO OR 97123',null,13381.25,'2026-02-19','2026-03-02','https://drive.google.com/drive/folders/1agqA7ImTaOwXB9gJGLn_H7_ki0lbqFYn',null),
('12411249931','Lorraine Katz','Completed',null,'13625 SW garrett ct Tigard OR Tigard OR','In House',4450.54,'2026-06-30','2026-07-03','https://drive.google.com/drive/folders/1Ue8qmNixJH55zfqtd6Db9HjEnTcYr9tj',null),
('12593491483','Angelina Rockelman','Completed','fencing','2238 SE Thrush Avenue Hillsboro OR 97123',null,4165.45,'2026-02-03','2026-02-11','https://drive.google.com/drive/folders/12hhf5mHdvXyMouCQhFRLvoOR-qmxtkvt',true),
('12569498647','Ryan Carle','Completed','Exterior','1101 E Sunset Drive Newberg OR 97132 Newberg OR 97132','In House',3295.54,'2026-07-18',null,'https://drive.google.com/drive/folders/1DXwjKV1lo1NdiTfj7Bv-6p70miV-VMtF',null),
('12398539911','Morgan Steel','Completed','Roofing','5613 se 58th ave Portland OR 97124 Portland OR 97124','In House',10650.76,'2026-06-29','2026-07-14','https://drive.google.com/drive/folders/1EmMM_Dbfl-FDMcGI9m0ofNgcnqw2oKPt',null),
('11837403775','Patti Cook','Completed','Trim& Fascia’s replacement','11980 sw denny rd Beaverton OR 97230 Beaverton OR 97230','In House',6075.31,'2026-04-24','2026-06-05','https://drive.google.com/drive/folders/1zBZdl9-WI1D0clvdCDMN0QPqaKVLaYW0',null),
('12131990514','David Morton','Completed','Roofing','5801 Southeast Harold Street Portland OR 97206','In House',14070.25,'2026-05-28','2026-06-13','https://drive.google.com/drive/folders/1c5hdboPc1Km-6jPod8RnoNmpnNBJs6Ab',null),
('11600133253','Dave Pendleton','Completed','Siding + Windows','2317 gardenia st Forest grove OR 97007','In House',9275.78,'2026-03-27','2026-05-16','https://drive.google.com/drive/folders/1y-bkyDQUgxkXsTTKwRrc5eYOUIikvs9c',null),
('11886895060','Mary Rennie','Completed','Painting','10720 ne sylvan view drive Dundee OR Dundee OR','Sub out',7500.0,'2026-04-29','2026-07-01','https://drive.google.com/drive/folders/1Wfa76HLgt7M-z8bfoCwD8jIoQOsqmCa7',null),
('11683576845','Elda Hernandez','Completed','Painting','6024 se harney st Portland OR 97206 Portland OR 97206','Sub out',5175.43,'2026-05-08','2026-06-03','https://drive.google.com/drive/folders/15da0ENZORfeMZ354KFZPCOuJv2SJGhBO',null),
('11005411548','Pepper Davison','Completed','Siding + Roofing + Front Porch','2901 es 2nd unit 50','In House',21553.99,'2026-01-26','2026-06-19','https://drive.google.com/drive/folders/16fGPPEZNJAXG6lkDM9FycbCNWilWR8kp',true),
('12093268293','Jane','Completed',null,null,null,null,null,null,'https://drive.google.com/drive/folders/1RLmqSbanFW4pku498Pgofkh7fTaI4JvX',null),
('11484568925','Sarah Lyn Lawton','Completed','Painting','1985 Northwest 156th Avenue Beaverton OR 97006','In House',20415.66,'2026-03-10','2026-08-03','https://drive.google.com/drive/folders/1TrBmBGunef5OTEsA-EawRdnH3WBPA6ga',null),
('11695725918','Ronald Lai','Completed','Siding + Windows & Doors + Patio Cover + Door Installation','8405 SW 158th Pl, Beaverton OR 97007','In House',45250.99,'2026-04-09','2026-06-17','https://drive.google.com/drive/folders/1Rd_REZv9zRDrE3ho9MWyp9A9GRuPuF-J',null),
('12800089499','Sam Sabin','Completed',null,null,null,null,null,null,'https://drive.google.com/drive/folders/1Z5iIOOZeOzQl5AtH2L2kUZZzwGfbEQgR',null),
('11394009079','John Richardson','Completed','Roofing','2611 roberts ln Newberg OR Newberg OR',null,35205.45,'2026-03-04','2026-05-14','https://drive.google.com/drive/folders/1hQO23ygiK8ior8L1JdJReDoqKraN1iQC',null),
('11116762059','Darlene (Paint)','Project on hold','Painting',null,'Sub out',4483.0,'2025-11-10',null,'https://drive.google.com/drive/folders/1FE5GRlXm71rKj1wq-d5rKXHeLa6eaNH9',null);

-- 1. Link existing unlinked jobs to their Monday item by name — but only
--    where the name is unambiguous on both sides right now.
with job_name_counts as (
  select lower(trim(client_name)) as key, count(*) as n
  from jobs where monday_item_id is null
  group by lower(trim(client_name))
),
monday_name_counts as (
  select lower(trim(client_name)) as key, count(*) as n
  from monday_import
  group by lower(trim(client_name))
),
unambiguous as (
  select j.key from job_name_counts j
  join monday_name_counts m on m.key = j.key
  where j.n = 1 and m.n = 1
)
update jobs j set monday_item_id = m.monday_item_id
from monday_import m
where j.monday_item_id is null
  and lower(trim(j.client_name)) = lower(trim(m.client_name))
  and lower(trim(j.client_name)) in (select key from unambiguous);

-- 2. Pull Monday's values onto the matched jobs. Monday wins on stage,
--    location, crew, folder and permit. Contract price only fills when
--    the app doesn't already have one — costs entered here shouldn't be
--    invalidated by a stale board figure.
update jobs j set
  stage            = m.stage::job_stage,
  address_city     = coalesce(nullif(m.address_city,''), j.address_city),
  crew             = coalesce(m.crew::crew_type, j.crew),
  job_type         = coalesce(nullif(m.job_type,''), j.job_type),
  sold_date        = coalesce(m.sold_date, j.sold_date),
  completed_date   = coalesce(m.completed_date, j.completed_date),
  drive_folder_url = coalesce(nullif(m.drive_folder_url,''), j.drive_folder_url),
  permit_required  = coalesce(m.permit_required, j.permit_required),
  contract_price   = coalesce(j.contract_price, m.contract_price)
from monday_import m
where j.monday_item_id = m.monday_item_id;

-- 3. Add Monday items that have no existing job at all under that name —
--    a genuinely new client/project, not a possible match for something
--    that already exists. Anything whose name DID match an existing job
--    but wasn't linked in step 1 (ambiguous — multiple Monday rows or
--    multiple jobs share the name) is intentionally skipped here too, so
--    it doesn't turn into a duplicate. Review those with:
--      select m.* from monday_import m
--      where not exists (select 1 from jobs j where j.monday_item_id = m.monday_item_id)
--        and exists (select 1 from jobs j2 where lower(trim(j2.client_name)) = lower(trim(m.client_name)));
--    ...then link each by hand once you've confirmed which existing job
--    (if any) it actually belongs to, e.g.:
--      update jobs set monday_item_id = '<id>' where job_id = 'SLX-0NN';
with unmatched as (
  select m.*, row_number() over (order by m.sold_date nulls last, m.client_name) as rn
  from monday_import m
  where not exists (select 1 from jobs j where j.monday_item_id = m.monday_item_id)
    and not exists (select 1 from jobs j2 where lower(trim(j2.client_name)) = lower(trim(m.client_name)))
),
base as (
  select coalesce(max(substring(job_id from 5)::int), 0) as n from jobs
  where job_id ~ '^SLX-[0-9]+$'
)
insert into jobs (job_id, client_name, stage, job_type, address_city, crew,
                  contract_price, sold_date, completed_date, drive_folder_url,
                  permit_required, monday_item_id, overhead_pct)
select
  'SLX-' || lpad((base.n + u.rn)::text, 3, '0'),
  u.client_name, u.stage::job_stage, nullif(u.job_type,''), nullif(u.address_city,''),
  u.crew::crew_type, u.contract_price, u.sold_date, u.completed_date,
  nullif(u.drive_folder_url,''), u.permit_required, u.monday_item_id, 12
from unmatched u, base;
