-- ============================================================
-- 37_part6.sql  (6 of 6)
--
-- Split slice of 37_import_crew_time.sql for the Supabase SQL editor,
-- which truncates the full paste. Covers 8 jobs, 74 rows.
-- Self-contained and re-runnable: clears only this slice first.
-- Run all 6 parts (order does not matter). Safe to re-run.
-- ============================================================

delete from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-033', 'SLX-034', 'SLX-051', 'SLX-057', 'SLX-060', 'SLX-061', 'SLX-090', 'SLX-136');

insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Carlos', '2026-02-19', '12:00', '17:00', 5.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Roberto', '2026-02-19', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Ronald', '2026-02-19', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Tito', '2026-02-19', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Carlos', '2026-02-20', '09:30', '17:00', 7.50, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Roberto', '2026-02-20', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Ronald', '2026-02-20', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Tito', '2026-02-20', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Carlos', '2026-02-23', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Roberto', '2026-02-23', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Ronald', '2026-02-23', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Tito', '2026-02-23', '08:00', '18:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-033', 'Roberto', '2026-02-24', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Carlos', '2026-02-24', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Ronald', '2026-02-24', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Tito', '2026-02-24', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Carlos', '2026-02-25', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Roberto', '2026-02-25', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Ronald', '2026-02-25', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Tito', '2026-02-25', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Roberto', '2026-02-26', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Roberto', '2026-03-03', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-034', 'Ronald', '2026-03-03', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Roberto', '2026-05-18', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Ronald', '2026-05-18', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Tito', '2026-05-18', '07:00', '20:00', 13.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Carlos', '2026-05-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Roberto', '2026-05-19', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Ronald', '2026-05-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Tito', '2026-05-19', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Carlos', '2026-05-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Roberto', '2026-05-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Ronald', '2026-05-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Tito', '2026-05-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Carlos', '2026-05-21', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Roberto', '2026-05-21', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Ronald', '2026-05-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Tito', '2026-05-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Carlos', '2026-05-22', '10:00', '18:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Roberto', '2026-05-22', '07:00', '18:30', 11.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Ronald', '2026-05-22', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-051', 'Tito', '2026-05-22', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Carlos', '2026-06-01', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Roberto', '2026-06-01', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Ronald', '2026-06-01', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Carlos', '2026-06-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Roberto', '2026-06-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Ronald', '2026-06-02', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Roberto', '2026-06-03', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Ronald', '2026-06-03', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Tito', '2026-06-03', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Carlos', '2026-06-04', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Roberto', '2026-06-04', '07:00', '14:30', 7.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Ronald', '2026-06-04', '07:00', '14:30', 7.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Carlos', '2026-06-05', '10:00', '18:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Roberto', '2026-06-05', '10:30', '18:00', 7.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Tito', '2026-06-05', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Carlos', '2026-06-12', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-057', 'Tito', '2026-06-12', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Roberto', '2026-06-08', '08:00', '17:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Tito', '2026-06-08', '08:00', '17:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Carlos', '2026-06-11', '07:00', '15:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Tito', '2026-06-11', '07:00', '15:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Roberto', '2026-06-18', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Ronald', '2026-06-18', '07:00', '10:00', 3.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-060', 'Roberto', '2026-06-26', '07:00', '10:00', 3.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-061', 'Roberto', '2026-06-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-061', 'Ronald', '2026-06-11', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-061', 'Roberto', '2026-06-12', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-061', 'Ronald', '2026-06-12', '07:20', '17:30', 10.17, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-090', 'Roberto', '2026-08-21', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-090', 'Roberto', '2026-08-22', '08:00', '17:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-090', 'Roberto', '2026-08-29', '08:00', '17:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-136', 'Ronald', '2026-03-16', '08:00', '17:00', 9.00, 'Job', true, 'ttt-import');

-- verify this slice: expect 74 rows
select count(*) as part6_rows,
  case when count(*) = 74 then 'PASS' else 'FAIL' end as result
  from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-033', 'SLX-034', 'SLX-051', 'SLX-057', 'SLX-060', 'SLX-061', 'SLX-090', 'SLX-136');

