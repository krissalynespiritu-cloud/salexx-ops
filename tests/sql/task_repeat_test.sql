-- ============================================================
-- tests/sql/task_repeat_test.sql
--
-- SQL-level test for repeating tasks (supabase/100_task_repeat.sql):
-- the next-due-date math and the trigger that creates the next copy
-- when a repeating task is completed. The JS suite mocks Supabase and
-- can't see a database trigger, so this runs the real migration file
-- against a throwaway Postgres.
--
-- Minimal tasks table: only the columns 56_tasks.sql and later
-- migrations give it that the trigger reads or writes.
--
-- NEVER run against a real project -- it creates and drops `tasks`.
-- (It refuses to, see the guard below.) To install repeating tasks in
-- Supabase, run supabase/100_task_repeat.sql -- not this file.
-- Usage (from the repo root):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/task_repeat_test.sql
-- ============================================================

-- Safety guard: refuse to run anywhere that looks like the real Ops Hub
-- database (it has tables a throwaway test database never does), BEFORE
-- the drop below can touch the real tasks table.
do $$
begin
  if to_regclass('public.payroll_periods') is not null or to_regclass('public.leads') is not null then
    raise exception 'STOP: this is a TEST file and this looks like the real database. Nothing was changed. Run supabase/100_task_repeat.sql instead.';
  end if;
end $$;

drop table if exists tasks cascade;
create table tasks (
  task_id     uuid primary key default gen_random_uuid(),
  title       text not null,
  due_date    date,
  priority    text not null default 'Medium',
  notes       text,
  job_id      text,
  lead_id     uuid,
  client_id   uuid,
  status      text not null default 'To-do',
  assignees   text[] not null default '{}',
  progress    int not null default 0,
  created_at  timestamptz not null default now()
);

\i supabase/100_task_repeat.sql

do $$
declare
  today date := (now() at time zone 'America/Los_Angeles')::date;
  t1 uuid; t2 uuid; n int; r record;
  procedure_check text;
begin
  -- ---- task_next_due: fixed dates (2026-10-01 is a Thursday) ----
  if task_next_due('daily',    '2026-10-01', '2026-10-01') <> '2026-10-02' then raise exception 'daily: next day'; end if;
  if task_next_due('daily',    '2026-09-28', '2026-10-01') <> '2026-10-01' then raise exception 'daily: overdue catches up to today, not the past'; end if;
  if task_next_due('daily',    '2026-10-05', '2026-10-01') <> '2026-10-06' then raise exception 'daily: completed early keeps stepping from its own date'; end if;
  if task_next_due('weekdays', '2026-10-02', '2026-10-02') <> '2026-10-05' then raise exception 'weekdays: Friday -> Monday'; end if;
  if task_next_due('weekdays', '2026-10-03', '2026-10-03') <> '2026-10-05' then raise exception 'weekdays: Saturday -> Monday'; end if;
  if task_next_due('weekdays', '2026-10-01', '2026-10-01') <> '2026-10-02' then raise exception 'weekdays: Thursday -> Friday'; end if;
  if task_next_due('weekly',   '2026-09-28', '2026-09-28') <> '2026-10-05' then raise exception 'weekly: Monday -> next Monday'; end if;
  if task_next_due('weekly',   '2026-09-14', '2026-10-01') <> '2026-10-05' then raise exception 'weekly: overdue Monday -> the coming Monday'; end if;
  if task_next_due('monthly',  '2026-01-31', '2026-01-31') <> '2026-02-28' then raise exception 'monthly: Jan 31 -> Feb 28'; end if;
  if task_next_due('monthly',  '2026-03-15', '2026-03-15') <> '2026-04-15' then raise exception 'monthly: same day next month'; end if;
  if task_next_due('daily',    null,         '2026-10-01') <> '2026-10-02' then raise exception 'no due date: counts from today'; end if;
  if task_next_due(null,       '2026-10-01', '2026-10-01') is not null    then raise exception 'not repeating -> null'; end if;

  -- ---- trigger: completing a repeating task creates exactly one next copy ----
  insert into tasks (title, due_date, priority, notes, job_id, assignees, repeat)
    values ('Report who''s at the jobsites', today, 'High', 'every morning', 'SLX-1', '{Alex}', 'daily')
    returning task_id into t1;

  update tasks set status = 'Completed', progress = 100 where task_id = t1;

  select count(*) into n from tasks;
  if n <> 2 then raise exception 'expected 2 tasks after completing a daily task, got %', n; end if;

  select * into r from tasks where task_id <> t1;
  if r.status <> 'To-do' or r.progress <> 0 then raise exception 'new copy should be a fresh To-do'; end if;
  if r.due_date <> today + 1 then raise exception 'new copy due tomorrow, got %', r.due_date; end if;
  if r.repeat <> 'daily' then raise exception 'repeat should move to the new copy'; end if;
  if r.title <> 'Report who''s at the jobsites' or r.assignees <> '{Alex}' or r.priority <> 'High'
     or r.notes <> 'every morning' or r.job_id <> 'SLX-1' then raise exception 'new copy should keep title/people/priority/notes/job'; end if;
  t2 := r.task_id;

  select * into r from tasks where task_id = t1;
  if r.repeat is not null then raise exception 'completed task should stop repeating'; end if;
  if r.status <> 'Completed' then raise exception 'completed task should stay completed'; end if;

  -- re-opening and re-completing the old one must NOT spawn another copy
  update tasks set status = 'To-do' where task_id = t1;
  update tasks set status = 'Completed' where task_id = t1;
  select count(*) into n from tasks;
  if n <> 2 then raise exception 're-completing an old task spawned a duplicate (% tasks)', n; end if;

  -- editing a repeating task without completing it does nothing extra
  update tasks set title = 'Report who''s at the jobsites (AM)' where task_id = t2;
  update tasks set status = 'In Progress' where task_id = t2;
  select count(*) into n from tasks;
  if n <> 2 then raise exception 'non-completion updates spawned a task (% tasks)', n; end if;

  -- a non-repeating task completes normally
  insert into tasks (title) values ('One-off') returning task_id into t1;
  update tasks set status = 'Completed' where task_id = t1;
  select count(*) into n from tasks;
  if n <> 3 then raise exception 'one-off task spawned a copy (% tasks)', n; end if;

  -- invalid repeat value is rejected
  begin
    insert into tasks (title, repeat) values ('bad', 'hourly');
    raise exception 'repeat=hourly should have been rejected';
  exception when check_violation then null;
  end;

  raise notice 'task_repeat_test: all checks passed';
end $$;

drop table tasks cascade;
drop function if exists tasks_spawn_repeat();
drop function if exists task_next_due(text, date, date);
