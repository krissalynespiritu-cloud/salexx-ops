-- ============================================================
--  Salexx Ops Hub — seed data
--  93 real jobs recovered from Job Costing, Gross Profit Tracker,
--  and the Team Time Tracker. Client names deduplicated across all
--  three (Casey Winxson/Wixson, Robyn Brant/Bryant, and 9 others
--  were the same job typed different ways).
--
--  Nothing here is invented. Where a field was never recorded in
--  the spreadsheets, it is null — not a guess.
--
--  8 rows were removed from the original 93 (SLX-028, 030, 032, 035,
--  039, 086, 089, 091): empty placeholders scraped from the Time
--  Tracker's Project column, with no price, no trade, no dates, no
--  hours, no costs. The cleanup pass that used to delete these after
--  the fact (formerly cleanup_unlinked) confirmed none of them ever
--  had anything attached — leaving them out here means a rebuild
--  doesn't need to re-delete them.
--
--  Run AFTER 01_schema.sql.
-- ============================================================

insert into jobs
  (job_id, client_name, address_city, job_type, stage, sold_date, completed_date, contract_price)
values
('SLX-001','Linda Pattorford','13635 SW Garrett Ct Tigard Or','Decking','Completed','2025-02-02','2025-02-02',248.54),
('SLX-002','Diane Engebretson','564 NE Amanda Pl Hillsboro Or','Siding','Completed','2025-04-24','2025-04-24',null),
('SLX-003','Sebastian','10815 S Southridge Dr','Painting','Completed','2025-07-11','2025-07-11',23073.87),
('SLX-004','Judy Durand','3614 N DAHLIA ST Newberg or 97132','Decking','Completed','2025-07-28','2025-07-28',25833.55),
('SLX-005','Kolene Hammer','6 Oriole Lane, Lake Oswego','Concrete / Hardscape','Completed','2025-08-18','2025-08-18',30664.88),
('SLX-006','Kim Scott','16365 SW Copper Creek Drive Tigard Or 97224','Painting','Completed','2025-08-25','2025-08-25',8798.78),
('SLX-007','Eric Underwood','4050 Serango Court West Linn, OR, 97068','Painting','Completed','2025-08-28','2025-08-28',3575.69),
('SLX-008','Santiago Segarra','8152 Southwest 181st Avenue Beaverton, OR, 97007','Windows/Doors','Completed','2025-09-01','2025-09-01',35250.32),
('SLX-009','Andrew Plunkett','20665 SW Jaquith Rd, Newberg Or','Decking','Completed','2025-09-11','2025-09-11',12598.78),
('SLX-010','Steve Langella','8239 SW Piute Ct, Tualatin, OR 97062','Multi-Trade','Completed','2025-09-15','2025-09-15',92000.0),
('SLX-011','Roberta Michael''s','12945 SW Glenn Dr Beverton Or, 97008','Multi-Trade','Completed','2025-09-26','2025-09-26',3398.78),
('SLX-012','Jessica Bronson','11770 SW swendon Tigard Or','Multi-Trade','Completed','2025-10-06','2025-10-06',29600.98),
('SLX-013','Jenny Kalmbach','18480 Ray Ridge Dr Lake Oswego Or','Windows/Doors','Completed','2025-10-07','2025-10-07',375.0),
('SLX-014','Casey Winxson','1950 Furlong Dr West Linn Or','Multi-Trade','Completed','2025-10-13','2025-10-13',30250.65),
('SLX-015','Patti W','4236 Harvey Way Lake Oswego Or OR 97035','Decking','Completed','2025-10-27','2025-10-27',21822.77),
('SLX-016','Jesus santana/Teresa','410 W Sheridan St, Newberg, Oregon, 97132','Multi-Trade','Touch-ups','2025-10-29',null,33060.0),
('SLX-017','Darlene Lufkin','1005 ferry st #39 Dayton, Or 97128','Multi-Trade','Designs Sold','2025-11-10',null,27578.0),
('SLX-018','Madeline','901 W Sheridan St. Newberg Or 97132','Decking','Completed','2025-11-17','2025-11-17',37370.88),
('SLX-019','Elizabeth Faoro','6433 N Yale St, Portland, OR 97203','Windows/Doors','Completed','2025-11-21','2025-11-21',3950.0),
('SLX-020','Ray & Kylee','303 METLZER AVE Molalla Or','Roofing','Completed','2025-11-25','2025-11-25',4707.06),
('SLX-021','Stephen Browning','13655 SW Garrett Ct Tigard Or','Roofing','Completed','2025-12-01','2025-12-01',20260.67),
('SLX-022','Stacey Pollard','21544 sw longacker st Beaverton Or','Siding','Completed','2025-12-10','2025-12-10',20450.56),
('SLX-023','Alan Finkle','809 west sheridan st NEWBERG OR 97140','Roofing','Completed','2025-12-20','2025-12-20',2661.38),
('SLX-024','Noor','8328 SW Perennial Pl, Beaverton, OR 97007','Concrete / Hardscape','Project on hold','2026-01-21',null,44869.82),
('SLX-025','Pepper','2901 es 2nd unit 50 Newberg Or','Multi-Trade','Completed','2026-01-23','2026-01-23',20653.41),
('SLX-026','Carol Rinaldi','1000 S McKern Ct Newberg Or','Multi-Trade','Completed','2026-02-02','2026-02-02',11143.88),
('SLX-027','Daniel Hernandez','17835 sw Galewood Dr. Sherwood Or','Multi-Trade','Completed','2026-02-05','2026-02-05',8440.0),
('SLX-029','Angelina Rockelman','2238 SE Thrush Avenue Hillsboro OR 97123','patio cover','Designs Sold','2026-02-09',null,5365.45),
('SLX-031','Dana Nimz','14899 Southwest Sophia Lane Tigard','Multi-Trade','Completed','2026-02-11','2026-04-20',26945.26),
('SLX-033','Brenna White','15050 SW Patricia Ave Hillsboro, Oregon, 97123','Multi-Trade','Completed','2026-02-19','2026-02-24',186.55),
('SLX-034','Preston','14901 SW Sophia Ln Tigard Or','Multi-Trade','Completed','2026-02-24','2026-03-03',4338.82),
('SLX-036','Sara Dennis','2264 SE Singing Woods Dr, Hillsboro, OR 97123','Roofing','Completed','2026-02-26','2026-02-26',32395.43),
('SLX-037','Brad','12251 NE Dudley Rd','Multi-Trade','Completed','2026-03-10','2026-04-10',46450.0),
('SLX-038','Jacob Bohanam','19265 NE KENS HILL LN','Exterior stairs','Completed','2026-03-16','2026-03-16',11393.7),
('SLX-040','Kena James','2415 dillow drive West Linn OR 97068','Multi-Trade','Completed','2026-03-20','2026-04-20',6320.75),
('SLX-041','Adriana Britton','NEWBERG OR 97132','Multi-Trade','Completed','2026-03-27','2026-04-10',78341.1),
('SLX-042','Cherylene','16689 SW Rubicon lane Tigard Or','Multi-Trade','Completed','2026-04-14','2026-04-14',17500.0),
('SLX-043','(Ferguson House Rental) Cherylene A Joyner','21450 SW Ferguson Terrace, Sherwood','Painting','Completed','2026-04-15','2026-04-15',13496.12),
('SLX-044','Dundee house;',null,null,'Designs Sold','2026-04-17',null,null),
('SLX-045','Heather','4231 SE Madison St, Portland, OR 97215 PORTLAND OR 97205','Multi-Trade','Completed','2026-04-21','2026-05-19',68505.0),
('SLX-046','Tom Eagleston','13601 Sw Ridge Terreace Tigard Or','Siding','Completed','2026-05-05','2026-05-08',12505.0),
('SLX-047','Kurt Lorenzen','912 NE Camelia Drive, Newberg, Oregon, 97132','Painting','Completed','2026-05-08','2026-05-08',8415.9),
('SLX-048','John Richardson','2611 roberts ln Newberg OR Newberg OR','Roofing','Completed','2026-05-11','2026-05-14',34730.45),
('SLX-049','Carrie Hoppe','1816 N Millican Creek St Lafayette Oregon 97127','Concrete / Hardscape','Completed','2026-05-14','2026-05-14',5897.32),
('SLX-050','Dave Pendleton','2317 gardenia st Forest grove OR 97007','Multi-Trade','Completed','2026-05-15','2026-05-15',8800.78),
('SLX-051','Ronald Lai','8405 SW 158th Pl, Beaverton OR 97007','Multi-Trade','Completed','2026-05-17','2026-05-22',44897.16),
('SLX-052','Elda Hernandez','6024 se harney st Portland OR 97206 Portland OR 97206','Painting','Completed','2026-05-25','2026-06-18',5175.43),
('SLX-053','Jane Vitek Dixon','187 Fairway Newberg OR 97128 Newberg OR 97128','Roofing','Completed','2026-05-25','2026-05-25',21723.74),
('SLX-054','Katherine Stinson','525 NE Amanda Pl Hillsboro OR 97124','Roofing','Completed','2026-05-25','2026-05-29',14200.45),
('SLX-055','Chelsea-Andrea Crowell','1122 Parkside Ave Forest Grove OR 97116','Exterior Painting','Completed','2026-05-27','2026-05-27',3900.54),
('SLX-056','Patti Cook','11980 sw denny rd Beaverton OR 97230 Beaverton OR 97230','Siding','Completed','2026-05-28','2026-06-04',6075.31),
('SLX-057','Chris Boucher','13925 sw weir Rd Beaverton OR Beaverton OR','Multi-Trade','Completed','2026-06-01','2026-06-12',20151.09),
('SLX-058','Robyn Brant','10751 main st Donald OR','Roofing','Completed','2026-06-02','2026-07-10',10450.65),
('SLX-059','David Morton','5801 southeast harold street portland or 97206','Painting','Completed','2026-06-08','2026-06-10',13375.25),
('SLX-060','Pepper Davison','2901 es 2nd unit 50','Roofing','Completed','2026-06-08','2026-06-26',20858.99),
('SLX-061','Linda Chinn','1119 E Foothills drive NEWBERG OR 97132','Painting','Completed','2026-06-11','2026-06-12',4075.54),
('SLX-062','Fara Heath','11517 sw 58th ct portland Portland','Decking','Completed','2026-06-15','2026-06-17',17275.23),
('SLX-063','Mark','1159 se 56th ave Hillsboro OR','Painting','Completed','2026-06-15','2026-06-19',1265.0),
('SLX-064','Sam','2809 se 75th ave Portland OR ANAHEIM CA 92802','Painting','Completed','2026-06-15','2026-06-29',13500.56),
('SLX-065','Cristian Rheinisch','3735 N College St Newberg OR 97132','Multi-Trade','Completed','2026-06-22','2026-06-25',8875.45),
('SLX-066','Mary Rennie','10720 ne sylvan view drive Dundee OR Dundee OR','Painting','Completed','2026-06-22','2026-06-22',7500.65),
('SLX-067','Diane Dickey','5959 sw 161st ave Beaverton OR','Multi-Trade','Completed','2026-06-25','2026-06-26',8874.0),
('SLX-068','Kimberly Joy','9306 Southeast Winsor Drive Milwaukie OR 97222','Patio Cover, Painting','Completed','2026-06-29','2026-07-08',15000.0),
('SLX-069','Sam Sabin',null,null,'Designs Sold','2026-06-29',null,null),
('SLX-070','Lorraine Katz',null,null,'Designs Sold','2026-07-02',null,null),
('SLX-071','Amanda Davies','14734 Sw Grandview Ln Portland Oregon 97224','Multi-Trade','Completed','2026-07-09','2026-07-20',1325.56),
('SLX-072','Morgan Steel','5613 se 58th ave Portland OR 97124 Portland OR 97124','Roofing','Completed','2026-07-13','2026-07-14',10450.46),
('SLX-073','Derek Bliss','11205 sw champoeg ct east Wilsonville OR 97070','Painting, Siding','Completed','2026-07-16','2026-07-21',12300.34),
('SLX-074','John Tran','11220 sw chickadee terrce Beaverton OR 97007 Beaverton OR 97007','Decking','Completed','2026-07-20','2026-08-14',40000.0),
('SLX-075','Ryan Carle','1101 E Sunset Drive Newberg OR 97132 Newberg OR 97132','Exterior','Completed','2026-07-22','2026-07-22',3295.54),
('SLX-076','Joney Hanby',null,null,'Completed','2026-07-23','2026-07-23',4000.0),
('SLX-077','Sarah Lyn Lawton','1985 Northwest 156th Avenue Beaverton OR 97006','Multi-Trade','In progress','2026-07-27',null,20415.66),
('SLX-078','Jenni B','11375 sw 95th ave Tigard OR','Siding & Paint','Designs Sold','2026-08-03',null,10228.76),
('SLX-079','Rhonda W','1817 e fulton st NEWBERG OR 97132','Painting, Concrete','Designs Sold','2026-08-05',null,13700.0),
('SLX-080','David Dybdahl','1471 wilamette falls drive West Linn OR','Decking','Designs Sold','2026-08-19',null,8497.75),
('SLX-081','Marlene Miller','14618 SW Pinot Court Tigard OR 97224 Tigard OR 97224','Siding','Designs Sold','2026-08-21',null,13171.09),
('SLX-082','Puck Ja','5373 NW Lianna Way, Portland, OR 97229','Exterior Painting','Designs Sold','2026-08-28',null,14275.0),
('SLX-083','Tim Packard','269 15th st Lafayette OR','Roofing','Designs Sold','2026-09-03',null,19521.04),
('SLX-084','Doug Baldwin','1395 sw 31st st Gresham OR','Decking','Designs Sold','2026-09-18',null,32450.25),
('SLX-085','Joyce','1811 sw boxwood lane Dallas Or','Siding','Completed','2026-10-20','2026-10-20',32754.67),
('SLX-087','Christina',null,null,'Designs Sold',null,null,null),
('SLX-088','Dan Brown',null,null,'Designs Sold',null,null,null),
('SLX-090','Lexi Vandomelen','9079 Southwest Waverly Drive Tigard OR 97224','Interior, Staircase','Designs Sold',null,null,3777.5),
('SLX-093','Jennie Clark','20539 SW Lavender Ave, Sherwood, OR 97140','Concrete / Hardscape','Designs Sold',null,null,10200.75)
on conflict (job_id) do nothing;

-- The only six jobs with real cost data in the old workbooks.
insert into job_costs (job_id, category, amount) values
  ('SLX-052','Materials',10714),('SLX-052','Subcontractors',3500),
  ('SLX-047','Materials',10860),('SLX-047','Subcontractors',6600),
  ('SLX-044','Materials',949),
  ('SLX-005','Materials',7942),
  ('SLX-004','Materials',10631),
  ('SLX-050','Materials',555),('SLX-050','Subcontractors',730)
on conflict do nothing;
