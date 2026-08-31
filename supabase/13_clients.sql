-- ============================================================
--  Salexx Ops Hub — clients
--
--  Repeat clients are the point, not a problem. 11 of Salexx's 120
--  clients have come back for a second or third project, worth
--  $278,195 — Casey Wixson $65,851 across two jobs, Sarah Lyn Lawton
--  three projects (Painting, then Siding + Windows).
--
--  Until now "Sarah Lyn Lawton" was just text typed into three
--  separate job rows. Change her phone number and you'd edit three
--  places, and nobody could answer "how much has she spent with us."
--
--  Run AFTER 12_monday_sync.sql. Safe to re-run.
-- ============================================================

create table if not exists clients (
  client_id     uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         text,
  address       text,
  city          text,
  -- how they first found Salexx. Stays fixed even if later jobs come
  -- through referral — the original source is what earned the customer.
  first_source  text,
  first_job_date date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists clients_name_key on clients (lower(trim(name)));

alter table jobs add column if not exists client_id uuid
  references clients(client_id) on delete set null;
create index if not exists jobs_client_idx on jobs (client_id);

alter table leads add column if not exists client_id uuid
  references clients(client_id) on delete set null;


-- ---------- build one client per distinct name ----------
insert into clients (name, first_job_date)
select
  -- group on the lowercased name so "Sarah Lyn Lawton" and
  -- "sarah lyn lawton" become ONE client, not two
  min(trim(client_name)),
  min(sold_date)
from jobs
where client_name is not null and trim(client_name) <> ''
group by lower(trim(client_name))
on conflict (lower(trim(name))) do nothing;

-- link every job to its client
update jobs j set client_id = c.client_id
from clients c
where j.client_id is null
  and lower(trim(j.client_name)) = lower(trim(c.name));

-- pull contact details across from leads where we have them
update clients c set
  phone        = coalesce(c.phone, l.phone),
  email        = coalesce(c.email, l.email),
  first_source = coalesce(c.first_source, l.source)
from (
  select distinct on (lower(trim(name))) lower(trim(name)) as k, name, phone, email, source
  from leads
  order by lower(trim(name)), lead_date
) l
where lower(trim(c.name)) = l.k;

-- link leads back to the client they became
update leads l set client_id = c.client_id
from clients c
where l.client_id is null
  and lower(trim(l.name)) = lower(trim(c.name));


-- ============================================================
--  Lifetime value. The question Salexx couldn't previously answer.
-- ============================================================
create or replace view client_value as
select
  c.client_id,
  c.name,
  c.phone,
  c.email,
  c.city,
  c.first_source,
  c.first_job_date,
  count(j.job_id)                                       as projects,
  count(j.job_id) filter (where j.stage = 'Completed')  as completed,
  sum(m.revenue)                                        as lifetime_value,
  sum(m.gross_profit)                                   as lifetime_gross_profit,
  round(avg(m.margin_pct), 1)                           as avg_margin_pct,
  max(j.completed_date)                                 as last_job_date,
  string_agg(distinct j.job_type, ', ')                 as trades,
  (count(j.job_id) > 1)                                 as is_repeat
from clients c
left join jobs        j on j.client_id = c.client_id
left join job_margins m on m.job_id    = j.job_id
group by c.client_id, c.name, c.phone, c.email, c.city, c.first_source, c.first_job_date;


-- Repeat clients only, best first. This is a call list: someone who
-- has already bought twice is the most likely person to buy again.
create or replace view repeat_clients as
select * from client_value
where projects > 1
order by lifetime_value desc nulls last;


-- Which lead source produces clients who come BACK, not just clients.
-- A source with a lower close rate but more repeat business can easily
-- be worth more than one that wins once and never returns.
create or replace view source_lifetime_value as
select
  coalesce(first_source, 'Unknown')                     as source,
  count(*)                                              as clients,
  count(*) filter (where is_repeat)                     as repeat_clients,
  round(100.0 * count(*) filter (where is_repeat)
        / nullif(count(*), 0), 1)                       as repeat_rate_pct,
  sum(lifetime_value)                                   as total_value,
  round(avg(lifetime_value), 2)                         as avg_client_value
from client_value
group by 1
order by sum(lifetime_value) desc nulls last;


alter table clients enable row level security;
drop policy if exists team_all on clients;
create policy team_all on clients for all to authenticated using (true) with check (true);

drop trigger if exists clients_touch on clients;
create trigger clients_touch before update on clients
  for each row execute function touch_updated_at();
