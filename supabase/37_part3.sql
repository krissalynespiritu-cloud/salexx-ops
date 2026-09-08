-- ============================================================
-- 37_part3.sql  (3 of 6)
--
-- Split slice of 37_import_crew_time.sql for the Supabase SQL editor,
-- which truncates the full paste. Covers 7 jobs, 75 rows.
-- Self-contained and re-runnable: clears only this slice first.
-- Run all 6 parts (order does not matter). Safe to re-run.
-- ============================================================

delete from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-031', 'SLX-048', 'SLX-052', 'SLX-075', 'SLX-082', 'SLX-084', 'SLX-147');

insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Carlos', '2026-02-11', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Roberto', '2026-02-11', '07:30', '16:30', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Ronald', '2026-02-11', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Tito', '2026-02-11', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Tito', '2026-02-12', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Tito', '2026-02-13', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Carlos', '2026-02-17', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Tito', '2026-02-17', '07:30', '17:00', 9.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Ronald', '2026-03-04', '08:00', '16:00', 8.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-031', 'Tito', '2026-04-20', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Carlos', '2026-05-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Roberto', '2026-05-11', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Ronald', '2026-05-11', '07:10', '17:00', 9.83, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Tito', '2026-05-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Carlos', '2026-05-12', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Roberto', '2026-05-12', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Ronald', '2026-05-12', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Tito', '2026-05-12', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Carlos', '2026-05-13', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Roberto', '2026-05-13', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Ronald', '2026-05-13', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Tito', '2026-05-13', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Carlos', '2026-05-14', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-048', 'Tito', '2026-05-14', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-052', 'Carlos', '2026-06-18', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-052', 'Tito', '2026-06-18', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-075', 'Avelino', '2026-07-22', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-075', 'Tito', '2026-07-22', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-082', 'Avelino', '2026-08-22', '08:00', '16:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-082', 'Edy', '2026-08-22', '08:00', '16:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-082', 'Tito', '2026-08-22', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-082', 'Avelino', '2026-08-23', '08:30', '17:00', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-082', 'Salvador', '2026-08-23', '08:30', '17:00', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Avelino', '2026-09-04', '07:00', '13:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Edy', '2026-09-04', '07:00', '13:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Roberto', '2026-09-04', '07:00', '13:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Tito', '2026-09-04', '07:00', '13:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Avelino', '2026-09-07', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Edy', '2026-09-07', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Roberto', '2026-09-07', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-084', 'Tito', '2026-09-07', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-08-24', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-08-24', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-08-24', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-08-24', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-08-25', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-08-25', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-08-25', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-08-25', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-08-26', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-08-26', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-08-26', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-08-26', '07:00', '14:00', 7.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-08-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-08-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-08-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-08-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-08-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-08-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-08-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-08-31', '07:00', '13:00', 6.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-08-31', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-08-31', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-09-01', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-09-01', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-09-01', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-09-01', '07:00', '18:44', 11.73, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-09-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-09-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-09-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-09-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Avelino', '2026-09-03', '08:30', '17:00', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Edy', '2026-09-03', '08:30', '17:00', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Roberto', '2026-09-03', '08:30', '17:00', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-147', 'Tito', '2026-09-03', '08:30', '17:00', 8.50, 'Job', false, 'ttt-import');

-- verify this slice: expect 75 rows
select count(*) as part3_rows,
  case when count(*) = 75 then 'PASS' else 'FAIL' end as result
  from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-031', 'SLX-048', 'SLX-052', 'SLX-075', 'SLX-082', 'SLX-084', 'SLX-147');

