-- ============================================================
-- 57_tasks_kanban.sql
--
-- Upgrades the Task Management table (56) to back a Kanban board
-- instead of a plain open/done list:
--  * status replaces done — To-do / In Progress / In Review /
--    Completed. Existing rows are migrated (done=true -> Completed,
--    done=false -> To-do), then done is dropped.
--  * assignees (text[]) replaces the single assignee column, so a
--    task can have more than one person on it. Existing single
--    assignees are carried over as a one-element array.
--  * progress (0-100) for the progress bar on each card.
--
-- Run AFTER 56. Safe to re-run.
-- ============================================================

alter table tasks add column if not exists status text not null default 'To-do'
  check (status in ('To-do','In Progress','In Review','Completed'));
update tasks set status = case when done then 'Completed' else 'To-do' end
  where status = 'To-do';

alter table tasks add column if not exists assignees text[] not null default '{}';
update tasks set assignees = array[assignee] where assignee is not null and assignees = '{}';

alter table tasks add column if not exists progress int not null default 0
  check (progress between 0 and 100);
update tasks set progress = 100 where status = 'Completed' and progress = 0;

alter table tasks drop column if exists done;
alter table tasks drop column if exists assignee;

-- verify
select column_name from information_schema.columns where table_name = 'tasks' order by ordinal_position;
