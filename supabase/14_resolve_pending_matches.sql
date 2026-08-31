-- ============================================================
--  Salexx Ops Hub — resolve pending repeat-client matches
--
--  From the review after 12_monday_sync.sql: 8 clients had Monday rows
--  that couldn't be auto-matched (ambiguous — multiple Monday rows,
--  one existing job). Confirmed by hand: every one of these is a
--  genuine separate project (same client, different trade/dates,
--  same address) — not a duplicate. 7 link to an existing job Monday
--  also has a record for (price match); 11 are new projects with no
--  existing job at all.
--
--  Explicitly NOT resolved here (left exactly as-is):
--    - Sam Sabin, Monday item 12800089499 — blank row, no type/price/
--      dates. Skipped: not linked, not inserted.
--    - Casey Wixson, Monday items 10741795518 and 10741598911 — both
--      identical price and dates, almost certainly one job entered
--      twice on Monday. On hold until confirmed which (if either) is
--      real.
--
--  Run AFTER 12_monday_sync.sql. Run 13_clients.sql again AFTER this
--  file, so the 11 newly-inserted jobs get linked to their client
--  record (13 is already safe to re-run).
--  Safe to re-run: links only apply where the target job's
--  monday_item_id is still null; inserts only happen where that
--  monday_item_id isn't already in jobs.
-- ============================================================

create temporary table pending_resolve (
  monday_item_id   text primary key,
  target_job_id    text,              -- null = insert as new
  client_name      text,
  stage            text,
  job_type         text,
  address_city     text,
  crew             text,
  contract_price   numeric(12,2),
  sold_date        date,
  completed_date   date,
  drive_folder_url text,
  permit_required  boolean
) on commit drop;

insert into pending_resolve values
('12799650167','SLX-082','Puck Ja','In Progress','Exterior Painting','5373 NW Lianna Way, Portland, OR 97229','Sub out',14275.0,'2026-08-13',null,'https://drive.google.com/drive/folders/1mJyF5UgR32lvPLy8dYKYG90Tmx8qLcPG',null),
('12799936902',null,'Puck Ja','In Progress','Siding','5373 NW Lianna Way, Portland, OR 97229','In House',null,null,null,'https://drive.google.com/drive/folders/11hj9XmLQczkpjXS0tCXo43DaEbUk-YLI',null),
('12741976294','SLX-081','Marlene Miller','Final Photos / Videos','Exterior Painting','14618 SW Pinot Court Tigard OR 97224 Tigard OR 97224','In House',13171.09,'2026-08-07','2026-08-21','https://drive.google.com/drive/folders/17hMqpAkezjbMYVf2Pw9JjBEnN6tIEEWQ',null),
('12800084428',null,'Marlene Miller','Final Photos / Videos','Siding','14618 SW Pinot Court Tigard OR 97224 Tigard OR 97224','In House',null,null,'2026-08-20','https://drive.google.com/drive/folders/1hwPLB9-4m5kd2ieVsyi9MLJ_hw_B5mSH',null),
('11683576845','SLX-052','Elda Hernandez','Completed','Painting','6024 se harney st Portland OR 97206 Portland OR 97206','Sub out',5175.43,'2026-05-08','2026-06-03','https://drive.google.com/drive/folders/15da0ENZORfeMZ354KFZPCOuJv2SJGhBO',null),
('12244313192',null,'Elda Hernandez','Completed','Siding','6024 se harney st Portland OR 97206 Portland OR 97206','In House',2500.0,'2026-06-10','2026-06-19','https://drive.google.com/drive/folders/1YXsvjJN0oxwllq7yus9da5pj9pQRQ7DW',null),
('11094458186','SLX-047','Kurt Lorenzen','Completed','Painting','912 NE Camelia Drive, Newberg, Oregon, 97132',null,8415.9,'2026-01-23','2026-05-18','https://drive.google.com/drive/folders/1V_Rnh_WxU3Ok3CcbsXttEcfe5iZdAxzV',null),
('12605502109',null,'Kurt Lorenzen','Completed','Painting','912 NE Camelia Drive, Newberg, Oregon, 97132',null,21500.89,'2025-06-03','2025-10-11','https://drive.google.com/drive/folders/1tDSQ5a3PogSmyVhNcM93M1go-T0n8-sr',null),
('12401129682','SLX-090','Lexi Vandomelen','In Progress','Interior + Staircase','9079 Southwest Waverly Drive Tigard OR 97224','In House',3777.5,'2026-03-20',null,'https://drive.google.com/drive/folders/1QM4cVxLr-KS9NYTtS6mjncI4SMLH6Czr',null),
('10748782798',null,'Lexi Vandomelen','Completed','Siding + Painting',null,null,14673.75,'2025-06-25','2025-07-26','https://drive.google.com/drive/folders/1U_ZXy-v_18gXgNWnrew9srg6T_2iXb77',null),
('11484568925','SLX-077','Sarah Lyn Lawton','Completed','Painting','1985 Northwest 156th Avenue Beaverton OR 97006','In House',20415.66,'2026-03-10','2026-08-03','https://drive.google.com/drive/folders/1TrBmBGunef5OTEsA-EawRdnH3WBPA6ga',null),
('12825005262',null,'Sarah Lyn Lawton','Designs Sold',null,null,null,null,null,null,'https://drive.google.com/drive/folders/1BSYUEboR6666l3fQml9APGEfe2nKbMWy',null),
('12603385878',null,'Sarah Lyn Lawton','In Progress','Siding + Windows','1985 Northwest 156th Avenue Beaverton OR 97006','In House',24800.0,'2026-05-19',null,'https://drive.google.com/drive/folders/1sCV2R6RTQd9Uc2MC_TQWsNKYu7oV2w-n',null),
('11187519510',null,'Angelina Rockelman','Permitting / Drawings','Patio Cover','2238 SE Thrush Avenue Hillsboro OR 97123','In House',14497.32,'2026-05-11',null,'https://drive.google.com/drive/folders/1p3d-nh21fvpFZSo3Xw_txMDFmMfCc4eT',true),
('12593491483',null,'Angelina Rockelman','Completed','fencing','2238 SE Thrush Avenue Hillsboro OR 97123',null,4165.45,'2026-02-03','2026-02-11','https://drive.google.com/drive/folders/12hhf5mHdvXyMouCQhFRLvoOR-qmxtkvt',true),
('10748790483',null,'David Morton','Completed','Roofing',null,null,5775.73,'2025-08-25','2025-09-04','https://drive.google.com/drive/folders/19DrnDdlmD7ekyxK3P0m1X_ZL7nsNgTWn',null),
('12131990514',null,'David Morton','Completed','Roofing','5801 Southeast Harold Street Portland OR 97206','In House',14070.25,'2026-05-28','2026-06-13','https://drive.google.com/drive/folders/1c5hdboPc1Km-6jPod8RnoNmpnNBJs6Ab',null),
('12130103208','SLX-069','Sam Sabin','Completed','Roofing','2809 se 75th ave Portland OR','In House',16810.56,'2026-05-28','2026-07-01','https://drive.google.com/drive/folders/1gDe4gPTxmQ6p48P-ZiE0VwDhWMWCsg2l',null);

-- 1. Link: set monday_item_id + apply Monday's fields, same rule as
--    12_monday_sync.sql step 2 (Monday wins on stage/location/crew/
--    folder/permit; contract price only fills when the job doesn't
--    already have one).
update jobs j set
  monday_item_id   = p.monday_item_id,
  stage            = p.stage::job_stage,
  address_city     = coalesce(nullif(p.address_city,''), j.address_city),
  crew             = coalesce(p.crew::crew_type, j.crew),
  job_type         = coalesce(nullif(p.job_type,''), j.job_type),
  sold_date        = coalesce(p.sold_date, j.sold_date),
  completed_date   = coalesce(p.completed_date, j.completed_date),
  drive_folder_url = coalesce(nullif(p.drive_folder_url,''), j.drive_folder_url),
  permit_required  = coalesce(p.permit_required, j.permit_required),
  contract_price   = coalesce(j.contract_price, p.contract_price)
from pending_resolve p
where p.target_job_id is not null
  and j.job_id = p.target_job_id
  and j.monday_item_id is null;

-- 2. Insert the rest as new jobs with fresh SLX ids.
with unmatched as (
  select p.*, row_number() over (order by p.sold_date nulls last, p.client_name) as rn
  from pending_resolve p
  where p.target_job_id is null
    and not exists (select 1 from jobs j where j.monday_item_id = p.monday_item_id)
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
