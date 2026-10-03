-- ============================================================
-- 102_monday_sync_2026_10_03.sql
--
-- Sync from the Monday "Project Delivery" export of 2026-10-03
-- (140 items; the previous sync was 13/14_*.sql about a month ago).
-- Approved by Kris 2026-10-03 after the read-only audit in that day's
-- session. Matching is ONLY by monday_item_id (plus the job_id it is
-- expected to be on, and the value it is expected to have now), so a
-- re-run, or a row someone already changed by hand, is a no-op.
--
-- What it does:
--   A. 5 stage moves Monday is ahead on
--   B. fills empty fields (never overwrites a value the app has)
--   C. 2 small approved corrections (Ryan Carle date, Marlene Miller type)
--   D. protected records, explicitly approved: Phil Rose SLX-148
--      (address + completed date), Kathy Whitney SLX-152 (type + crew)
--   E. links 5 app jobs to their Monday item (approved; see evidence)
--   F. creates 3 jobs Monday has and the app doesn't
--   G. fills Project Timeline start/end on jobs that have none
--   H. imports the 24 Monday job updates (notes) posted since Aug 28
--
-- Deliberately NOT done:
--   * contract prices -- most differing ones are Reviewed/Approved in
--     Job Costing; 5 only "differ" because the app keeps change orders
--     separate. Left for human review (Heather SLX-045, Jacob SLX-038,
--     Darlene SLX-017, Jesus Santana SLX-016 look wrong on one side).
--   * crew "In house/sub out" (Jenni Bee, Derek Bliss, Amanda Davies):
--     not a valid crew_type ('In House' | 'Sub out'), left blank.
--   * the 16 jobs force-deleted 2026-09-27 with reason "2025" and the
--     20 older 2024-25 Completed Monday items never in the app.
--   * client links by name alone (CLAUDE.md Phase 2A): Diana Pendell and
--     Carol Rinaldi's new jobs are created unlinked + needs_review.
--
-- Side effect to know about: the jobs table has a trigger that posts
-- every NEW job to a Zapier catch hook (notify_job_created, see
-- 101_snapshot_live_job_automation.sql), so section F fires it 3 times.
--
-- Tested 2026-10-03 against a scratch copy of the affected rows: all
-- changes land as listed, a second run changes nothing, existing
-- timeline dates are not overwritten, new ids skip force-deleted ones.
-- ============================================================

begin;

-- A. stage moves (guarded on the current stage)
update jobs set stage = 'In Progress', updated_at = now()
  where job_id = 'SLX-024' and monday_item_id = '11533625881' and stage = 'Ready For Scheduling';
update jobs set stage = 'Final Walk-through', updated_at = now()
  where job_id = 'SLX-159' and monday_item_id = '12603385878' and stage = 'In Progress';
update jobs set stage = 'Final Photos / Videos', completed_date = coalesce(completed_date, '2026-08-23'), updated_at = now()
  where job_id = 'SLX-162' and monday_item_id = '12799936902' and stage = 'In Progress';
update jobs set stage = 'Completed', completed_date = coalesce(completed_date, '2026-08-23'), updated_at = now()
  where job_id = 'SLX-082' and monday_item_id = '12799650167' and stage = 'In Progress';
update jobs set stage = 'Completed', updated_at = now()
  where job_id = 'SLX-161' and monday_item_id = '12800084428' and stage = 'Final Photos / Videos';

-- B. fill empty fields only
update jobs set completed_date = '2026-09-23', updated_at = now() where job_id = 'SLX-143' and monday_item_id = '12473365529' and completed_date is null;
update jobs set job_type = 'Siding', updated_at = now() where job_id = 'SLX-070' and monday_item_id = '12411249931' and job_type is null;

-- C. approved corrections
update jobs set completed_date = '2026-07-28', updated_at = now() where job_id = 'SLX-075' and monday_item_id = '12569498647' and completed_date = '2026-07-22';
update jobs set job_type = 'Exterior Painting', updated_at = now() where job_id = 'SLX-081' and monday_item_id = '12741976294' and job_type = 'Painting';

-- D. protected records -- explicitly approved 2026-10-03 (fill-only)
update jobs set address_city = coalesce(address_city, '906 NW Silverado Dr Beaverton Oregon 97006'), completed_date = coalesce(completed_date, '2026-09-11'), updated_at = now()
  where job_id = 'SLX-148' and monday_item_id = '12905955808';
update jobs set job_type = coalesce(job_type, 'Siding, Concrete repair'), crew = coalesce(crew, 'In House'), updated_at = now()
  where job_id = 'SLX-152' and monday_item_id = '12928063573';

-- E. link app jobs to their Monday item (only if not linked yet, and the
--    Monday id isn't already on another job). Evidence:
--    SLX-166 Alejandro Villa  -- name + stage + $5,900.75 + sold 2026-09-11 match
--    SLX-167 Joe Ferris       -- name + stage + $3,875.25 match
--    SLX-171 Walter Chapman   -- name + stage (Ready For Scheduling)
--    SLX-170 Stephanie Madriz -- name + stage (Ready For Scheduling)
--    SLX-169 Kristina Swanbe  -- name + stage (Designs Sold)
update jobs set monday_item_id = '13031036397', updated_at = now()
  where job_id = 'SLX-166' and monday_item_id is null
    and not exists (select 1 from jobs x where x.monday_item_id = '13031036397');
update jobs set monday_item_id = '13087097265', updated_at = now()
  where job_id = 'SLX-167' and monday_item_id is null
    and not exists (select 1 from jobs x where x.monday_item_id = '13087097265');
update jobs set monday_item_id = '13142238734', updated_at = now()
  where job_id = 'SLX-171' and monday_item_id is null
    and not exists (select 1 from jobs x where x.monday_item_id = '13142238734');
update jobs set monday_item_id = '13177184637', updated_at = now()
  where job_id = 'SLX-170' and monday_item_id is null
    and not exists (select 1 from jobs x where x.monday_item_id = '13177184637');
update jobs set monday_item_id = '13189313266', updated_at = now()
  where job_id = 'SLX-169' and monday_item_id is null
    and not exists (select 1 from jobs x where x.monday_item_id = '13189313266');

-- F. new jobs. job_id = next SLX number, skipping any id that was ever
--    force-deleted (job ids are never reused). Skipped if the Monday id
--    is already on a job, so a re-run creates nothing.
create temporary table _new_jobs (monday_item_id text, client_name text, stage text, job_type text,
  address_city text, crew text, contract_price numeric, sold_date date, drive_folder_url text,
  permit_required boolean, client_id uuid, needs_review boolean, notes text) on commit drop;
insert into _new_jobs values
  ('12963346102', 'Natalya Feoktistov', 'In Progress', 'Patio Cover', '1770 south boone ferry rd Woodburn OR', 'In House', 26234.35, '2026-09-02', 'https://drive.google.com/drive/folders/1ymlU2gu65Qw4NxoRPdGevYIlgZew4buq', null, 'adbb82f5-ad6a-4c4a-a5c6-762a8ed33ce2'::uuid, false, 'Created from Monday sync 2026-10-03. Client linked by matching phone.'),
  ('13166403726', 'Diana Pendell', 'Project Scheduled', null, '28215 sw heater rd Sherwood OR 97224', null, null, null, 'https://drive.google.com/drive/folders/1tjCkwus9ntSp_3uf4cV-KFTvbp5frRif', null, null, true, 'Created from Monday sync 2026-10-03. Client NOT linked: only a name match (no phone on the client record) - needs review.'),
  ('13176793176', 'Carol Rinaldi', 'Ready For Scheduling', null, 'South McKern Court Newberg OR 97132', null, null, null, 'https://drive.google.com/drive/folders/1BtipaL3uUeo57SHcCZaLndIOsIVGOkKH', null, null, true, 'Created from Monday sync 2026-10-03. New project for a repeat customer (her 2025 job is SLX-026). Client NOT linked: name-only match - needs review.');

do $$
declare r record; v_next int;
begin
  perform pg_advisory_xact_lock(hashtext('salexx_jobs_job_id'));
  for r in select * from _new_jobs n
           where not exists (select 1 from jobs j where j.monday_item_id = n.monday_item_id)
           order by n.client_name loop
    select greatest(
      coalesce((select max((substring(job_id from '[0-9]+$'))::int) from jobs where job_id ~ '^SLX-[0-9]+$'), 0),
      coalesce((select max((substring(job_id from '[0-9]+$'))::int) from job_force_delete_log where job_id ~ '^SLX-[0-9]+$'), 0)
    ) + 1 into v_next;
    insert into jobs (job_id, client_name, stage, job_type, address_city, crew, contract_price, sold_date,
                      drive_folder_url, permit_required, client_id, needs_review, notes, monday_item_id, overhead_pct)
    values ('SLX-' || lpad(v_next::text, 3, '0'), r.client_name, r.stage::job_stage, r.job_type, r.address_city,
            r.crew::crew_type, r.contract_price, r.sold_date, r.drive_folder_url, r.permit_required,
            r.client_id, r.needs_review, r.notes, r.monday_item_id, 12);
    raise notice 'created % for %', 'SLX-' || lpad(v_next::text, 3, '0'), r.client_name;
  end loop;
end $$;

-- G. Project Timeline -> scheduled dates, only where the app has none
update jobs set scheduled_start_date = '2026-02-11', scheduled_end_date = '2026-02-11', updated_at = now() where monday_item_id = '11187519510' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-20', scheduled_end_date = '2026-08-21', updated_at = now() where monday_item_id = '12401129682' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-09-07', scheduled_end_date = '2026-09-11', updated_at = now() where monday_item_id = '12786107950' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-27', scheduled_end_date = '2026-07-29', updated_at = now() where monday_item_id = '12473365529' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-27', scheduled_end_date = '2026-08-01', updated_at = now() where monday_item_id = '12603385878' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-04-01', scheduled_end_date = '2026-05-11', updated_at = now() where monday_item_id = '11428534651' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-09', scheduled_end_date = '2026-05-09', updated_at = now() where monday_item_id = '11393704561' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-20', scheduled_end_date = '2026-05-26', updated_at = now() where monday_item_id = '12093107025' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-26', scheduled_end_date = '2026-05-29', updated_at = now() where monday_item_id = '11751596067' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-10-13', scheduled_end_date = '2025-10-16', updated_at = now() where monday_item_id = '10741795518' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-20', scheduled_end_date = '2026-07-24', updated_at = now() where monday_item_id = '12316075590' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-01', scheduled_end_date = '2026-06-04', updated_at = now() where monday_item_id = '11790177315' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-03', scheduled_end_date = '2026-08-07', updated_at = now() where monday_item_id = '12531946607' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-24', scheduled_end_date = '2026-09-02', updated_at = now() where monday_item_id = '12838854890' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-03', scheduled_end_date = '2026-08-13', updated_at = now() where monday_item_id = '12473448565' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-17', scheduled_end_date = '2026-08-18', updated_at = now() where monday_item_id = '12662828559' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-09-14', scheduled_end_date = '2026-09-18', updated_at = now() where monday_item_id = '12731361590' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-27', scheduled_end_date = '2026-08-28', updated_at = now() where monday_item_id = '12799936902' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-06', scheduled_end_date = '2026-07-08', updated_at = now() where monday_item_id = '11935816205' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-04-16', scheduled_end_date = '2026-04-18', updated_at = now() where monday_item_id = '11584687284' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-18', scheduled_end_date = '2026-05-23', updated_at = now() where monday_item_id = '11007260756' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-03-04', scheduled_end_date = '2026-03-04', updated_at = now() where monday_item_id = '11165847351' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-12-01', scheduled_end_date = '2025-12-05', updated_at = now() where monday_item_id = '10741644870' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-15', scheduled_end_date = '2026-01-16', updated_at = now() where monday_item_id = '10917900235' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-11-17', scheduled_end_date = '2025-11-20', updated_at = now() where monday_item_id = '10741651039' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-15', scheduled_end_date = '2025-10-04', updated_at = now() where monday_item_id = '10741784421' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-10-20', scheduled_end_date = '2025-10-24', updated_at = now() where monday_item_id = '10741793514' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-10-06', scheduled_end_date = '2025-10-10', updated_at = now() where monday_item_id = '10741801288' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-10-03', scheduled_end_date = '2025-10-03', updated_at = now() where monday_item_id = '10741795418' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-01', scheduled_end_date = '2025-09-05', updated_at = now() where monday_item_id = '10741803538' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-26', scheduled_end_date = '2025-09-27', updated_at = now() where monday_item_id = '10741801745' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-06-23', scheduled_end_date = '2025-06-27', updated_at = now() where monday_item_id = '10741805988' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-22', scheduled_end_date = '2025-07-24', updated_at = now() where monday_item_id = '10741804349' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-11', scheduled_end_date = '2025-07-21', updated_at = now() where monday_item_id = '10748773266' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-07', scheduled_end_date = '2025-07-11', updated_at = now() where monday_item_id = '10748782798' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-22', scheduled_end_date = '2025-07-24', updated_at = now() where monday_item_id = '10748770133' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-09', scheduled_end_date = '2026-01-10', updated_at = now() where monday_item_id = '10686773825' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-30', scheduled_end_date = '2025-08-01', updated_at = now() where monday_item_id = '10748765970' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-28', scheduled_end_date = '2025-08-01', updated_at = now() where monday_item_id = '10748781000' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-08-07', scheduled_end_date = '2025-08-09', updated_at = now() where monday_item_id = '10748783220' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-08-11', scheduled_end_date = '2025-08-15', updated_at = now() where monday_item_id = '10748784919' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-08-21', scheduled_end_date = '2025-08-25', updated_at = now() where monday_item_id = '10748781288' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-08-30', scheduled_end_date = '2025-09-03', updated_at = now() where monday_item_id = '10748783918' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-08-18', scheduled_end_date = '2025-08-27', updated_at = now() where monday_item_id = '10748780321' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-11', scheduled_end_date = '2025-09-12', updated_at = now() where monday_item_id = '10748784901' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-08', scheduled_end_date = '2025-09-10', updated_at = now() where monday_item_id = '10748790483' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-08', scheduled_end_date = '2025-09-11', updated_at = now() where monday_item_id = '10748797004' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-09-20', scheduled_end_date = '2025-09-26', updated_at = now() where monday_item_id = '10748857273' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-10-27', scheduled_end_date = '2025-10-29', updated_at = now() where monday_item_id = '10748857588' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-10-29', scheduled_end_date = '2025-11-03', updated_at = now() where monday_item_id = '10748856985' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-11-14', scheduled_end_date = '2025-11-14', updated_at = now() where monday_item_id = '10748857953' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-12-01', scheduled_end_date = '2025-12-03', updated_at = now() where monday_item_id = '10748865520' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-02-02', scheduled_end_date = '2025-02-11', updated_at = now() where monday_item_id = '10741679108' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-12', scheduled_end_date = '2026-01-15', updated_at = now() where monday_item_id = '10750119854' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-27', scheduled_end_date = '2026-01-28', updated_at = now() where monday_item_id = '10774154374' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-22', scheduled_end_date = '2026-01-23', updated_at = now() where monday_item_id = '10686794120' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-19', scheduled_end_date = '2026-01-30', updated_at = now() where monday_item_id = '10677247376' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-02-05', scheduled_end_date = '2026-02-07', updated_at = now() where monday_item_id = '11151392266' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-02-26', scheduled_end_date = '2026-03-03', updated_at = now() where monday_item_id = '10793033266' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-02-11', scheduled_end_date = '2026-03-13', updated_at = now() where monday_item_id = '10677226318' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-02-02', scheduled_end_date = '2026-02-04', updated_at = now() where monday_item_id = '11007259967' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-08', scheduled_end_date = '2026-05-09', updated_at = now() where monday_item_id = '11094458186' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-08', scheduled_end_date = '2026-05-09', updated_at = now() where monday_item_id = '12605502109' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2025-07-24', scheduled_end_date = '2025-07-25', updated_at = now() where monday_item_id = '10741797379' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-19', scheduled_end_date = '2026-06-20', updated_at = now() where monday_item_id = '12139917979' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-22', scheduled_end_date = '2026-06-24', updated_at = now() where monday_item_id = '12325222839' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-15', scheduled_end_date = '2026-06-17', updated_at = now() where monday_item_id = '11921732619' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-14', scheduled_end_date = '2026-05-15', updated_at = now() where monday_item_id = '11823322163' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-29', scheduled_end_date = '2026-06-29', updated_at = now() where monday_item_id = '12130103208' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-05', scheduled_end_date = '2026-05-06', updated_at = now() where monday_item_id = '11903072636' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-25', scheduled_end_date = '2026-06-26', updated_at = now() where monday_item_id = '12342846975' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-11', scheduled_end_date = '2026-07-11', updated_at = now() where monday_item_id = '11600169614' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-02-19', scheduled_end_date = '2026-02-24', updated_at = now() where monday_item_id = '11310378218' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-02', scheduled_end_date = '2026-07-03', updated_at = now() where monday_item_id = '12411249931' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-13', scheduled_end_date = '2026-07-15', updated_at = now() where monday_item_id = '12398539911' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-28', scheduled_end_date = '2026-05-30', updated_at = now() where monday_item_id = '11837403775' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-15', scheduled_end_date = '2026-05-18', updated_at = now() where monday_item_id = '11600133253' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-06-22', scheduled_end_date = '2026-06-24', updated_at = now() where monday_item_id = '11886895060' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-28', scheduled_end_date = '2026-05-30', updated_at = now() where monday_item_id = '11683576845' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-01-23', scheduled_end_date = '2026-01-27', updated_at = now() where monday_item_id = '11005411548' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-07-27', scheduled_end_date = '2026-08-01', updated_at = now() where monday_item_id = '11484568925' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-18', scheduled_end_date = '2026-05-22', updated_at = now() where monday_item_id = '11695725918' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-05-11', scheduled_end_date = '2026-05-14', updated_at = now() where monday_item_id = '11394009079' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-20', scheduled_end_date = '2026-08-21', updated_at = now() where monday_item_id = '12800084428' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-08-31', scheduled_end_date = '2026-09-03', updated_at = now() where monday_item_id = '12715774796' and scheduled_start_date is null and scheduled_end_date is null;
update jobs set scheduled_start_date = '2026-09-14', scheduled_end_date = '2026-09-18', updated_at = now() where monday_item_id = '12799650167' and scheduled_start_date is null and scheduled_end_date is null;

-- H. Monday job updates (notes) posted since the last import (newest
--    previously imported: 2026-08-28). 24 in the export; each attaches to
--    its job by Monday Item ID and is skipped if its Monday post id is
--    already in job_updates. Export times are UTC, as in the last import.
--    Philip Marden's note (item 13083998808) has no job in the app, so it
--    is skipped automatically.
insert into job_updates (job_id, author, body, kind, posted_at, monday_post_id)
select j.job_id, u.author, u.body, 'Note', u.posted_at::timestamptz, u.post_id
from (values
  ('12731361590', 'Rosa Hernandez', 'Gave him a call to see if we could start project this week Friday said yes', '2026-09-02T21:59:46+00', '5515533978'),
  ('12715774796', 'Rosa Hernandez', 'Followed up and let him know project is still delayed due to rain', '2026-09-02T22:02:28+00', '5515541459'),
  ('12731361590', 'Rosa Hernandez', 'Doug has been informed on us not going tomorrow due to material being delivered and I let him know instead we will be going Friday to get the work done. He''s all good with it. As per Salvador’s request', '2026-09-09T19:50:36+00', '5534018271'),
  ('12963346102', 'Rosa Hernandez', 'Attempted welcome call no answer.', '2026-09-09T20:13:41+00', '5534106481'),
  ('12401129682', 'Rosa Hernandez', 'Going Thursday this week @8am', '2026-09-11T17:23:26+00', '5540734884'),
  ('12799936902', 'Rosa Hernandez', 'Planning to go next week with puck', '2026-09-16T23:15:09+00', '5554589209'),
  ('12473365529', 'Rosa Hernandez', 'Installed doors will be going Monday 9/21 to paint the door', '2026-09-16T23:15:23+00', '5554589540'),
  ('12963346102', 'Rosa Hernandez', 'Started project today', '2026-09-16T23:15:38+00', '5554589824'),
  ('12603385878', 'Rosa Hernandez', 'Doing her project either Monday 21 or Tuesday 22nd', '2026-09-16T23:16:31+00', '5554590831'),
  ('13031036397', 'Rosa Hernandez', 'Attempted welcome call no answer', '2026-09-16T23:19:14+00', '5554594554'),
  ('12603385878', 'Rosa Hernandez', 'Will be doing her project 9/22 Tuesday', '2026-09-19T00:04:45+00', '5561567037'),
  ('12963346102', 'Alex Mendoza', 'Her painting was only done, still need to get back to do the patio cover', '2026-09-25T23:16:38+00', '5580888171'),
  ('12603385878', 'Alex Mendoza', 'project completed Wednesday this week 9/23/26 just need to set up walkthrough appt and final photos or her.', '2026-09-25T23:24:54+00', '5580894985'),
  ('13083998808', 'Alex Mendoza', 'Will be going back monday to paint wall and chimney', '2026-09-25T23:26:00+00', '5580895831'),
  ('12401129682', 'Alex Mendoza', 'Will be going back to apply clear coat once she gets back mid october', '2026-09-25T23:26:12+00', '5580895975'),
  ('12786107950', 'Rosa Hernandez', '9/29 Subs doing touchups today between 2-4pm', '2026-09-29T21:24:11+00', '5589742474'),
  ('13142238734', 'Rosa Hernandez', 'Did welcome call with Walter/ he said he prefers we start his project anytime after the 8th would be great! But preferrs the week of the 12th to start it / also he mentioned that he wants the guy that knows well about the project that was there the other day to be there through out the project.', '2026-09-30T00:18:54+00', '5590101521'),
  ('13031036397', 'Rosa Hernandez', 'Will check in with him 10/2', '2026-10-02T00:14:29+00', '5598556804'),
  ('13177184637', 'Rosa Hernandez', 'Completed welcome call today 10/1
She’s pretty open', '2026-10-02T00:15:02+00', '5598557383'),
  ('11187519510', 'Rosa Hernandez', 'Updated her on what Alejandra informed us about the project currently.', '2026-10-02T00:26:04+00', '5598568981'),
  ('12307104617', 'Rosa Hernandez', 'Sent her an update on her project still now answer from Washington building services', '2026-10-02T00:26:34+00', '5598569502'),
  ('11533625881', 'Rosa Hernandez', 'Apparently she has an inspection scheduled for Monday, Slavador mentioned so wil check in with inspector tomorrow to see what time', '2026-10-02T00:27:30+00', '5598570315'),
  ('12603385878', 'Rosa Hernandez', 'Final walkthrough scheduled 10/2 @11am', '2026-10-02T00:28:09+00', '5598570996'),
  ('13166403726', 'Rosa Hernandez', 'pressure wash barn doors tomorrow sat/10-12/ material were delivered', '2026-10-02T17:03:39+00', '5600707701')
) as u(item_id, author, body, posted_at, post_id)
join jobs j on j.monday_item_id = u.item_id
where not exists (select 1 from job_updates x where x.monday_post_id = u.post_id);

commit;

-- verify
select job_id, client_name, stage, monday_item_id, client_id is not null as has_client, needs_review
from jobs where updated_at > now() - interval '5 minutes' order by job_id;
select count(*) as monday_notes_total, max(posted_at) as newest_note from job_updates where monday_post_id is not null;
