-- ============================================================
-- 42_link_more_leads.sql
--
-- Second pass linking leads to jobs. Migration 38 linked 21 by a
-- strict match. This adds:
--   1. exact match on the name with all punctuation and spaces
--      removed, picking the job closest in date to the lead
--   2. first-name + last-name match for whatever is still unlinked,
--      again date-closest, and only when exactly one job qualifies
--
-- For every newly linked lead whose job is priced, the lead is
-- marked Won with the job's revenue and sold date, and the job's
-- lead_source is stamped from the lead (only where it is blank).
--
-- Lost leads are never linked. Run any time. Safe to re-run.
-- ============================================================

-- helper: normalized name (lowercase, alphanumeric only)
-- inline as lower(regexp_replace(x,'[^a-zA-Z0-9]','','g'))

-- 1. exact normalized-name match, closest job by date
update leads l set job_id = m.job_id
from (
  select distinct on (x.lead_id) x.lead_id, x.job_id
  from (
    select l.lead_id, j.job_id,
      abs(extract(epoch from (coalesce(j.sold_date, j.completed_date, l.lead_date)::timestamp - l.lead_date::timestamp))) as gap
    from leads l
    join jobs j
      on lower(regexp_replace(l.name,'[^a-zA-Z0-9]','','g')) = lower(regexp_replace(j.client_name,'[^a-zA-Z0-9]','','g'))
    where l.job_id is null and l.status <> 'Lost' and length(regexp_replace(l.name,'[^a-zA-Z0-9]','','g')) >= 4
  ) x
  order by x.lead_id, x.gap nulls last
) m
where l.lead_id = m.lead_id;

-- 2. first + last token match for the rest (only when one job qualifies)
update leads l set job_id = m.job_id
from (
  select x.lead_id, x.job_id
  from (
    select l.lead_id,
      min(j.job_id) as job_id,
      count(distinct j.job_id) as n
    from leads l
    join jobs j
      on split_part(lower(l.name),' ',1) = split_part(lower(j.client_name),' ',1)
     and split_part(lower(l.name),' ',2) <> ''
     and lower(regexp_replace(split_part(l.name,' ',array_length(regexp_split_to_array(l.name,'\s+'),1)),'[^a-zA-Z0-9]','','g'))
       = lower(regexp_replace(split_part(j.client_name,' ',array_length(regexp_split_to_array(j.client_name,'\s+'),1)),'[^a-zA-Z0-9]','','g'))
    where l.job_id is null and l.status <> 'Lost'
    group by l.lead_id
  ) x
  where x.n = 1
) m
where l.lead_id = m.lead_id;

-- 3. stamp job lead_source from the linked lead (blank only)
update jobs j set lead_source = l.source
from leads l
where l.job_id = j.job_id and j.lead_source is null and l.source is not null;

-- 4. mark newly linked leads Won when the job is priced
update leads l set
  status = 'Won',
  closed_revenue = m.revenue,
  sale_date = coalesce(l.sale_date, m.sold_date)
from job_margins m
where l.job_id = m.job_id
  and l.status <> 'Lost'
  and m.revenue is not null
  and coalesce(m.unpriced, false) = false
  and (l.status <> 'Won' or l.closed_revenue is null);

-- verify
select
  (select count(*) from leads where job_id is not null)          as leads_linked,
  (select count(*) from leads where status = 'Won')              as leads_won,
  (select count(*) from jobs  where lead_source is not null)     as jobs_with_source;

-- review: the links this migration produced
select l.name as lead, l.source, l.status, l.job_id, j.client_name as job_client, j.sold_date
from leads l join jobs j on j.job_id = l.job_id
order by l.sale_date desc nulls last, l.name;
