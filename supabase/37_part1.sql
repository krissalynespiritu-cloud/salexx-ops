-- ============================================================
-- 37_part1.sql  (1 of 6)
--
-- Split slice of 37_import_crew_time.sql for the Supabase SQL editor,
-- which truncates the full paste. Covers 7 jobs, 75 rows.
-- Self-contained and re-runnable: clears only this slice first.
-- Run all 6 parts (order does not matter). Safe to re-run.
-- ============================================================

delete from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-049', 'SLX-067', 'SLX-069', 'SLX-070', 'SLX-072', 'SLX-073', 'SLX-129');

insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-049', 'Roberto', '2026-05-14', '08:00', '18:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-049', 'Ronald', '2026-05-14', '08:05', '18:20', 10.25, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-067', 'Carlos', '2026-06-25', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-067', 'Roberto', '2026-06-25', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-067', 'Ronald', '2026-06-25', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-067', 'Tito', '2026-06-25', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Carlos', '2026-06-29', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Roberto', '2026-06-29', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Ronald', '2026-06-29', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Tito', '2026-06-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Carlos', '2026-06-30', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Roberto', '2026-06-30', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Tito', '2026-06-30', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Carlos', '2026-07-01', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Roberto', '2026-07-01', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Ronald', '2026-07-01', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-069', 'Tito', '2026-07-01', '07:00', '19:00', 12.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-070', 'Carlos', '2026-07-02', '08:00', '18:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-070', 'Tito', '2026-07-02', '08:00', '18:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-072', 'Roberto', '2026-07-13', '07:00', '15:30', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-072', 'Ronald', '2026-07-13', '07:00', '15:30', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-072', 'Tito', '2026-07-13', '07:00', '15:30', 8.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-072', 'Roberto', '2026-07-14', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-072', 'Ronald', '2026-07-14', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-072', 'Tito', '2026-07-14', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Roberto', '2026-07-16', '09:00', '17:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Ronald', '2026-07-16', '10:00', '17:00', 7.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Tito', '2026-07-16', '09:00', '17:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Avelino', '2026-07-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Ronald', '2026-07-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Tito', '2026-07-20', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Avelino', '2026-07-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-073', 'Tito', '2026-07-21', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-21', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-21', '07:00', '16:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-04-21', '07:00', '16:00', 9.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-21', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-22', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-22', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-22', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-23', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-23', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-04-23', '07:10', '14:00', 6.83, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-23', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-24', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-24', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-04-24', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-24', '07:00', '17:00', 10.00, 'Job', true, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-27', '09:00', '17:00', 8.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-27', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-28', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-04-29', '07:10', '17:00', 9.83, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-29', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-04-30', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-04-30', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-04-30', '07:00', '16:00', 9.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-04-30', '07:00', '18:00', 11.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-05-01', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-05-01', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-05-01', '07:00', '16:30', 9.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-05-01', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-05-02', '08:00', '14:30', 6.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-05-02', '08:00', '12:30', 4.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-05-02', '08:00', '14:10', 6.17, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-05-02', '08:00', '14:30', 6.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Carlos', '2026-05-04', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-05-04', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Ronald', '2026-05-04', '07:00', '17:30', 10.50, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Tito', '2026-05-04', '07:00', '17:00', 10.00, 'Job', false, 'ttt-import');
insert into time_entries (job_id, person, work_date, clock_in, clock_out, hours, kind, paid, entered_by) values ('SLX-129', 'Roberto', '2026-05-05', '07:30', '18:30', 11.00, 'Job', false, 'ttt-import');

-- verify this slice: expect 75 rows
select count(*) as part1_rows,
  case when count(*) = 75 then 'PASS' else 'FAIL' end as result
  from time_entries where entered_by = 'ttt-import' and job_id in ('SLX-049', 'SLX-067', 'SLX-069', 'SLX-070', 'SLX-072', 'SLX-073', 'SLX-129');

