-- ============================================================
--  Salexx Ops Hub — Phase 3
--  profiles · cold calls · google reviews · ad spend · weekly metrics
--  + the report views that replace the dashboard tabs
--
--  Run AFTER 04_phase2.sql. Safe to re-run.
--
--  NOTE ON OVERHEAD: jobs.overhead_pct stays at 12%. That figure came
--  from Salexx's coach and is deliberate. overhead_rate_check is a
--  read-only view for reference — it changes no calculation anywhere.
-- ============================================================

do $$ begin
  create type call_outcome as enum ('Answered','No Answer','Voicemail','Wrong Number','Do Not Call');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_method as enum ('Text','Email','In Person','Phone','QR Card');
exception when duplicate_object then null; end $$;


-- ============================================================
--  profiles — who is posting, with a face next to it.
--
--  Linked to Supabase Auth so the app never has to ask "who are you";
--  it reads the signed-in user's profile. initials + color give every
--  person an avatar without needing uploaded images.
-- ============================================================
create table if not exists profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  initials    text not null,
  avatar_color text not null default '#5BA8D4',
  avatar_url  text,                    -- optional real photo later
  job_title   text,
  crew_name   text references crew(name) on delete set null,
  created_at  timestamptz not null default now()
);

-- A profile is created automatically the first time someone signs in,
-- so nobody has to remember to do it by hand.
create or replace function handle_new_user() returns trigger as $$
declare
  nm text;
begin
  nm := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  insert into profiles (user_id, full_name, initials, avatar_color)
  values (
    new.id,
    initcap(nm),
    upper(left(nm, 1) ||
      case when position(' ' in nm) > 0
           then substr(nm, position(' ' in nm) + 1, 1) else '' end),
    -- stable colour per person, so avatars don't change between sessions
    (array['#5BA8D4','#3E9C6D','#E8A33D','#9B8CD4','#D14A3C','#B9C62A'])
      [1 + (abs(hashtext(new.id::text)) % 6)]
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill anyone who already signed up before this ran.
insert into profiles (user_id, full_name, initials, avatar_color)
select
  u.id,
  initcap(split_part(u.email, '@', 1)),
  upper(left(split_part(u.email, '@', 1), 2)),
  (array['#5BA8D4','#3E9C6D','#E8A33D','#9B8CD4','#D14A3C','#B9C62A'])
    [1 + (abs(hashtext(u.id::text)) % 6)]
from auth.users u
on conflict (user_id) do nothing;


-- ============================================================
--  job_updates gets an author identity instead of a typed name.
-- ============================================================
alter table job_updates add column if not exists author_id uuid
  references profiles(user_id) on delete set null;
alter table job_updates add column if not exists edited_at timestamptz;

-- Everything the note feed needs, in one read: body, timestamp, and
-- the poster's name, initials and colour.
create or replace view job_updates_feed as
select
  u.update_id, u.job_id, u.estimate_id, u.body, u.kind,
  u.posted_at, u.edited_at, u.monday_post_id,
  coalesce(p.full_name, u.author)                  as author_name,
  coalesce(p.initials, upper(left(u.author,2)))    as author_initials,
  coalesce(p.avatar_color, '#5A7391')              as author_color,
  p.avatar_url,
  p.job_title,
  j.client_name
from job_updates u
left join profiles p on p.user_id = u.author_id
left join jobs     j on j.job_id   = u.job_id
order by u.posted_at desc;


-- ============================================================
--  leads gets the columns the Lead Sources tab actually uses.
-- ============================================================
alter table leads add column if not exists campaign        text;
alter table leads add column if not exists service         text;
alter table leads add column if not exists estimate_booked boolean not null default false;
alter table leads add column if not exists estimate_date   date;
alter table leads add column if not exists sale_date       date;
alter table leads add column if not exists estimate_value  numeric(12,2);
alter table leads add column if not exists closed_revenue  numeric(12,2);
alter table leads add column if not exists manager         text;
alter table leads add column if not exists loss_reason     text;
alter table leads add column if not exists notes           text;


-- ============================================================
--  cold_calls — the Cold Calling tab, one row per caller per day.
-- ============================================================
create table if not exists cold_calls (
  call_log_id   uuid primary key default gen_random_uuid(),
  call_date     date not null,
  caller        text references crew(name) on delete set null,
  target_list   text,
  calls_made    int not null default 0,
  answered      int not null default 0,
  qualified     int not null default 0,
  appointments  int not null default 0,
  followups     int not null default 0,
  sales         int not null default 0,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists cc_date_idx on cold_calls (call_date desc);


-- ============================================================
--  google_reviews — request sent, chased, received.
-- ============================================================
create table if not exists google_reviews (
  review_id       uuid primary key default gen_random_uuid(),
  job_id          text references jobs(job_id) on delete set null,
  client_name     text not null,
  service         text,
  project_city    text,
  completed_on    date,
  request_sent    boolean not null default false,
  request_date    date,
  request_method  review_method,
  followup_sent   boolean not null default false,
  followup_date   date,
  review_received boolean not null default false,
  received_date   date,
  star_rating     int check (star_rating between 1 and 5),
  notes           text,
  created_at      timestamptz not null default now()
);


-- ============================================================
--  ad_spend — the Facebook Ads report.
-- ============================================================
create table if not exists ad_spend (
  spend_id     uuid primary key default gen_random_uuid(),
  month        date not null,          -- first of the month
  platform     text not null default 'Facebook',
  campaign     text,
  spend        numeric(12,2) not null default 0,
  impressions  int,
  clicks       int,
  leads        int not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (month, platform, campaign)
);


-- ============================================================
--  weekly_metrics — the Friday meeting scorecard, one row per week.
--  Columns match the meeting agenda exactly.
-- ============================================================
create table if not exists weekly_metrics (
  week_ending          date primary key,   -- the Sunday closing the week
  job_costing_reviewed int not null default 0,
  cold_calls_completed int not null default 0,
  calls_received       int not null default 0,
  calls_missed         int not null default 0,
  callbacks_made       int not null default 0,
  rough_estimates      int not null default 0,
  estimates_sent       int not null default 0,
  estimates_cancelled  int not null default 0,
  design_sent          int not null default 0,
  design_sold          int not null default 0,
  jobs_sold            int not null default 0,
  closed_jobs          int not null default 0,
  closed_revenue       numeric(12,2) not null default 0,
  videos_edited        int not null default 0,
  videos_posted        int not null default 0,
  blogs_written        int not null default 0,
  blogs_posted         int not null default 0,
  review_requests_sent int not null default 0,
  reviews_received     int not null default 0,
  final_photos_needed  int not null default 0,
  new_leads            int not null default 0,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- ============================================================
--  REPORT VIEWS — these replace whole workbook tabs.
-- ============================================================

-- Lead source performance. Replaces ~20 per-source tabs at once.
create or replace view lead_source_performance as
select
  coalesce(source,'Unknown')                            as source,
  count(*)                                              as leads,
  count(*) filter (where estimate_booked)               as estimates_booked,
  count(*) filter (where status = 'Won')                as won,
  count(*) filter (where status = 'Lost')               as lost,
  sum(closed_revenue)                                   as revenue,
  round(avg(closed_revenue) filter (where status='Won'), 2) as avg_job_size,
  round(100.0 * count(*) filter (where estimate_booked)
        / nullif(count(*),0), 1)                        as lead_to_estimate_pct,
  round(100.0 * count(*) filter (where status = 'Won')
        / nullif(count(*) filter (where status in ('Won','Lost')),0), 1)
                                                        as close_rate_pct
from leads
group by 1
order by count(*) desc;

-- Same thing, by month, so trends are visible.
create or replace view lead_source_monthly as
select
  date_trunc('month', lead_date)::date  as month,
  coalesce(source,'Unknown')            as source,
  count(*)                              as leads,
  count(*) filter (where status='Won')  as won,
  sum(closed_revenue)                   as revenue
from leads
group by 1,2
order by 1 desc, 3 desc;

-- Facebook Ads report with cost per lead and ROAS.
create or replace view ad_performance as
select
  a.month, a.platform, a.campaign, a.spend, a.leads,
  round(a.spend / nullif(a.leads,0), 2)                    as cost_per_lead,
  l.won,
  l.revenue,
  round(l.revenue / nullif(a.spend,0), 2)                  as roas,
  round(a.spend / nullif(l.won,0), 2)                      as cost_per_sale
from ad_spend a
left join lateral (
  select count(*) filter (where status='Won') as won,
         sum(closed_revenue)                  as revenue
  from leads
  where date_trunc('month', lead_date) = a.month
    and source ilike '%'||split_part(a.platform,' ',1)||'%'
) l on true
order by a.month desc;

-- Monthly KPI — the whole funnel in one row per month.
create or replace view monthly_kpi as
with l as (
  select date_trunc('month', lead_date)::date as month,
    count(*) as leads,
    count(*) filter (where estimate_booked)   as appointments,
    count(*) filter (where status='Won')      as sales,
    count(*) filter (where status='Lost')     as lost,
    sum(closed_revenue)                       as revenue
  from leads group by 1
),
e as (
  select date_trunc('month', coalesce(sent_date, created_at::date))::date as month,
    count(*) as estimates
  from estimates group by 1
),
a as (select month, sum(spend) as ad_spend from ad_spend group by 1)
select
  coalesce(l.month, e.month, a.month)                     as month,
  a.ad_spend,
  l.leads, l.appointments, e.estimates, l.sales, l.lost,
  l.revenue,
  round(100.0*l.appointments/nullif(l.leads,0),1)         as lead_to_appt_pct,
  round(100.0*e.estimates/nullif(l.appointments,0),1)     as appt_to_estimate_pct,
  round(100.0*l.sales/nullif(e.estimates,0),1)            as estimate_to_sale_pct,
  round(100.0*l.sales/nullif(l.leads,0),1)                as overall_close_pct,
  round(l.revenue/nullif(l.sales,0),2)                    as avg_job_size,
  round(a.ad_spend/nullif(l.leads,0),2)                   as cost_per_lead
from l
full join e on e.month = l.month
full join a on a.month = coalesce(l.month, e.month)
order by 1 desc;

-- Admin & Closer rates — who is converting.
create or replace view closer_performance as
select
  coalesce(manager,'Unassigned')                        as closer,
  count(*)                                              as leads_assigned,
  count(*) filter (where estimate_booked)               as estimates_booked,
  count(*) filter (where status='Won')                  as won,
  count(*) filter (where status='Lost')                 as lost,
  sum(closed_revenue)                                   as revenue,
  round(100.0*count(*) filter (where status='Won')
        / nullif(count(*) filter (where status in ('Won','Lost')),0),1)
                                                        as close_rate_pct,
  round(avg(closed_revenue) filter (where status='Won'),2) as avg_deal
from leads
group by 1
order by sum(closed_revenue) desc nulls last;

-- Cold calling rollup by caller.
create or replace view cold_call_performance as
select
  coalesce(caller,'Unknown') as caller,
  sum(calls_made) as calls, sum(answered) as answered,
  sum(qualified) as qualified, sum(appointments) as appointments,
  sum(sales) as sales,
  round(100.0*sum(answered)/nullif(sum(calls_made),0),1)    as answer_rate_pct,
  round(100.0*sum(appointments)/nullif(sum(answered),0),1)  as appt_rate_pct
from cold_calls group by 1 order by sum(calls_made) desc;

-- Google review funnel.
create or replace view review_performance as
select
  date_trunc('month', coalesce(request_date, completed_on))::date as month,
  count(*)                                       as jobs,
  count(*) filter (where request_sent)           as requests_sent,
  count(*) filter (where review_received)        as reviews_received,
  round(avg(star_rating) filter (where review_received),2) as avg_stars,
  round(100.0*count(*) filter (where review_received)
        / nullif(count(*) filter (where request_sent),0),1) as review_rate_pct
from google_reviews group by 1 order by 1 desc;


-- ---------- RLS ----------
alter table profiles       enable row level security;
alter table cold_calls     enable row level security;
alter table google_reviews enable row level security;
alter table ad_spend       enable row level security;
alter table weekly_metrics enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','cold_calls','google_reviews',
                           'ad_spend','weekly_metrics'] loop
    execute format('drop policy if exists team_all on %I', t);
    execute format(
      'create policy team_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop trigger if exists weekly_touch on weekly_metrics;
create trigger weekly_touch before update on weekly_metrics
  for each row execute function touch_updated_at();
