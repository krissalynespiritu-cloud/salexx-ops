-- ============================================================
-- 37_part5.sql  (5 of 6)
--
-- Split slice of 37_import_crew_time.sql for the Supabase SQL editor,
-- which truncates the full paste. Covers 8 jobs, 74 rows.
-- Self-contained and re-runnable: clears only this slice first.
-- Run all 6 parts (order does not matter). Safe to re-run.
-- ============================================================

delete from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-036', 'SLX-044', 'SLX-054', 'SLX-056', 'SLX-071', 'SLX-077', 'SLX-080', 'SLX-081');

insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Carlos', '2026-02-26', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Ronald', '2026-02-26', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Tito', '2026-02-26', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Carlos', '2026-02-27', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Roberto', '2026-02-27', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Ronald', '2026-02-27', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Tito', '2026-02-27', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Roberto', '2026-03-02', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Ronald', '2026-03-02', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Tito', '2026-03-02', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-036', 'Tito', '2026-03-03', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-044', 'Tito', '2026-04-17', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Roberto', '2026-05-26', '07:00', '17:20', 10.33, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Ronald', '2026-05-26', '07:00', '17:20', 10.33, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Tito', '2026-05-26', '07:00', '17:20', 10.33, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Roberto', '2026-05-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Ronald', '2026-05-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Tito', '2026-05-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Roberto', '2026-05-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Ronald', '2026-05-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Tito', '2026-05-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-054', 'Roberto', '2026-05-29', '07:00', '14:00', 7.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-056', 'Ronald', '2026-05-29', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-056', 'Tito', '2026-05-29', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-056', 'Carlos', '2026-06-03', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-056', 'Tito', '2026-06-04', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-071', 'Carlos', '2026-07-09', '08:00', '17:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-071', 'Ronald', '2026-07-09', '08:00', '17:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-071', 'Tito', '2026-07-09', '08:00', '17:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-071', 'Roberto', '2026-07-15', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-071', 'Ronald', '2026-07-15', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-071', 'Tito', '2026-07-15', '07:15', '18:00', 10.75, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-07-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-07-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Ronald', '2026-07-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Tito', '2026-07-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-07-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-07-28', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Ronald', '2026-07-28', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Tito', '2026-07-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-07-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-07-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Ronald', '2026-07-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Tito', '2026-07-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-07-30', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-07-30', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Ronald', '2026-07-30', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Tito', '2026-07-30', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-07-31', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-07-31', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Tito', '2026-07-31', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-08-03', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-08-03', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Avelino', '2026-08-04', '07:00', '12:30', 5.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Roberto', '2026-08-04', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-077', 'Tito', '2026-08-04', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-080', 'Avelino', '2026-08-17', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-080', 'Edy', '2026-08-17', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-080', 'Tito', '2026-08-17', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Avelino', '2026-08-18', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Edy', '2026-08-18', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Roberto', '2026-08-18', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Tito', '2026-08-18', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Avelino', '2026-08-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Edy', '2026-08-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Roberto', '2026-08-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Tito', '2026-08-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Avelino', '2026-08-20', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Edy', '2026-08-20', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Roberto', '2026-08-20', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Tito', '2026-08-20', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Avelino', '2026-08-21', '07:00', '15:30', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Edy', '2026-08-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-081', 'Tito', '2026-08-21', '07:00', '11:30', 4.50, 'Job', false, 'ttt-import');

-- verify this slice: expect 74 rows
select count(*) as part5_rows,
  case when count(*) = 74 then 'PASS' else 'FAIL' end as result
  from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-036', 'SLX-044', 'SLX-054', 'SLX-056', 'SLX-071', 'SLX-077', 'SLX-080', 'SLX-081');

