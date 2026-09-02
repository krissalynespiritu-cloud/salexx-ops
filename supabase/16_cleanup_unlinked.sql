-- ============================================================
--  Salexx Ops Hub — resolve the 31 unlinked jobs
--
--  These came from the old spreadsheets, not the Monday board.
--  Three groups:
--
--    LINK    truncated names that ARE Monday clients, matched on
--            price to the cent (Jenni B -> Jenni Bee, etc.)
--    KEEP    genuine older jobs with real contract values that
--            predate the Monday board — deleting these loses history
--    DELETE  empty rows scraped from the Time Tracker's Project
--            column. No price, no trade, no hours, no costs.
--
--  Run AFTER 15_link_pending.sql.
--
--  The 8 rows this file used to DELETE (SLX-086, 089, 030, 039, 032,
--  035, 091, 028 — empty Time Tracker placeholders with no price, no
--  trade, no data) are no longer in 02_seed.sql at all, so on a fresh
--  rebuild this DELETE is a guarded no-op. Left in place rather than
--  removed: harmless, and it's still correct documentation of why
--  those rows don't exist.
-- ============================================================

-- ---------- LINK: exact price matches to Monday ----------
update jobs set monday_item_id = '12473365529'
  where job_id = 'SLX-078' and monday_item_id is null;   -- Jenni B      -> Jenni Bee        $10,228.76
update jobs set monday_item_id = '12531946607'
  where job_id = 'SLX-079' and monday_item_id is null;   -- Rhonda W     -> Rhonda Wilson    $13,700.00
update jobs set monday_item_id = '10741651039'
  where job_id = 'SLX-018' and monday_item_id is null;   -- Madeline     -> Madeline Durand  $37,370.88

-- Angelina R (SLX-028) is an empty duplicate of Angelina Rockelman
-- (SLX-029), which 15_link_pending already linked. Deleted below.


-- ---------- DELETE: empty rows from the Time Tracker ----------
-- Guarded: only removes rows with no price, no trade, no Monday link,
-- no hours and no costs. If any of that is false, the row survives.
delete from jobs j
where j.job_id in (
  'SLX-086',  -- Carol        (Monday has Carol Rinaldi $10,393.88 — separate, already linked)
  'SLX-089',  -- Darlene      (Monday has Darlene Lufkin and Darlene (Paint) — both linked)
  'SLX-030',  -- Jayme        (no Monday match, no data at all)
  'SLX-039',  -- Kathy        (ambiguous: Kathy Whitney or Kathy Turner — both linked)
  'SLX-032',  -- OFF          (not a client)
  'SLX-035',  -- Sara         (ambiguous across 4 Monday clients — all linked)
  'SLX-091',  -- Teresa       (Monday has Jesus Santana/Teresa — already linked)
  'SLX-028'   -- Angelina R   (duplicate of SLX-029)
)
and j.monday_item_id is null
and j.contract_price is null
and (j.job_type is null or j.job_type = '')
and not exists (select 1 from time_entries t where t.job_id = j.job_id)
and not exists (select 1 from job_costs   c where c.job_id = j.job_id);


-- ---------- KEEP, but flag ----------
-- Everything still unlinked after this is a real job that predates the
-- Monday board. Steve Langella $92,000, Santiago Segarra $35,250,
-- Jessica Bronson $29,600 — real revenue, real history. They stay.
create or replace view pre_monday_jobs as
select job_id, client_name, stage, job_type, contract_price,
       sold_date, completed_date
from jobs
where monday_item_id is null
order by contract_price desc nulls last;

-- Two rows that need a human decision, not a rule:
--   SLX-044 "Dundee house;"  no price, no trade, but HAS a cost row
--                            attached — so something real was spent.
--   SLX-093 "Jennie Clark"   $10,200.75 Concrete/Hardscape, genuinely
--                            not on the Monday board at all.
create or replace view needs_your_call as
select j.job_id, j.client_name, j.stage, j.contract_price, j.job_type,
       (select count(*) from job_costs c where c.job_id = j.job_id) as cost_rows,
       (select coalesce(sum(amount),0) from job_costs c where c.job_id = j.job_id) as cost_total
from jobs j
where j.job_id in ('SLX-044','SLX-093');
