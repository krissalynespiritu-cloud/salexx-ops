-- ============================================================
-- 100_task_repeat.sql
--
-- Repeating tasks, replacing the team's daily routines in Google Tasks
-- ("Report who's at the jobsites", "MONDAY: REVIEW WINS/LOSSES"...).
--
-- tasks.repeat is one of 'daily' | 'weekdays' | 'weekly' | 'monthly'
-- (null = doesn't repeat). When a repeating task is marked Completed --
-- from the board, the task window, or anywhere else, since this lives in
-- the database rather than the app -- a fresh To-do copy is created for
-- the next occurrence (same title, people, priority, notes, job/lead/
-- client links), and the repeat moves to that new copy. The completed
-- one keeps its history and stops repeating, so re-opening and
-- re-completing it can never spawn a second copy.
--
-- Next due date (task_next_due): one step after the task's due date
-- (or after today if it had none), skipping ahead so it's never in the
-- past -- finishing Monday's daily task on Thursday gives a task due
-- Thursday, not one that's already 3 days overdue. Weekdays skips
-- Saturday/Sunday. Weekly keeps the same weekday. Monthly keeps the
-- day of month (Jan 31 -> Feb 28). "Today" is Oregon time, like the
-- rest of the app.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table tasks add column if not exists repeat text;
alter table tasks drop constraint if exists tasks_repeat_check;
alter table tasks add constraint tasks_repeat_check
  check (repeat is null or repeat in ('daily','weekdays','weekly','monthly'));

create or replace function task_next_due(p_repeat text, p_base date, p_today date)
returns date language plpgsql immutable as $$
declare
  base date := coalesce(p_base, p_today);
  nxt  date;
  n    int := 1;
begin
  loop
    if p_repeat = 'daily' then
      nxt := base + n;
    elsif p_repeat = 'weekdays' then
      nxt := base + n;
    elsif p_repeat = 'weekly' then
      nxt := base + 7 * n;
    elsif p_repeat = 'monthly' then
      nxt := (base + make_interval(months => n))::date;
    else
      return null;
    end if;
    -- weekdays: step over Sat (6) / Sun (0)
    if p_repeat = 'weekdays' and extract(dow from nxt) in (0, 6) then
      n := n + 1;
      continue;
    end if;
    exit when nxt >= p_today;
    n := n + 1;
  end loop;
  return nxt;
end $$;

create or replace function tasks_spawn_repeat() returns trigger
language plpgsql as $$
begin
  if new.repeat is not null
     and new.status = 'Completed'
     and old.status is distinct from 'Completed' then
    insert into tasks (title, assignees, priority, notes, job_id, lead_id, client_id,
                       due_date, status, progress, repeat)
    values (new.title, new.assignees, new.priority, new.notes, new.job_id, new.lead_id, new.client_id,
            task_next_due(new.repeat, new.due_date, (now() at time zone 'America/Los_Angeles')::date),
            'To-do', 0, new.repeat);
    new.repeat := null;
  end if;
  return new;
end $$;

drop trigger if exists tasks_spawn_repeat on tasks;
create trigger tasks_spawn_repeat before update on tasks
  for each row execute function tasks_spawn_repeat();

-- verify: 0 until a task is set to repeat
select count(*) filter (where repeat is not null) as repeating_tasks from tasks;
