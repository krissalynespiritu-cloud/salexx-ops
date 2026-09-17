-- ============================================================
-- 56_tasks.sql
--
-- Task Management page: a shared to-do list across the team,
-- filterable by person. One table for everyone (Luke, Kriss,
-- Victor, Rosa, Alex today; anyone can add a new assignee later
-- without a schema change since assignee is just text).
--
-- A task can optionally link to a job or a lead ("follow up on
-- the Smith estimate" jumps straight to it), and carries a
-- priority and a free-text notes field.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists tasks (
  task_id     uuid primary key default gen_random_uuid(),
  title       text not null,
  assignee    text,
  due_date    date,
  done        boolean not null default false,
  priority    text not null default 'Medium' check (priority in ('Low','Medium','High')),
  notes       text,
  job_id      text references jobs(job_id) on delete set null,
  lead_id     uuid references leads(lead_id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on tasks (assignee);
create index if not exists tasks_due_date_idx on tasks (due_date);

alter table tasks enable row level security;
drop policy if exists team_all on tasks;
create policy team_all on tasks for all to authenticated using (true) with check (true);
grant all on tasks to anon, authenticated, service_role;

drop trigger if exists tasks_touch on tasks;
create trigger tasks_touch before update on tasks
  for each row execute function touch_updated_at();

-- verify
select count(*) from information_schema.tables where table_name='tasks';
