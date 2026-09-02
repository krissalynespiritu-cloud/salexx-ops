-- ============================================================
--  Salexx Ops Hub — merge rows that share one Monday item
--
--  Repeat clients are NOT the problem here. Elda Hernandez, David
--  Morton, Kurt Lorenzen, Puck Ja, Lexi Vandomelen and Sam Sabin each
--  have two jobs with two DIFFERENT Monday ids — two real projects for
--  a returning customer. Those stay exactly as they are.
--
--  The problem is three pairs that share the SAME monday_item_id:
--  10_reconcile inserted them from the board, then 13_cleanup linked
--  the older spreadsheet row to the same item. One project, two rows.
--
--  This keeps the row carrying real work (hours, costs, notes) and
--  removes the empty twin — moving any child records across first so
--  nothing is orphaned.
--
--  Run AFTER 13_cleanup_unlinked.sql.
-- ============================================================

-- Which row to keep per duplicated Monday id: prefer the one with the
-- most attached work, then the oldest job_id.
create temporary table dup_resolution as
with dupes as (
  select monday_item_id
  from jobs
  where monday_item_id is not null
  group by monday_item_id
  having count(*) > 1
),
scored as (
  select
    j.job_id, j.monday_item_id,
    (select count(*) from time_entries t where t.job_id = j.job_id)
    + (select count(*) from job_costs   c where c.job_id = j.job_id)
    + (select count(*) from job_updates u where u.job_id = j.job_id)
    + (select count(*) from payments    p where p.job_id = j.job_id) as work,
    substring(j.job_id from 5)::int as num
  from jobs j
  join dupes d on d.monday_item_id = j.monday_item_id
)
select
  monday_item_id,
  (array_agg(job_id order by work desc, num asc))[1] as keep_id,
  (array_agg(job_id order by work desc, num asc))[2:] as drop_ids
from scored
group by monday_item_id;

-- Move any child records onto the surviving job.
update time_entries t set job_id = r.keep_id
from dup_resolution r where t.job_id = any(r.drop_ids);

update job_costs c set job_id = r.keep_id
from dup_resolution r where c.job_id = any(r.drop_ids);

update job_updates u set job_id = r.keep_id
from dup_resolution r where u.job_id = any(r.drop_ids);

update payments p set job_id = r.keep_id
from dup_resolution r where p.job_id = any(r.drop_ids);

-- Carry across any field the survivor is missing.
update jobs k set
  contract_price   = coalesce(k.contract_price,   d.contract_price),
  job_type         = coalesce(nullif(k.job_type,''),     d.job_type),
  address_city     = coalesce(nullif(k.address_city,''), d.address_city),
  sold_date        = coalesce(k.sold_date,        d.sold_date),
  completed_date   = coalesce(k.completed_date,   d.completed_date),
  drive_folder_url = coalesce(nullif(k.drive_folder_url,''), d.drive_folder_url),
  permit_required  = coalesce(k.permit_required,  d.permit_required),
  crew             = coalesce(k.crew,             d.crew)
from dup_resolution r
join jobs d on d.job_id = any(r.drop_ids)
where k.job_id = r.keep_id;

-- Now the empty twins can go.
delete from jobs j
using dup_resolution r
where j.job_id = any(r.drop_ids);


-- ---------- verify ----------
-- Should return zero rows.
create or replace view duplicate_monday_ids as
select monday_item_id, count(*) as job_count,
       string_agg(job_id || ' ' || client_name, ' | ' order by job_id) as jobs
from jobs
where monday_item_id is not null
group by monday_item_id
having count(*) > 1;

-- Repeat clients, confirmed genuine: same name, DIFFERENT Monday ids.
create or replace view genuine_repeat_clients as
select client_name, count(*) as projects,
       sum(contract_price) as total_value,
       string_agg(job_id || ' ' || coalesce(job_type,'?'), ' | ' order by sold_date) as projects_list
from jobs
where client_name is not null
group by client_name
having count(*) > 1
order by sum(contract_price) desc nulls last;
