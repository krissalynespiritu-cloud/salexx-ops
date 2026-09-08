-- ============================================================
-- 37_part4.sql  (4 of 6)
--
-- Split slice of 37_import_crew_time.sql for the Supabase SQL editor,
-- which truncates the full paste. Covers 8 jobs, 75 rows.
-- Self-contained and re-runnable: clears only this slice first.
-- Run all 6 parts (order does not matter). Safe to re-run.
-- ============================================================

delete from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-040', 'SLX-042', 'SLX-046', 'SLX-059', 'SLX-068', 'SLX-074', 'SLX-076', 'SLX-165');

insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-040', 'Ronald', '2026-04-08', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-040', 'Carlos', '2026-04-17', '08:00', '16:15', 8.25, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-040', 'Ronald', '2026-04-17', '08:00', '16:00', 8.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-040', 'Carlos', '2026-04-20', '08:20', '10:20', 2.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-040', 'Roberto', '2026-04-20', '08:10', '16:15', 8.08, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-040', 'Ronald', '2026-04-20', '08:00', '16:15', 8.25, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-042', 'Carlos', '2026-04-14', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-042', 'Roberto', '2026-04-14', '07:00', '16:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-042', 'Ronald', '2026-04-14', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-042', 'Tito', '2026-04-14', '10:00', '17:00', 7.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Carlos', '2026-05-05', '07:00', '17:15', 10.25, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Ronald', '2026-05-05', '07:00', '17:15', 10.25, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Tito', '2026-05-05', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Carlos', '2026-05-06', '07:00', '17:15', 10.25, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Roberto', '2026-05-06', '07:00', '17:15', 10.25, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Ronald', '2026-05-06', '07:00', '17:15', 10.25, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Tito', '2026-05-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Carlos', '2026-05-07', '07:00', '20:00', 13.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Roberto', '2026-05-07', '07:00', '20:00', 13.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Ronald', '2026-05-07', '07:00', '12:30', 5.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Tito', '2026-05-07', '07:00', '20:00', 13.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Carlos', '2026-05-08', '09:00', '18:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Roberto', '2026-05-08', '13:00', '18:00', 5.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-046', 'Ronald', '2026-05-08', '09:00', '15:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Carlos', '2026-06-09', '09:00', '18:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Roberto', '2026-06-09', '09:00', '17:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Ronald', '2026-06-09', '09:00', '18:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Tito', '2026-06-09', '09:00', '18:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Carlos', '2026-06-10', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Roberto', '2026-06-10', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Ronald', '2026-06-10', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-059', 'Tito', '2026-06-10', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Carlos', '2026-07-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Roberto', '2026-07-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Ronald', '2026-07-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Tito', '2026-07-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Carlos', '2026-07-07', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Roberto', '2026-07-07', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Ronald', '2026-07-07', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Tito', '2026-07-07', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Carlos', '2026-07-08', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Roberto', '2026-07-08', '08:00', '16:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-068', 'Tito', '2026-07-08', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-07-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-07-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Ronald', '2026-07-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-07-22', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-06', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Avelino', '2026-08-07', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-07', '07:00', '12:00', 5.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-07', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Avelino', '2026-08-10', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Edy', '2026-08-10', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-10', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-10', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Avelino', '2026-08-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Edy', '2026-08-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Avelino', '2026-08-12', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Edy', '2026-08-12', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-12', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-12', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Avelino', '2026-08-13', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Edy', '2026-08-13', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-13', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-13', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Roberto', '2026-08-14', '08:00', '14:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-074', 'Tito', '2026-08-14', '08:00', '15:00', 7.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-076', 'Avelino', '2026-07-23', '08:00', '16:30', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-076', 'Roberto', '2026-07-23', '08:00', '16:30', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-076', 'Tito', '2026-07-23', '08:00', '18:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-165', 'Roberto', '2026-07-10', '07:00', '19:30', 12.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-165', 'Ronald', '2026-07-10', '07:20', '19:30', 12.17, 'Job', false, 'ttt-import');

-- verify this slice: expect 75 rows
select count(*) as part4_rows,
  case when count(*) = 75 then 'PASS' else 'FAIL' end as result
  from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-040', 'SLX-042', 'SLX-046', 'SLX-059', 'SLX-068', 'SLX-074', 'SLX-076', 'SLX-165');

