-- ============================================================
--  Salexx Ops Hub — link the held-back repeat-client jobs
--
--  These are the jobs stuck in "Designs Sold" with monday_item_id
--  NULL. They were held back during the earlier sync because several
--  Monday rows shared a client name and the matcher refused to guess.
--
--  Each link below was resolved by contract price and trade, not by
--  name. Once linked, Monday's stage flows through and they leave
--  "Designs Sold" — and their orphaned Updates finally attach.
--
--  Run AFTER 11_import_updates.sql, then re-run 10 and 11.
-- ============================================================

-- ---------- exact price + trade matches ----------
update jobs set monday_item_id = '11683576845' where job_id = 'SLX-052';  -- Elda Hernandez, Painting $5,175.43
update jobs set monday_item_id = '11094458186' where job_id = 'SLX-047';  -- Kurt Lorenzen, Painting $8,415.90
update jobs set monday_item_id = '12401129682' where job_id = 'SLX-090';  -- Lexi Vandomelen, Interior + Staircase $3,777.50
update jobs set monday_item_id = '12741976294' where job_id = 'SLX-081';  -- Marlene Miller, Exterior Painting $13,171.09
update jobs set monday_item_id = '12799650167' where job_id = 'SLX-082';  -- Puck Ja, Exterior Painting $14,275.00
update jobs set monday_item_id = '11484568925' where job_id = 'SLX-077';  -- Sarah Lyn Lawton, Painting $20,415.66

-- ---------- matched on trade, price differs ----------
-- App has $5,365.45 for "patio cover"; Monday's Patio Cover row says
-- $14,497.32. Same project, different figure — Monday wins on price
-- only where the app has none, so check this one.
update jobs set monday_item_id = '11187519510' where job_id = 'SLX-029';  -- Angelina Rockelman, Patio Cover

-- App has $13,375.25; Monday's two Roofing rows are $5,775.73 and
-- $14,070.25. Neither matches. Linked to the larger, closer figure.
update jobs set monday_item_id = '12131990514' where job_id = 'SLX-059';  -- David Morton, Roofing $14,070.25

-- Sam Sabin's app job has no price. Monday's only real row is Roofing
-- $16,810.56; the other is completely blank.
update jobs set monday_item_id = '12130103208' where job_id = 'SLX-069';  -- Sam Sabin, Roofing $16,810.56

-- Casey Wixson deliberately left unlinked: both Monday rows show the
-- same $32,925.65 and the same dates, differing only by trade. That
-- looks like one Siding + Painting job entered twice on the board.
-- Fix it on Monday first, then link.

-- ---------- what's still unlinked afterwards ----------
create or replace view still_unlinked as
select
  j.job_id, j.client_name, j.stage, j.contract_price, j.job_type,
  (select count(*) from time_entries t where t.job_id = j.job_id) as hours_rows,
  (select count(*) from job_costs   c where c.job_id = j.job_id) as cost_rows
from jobs j
where j.monday_item_id is null
order by j.client_name;
