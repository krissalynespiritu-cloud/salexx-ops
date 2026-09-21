-- ============================================================
-- 63_create_client_natalya_feoktistov.sql
--
-- Phase 2A follow-up: one confirmed unmatched record from the
-- duplicate-review pass. Natalya Feoktistov's Facebook Ads lead
-- (real lead_id, phone + email) matched zero of the 150 existing
-- clients -- tier 7 of the resolveClientForCreate hierarchy
-- documented in index.html: "no candidate at all -> create a
-- fresh client." No name-similarity guessing involved.
--
-- Creates one client, links her lead and her accepted estimate
-- (monday_id 12779463558) to it. Does not touch SLX-165, SLX-166,
-- Lexi, Phil/Phil Rose, or the Kathy group -- those stay untouched
-- per CLAUDE.md.
--
-- Applied and verified 2026-09-21: 1 client row, 1 linked lead,
-- 1 linked estimate.
--
-- Safe to re-run: guarded by "not exists" / "client_id is null".
-- ============================================================

insert into clients (name, email, phone, first_source)
select 'Natalya Feoktistov', 'natalyafeoktistov@hotmail.com', '15039842327', 'Facebook Ads'
where not exists (
  select 1 from clients where lower(trim(name)) = 'natalya feoktistov'
);

update leads l set client_id = c.client_id
from clients c
where lower(trim(c.name)) = 'natalya feoktistov'
  and l.client_id is null
  and lower(trim(l.name)) = 'natalya feoktistov'
  and lower(trim(l.email)) = 'natalyafeoktistov@hotmail.com';

update estimates e set client_id = c.client_id
from clients c
where lower(trim(c.name)) = 'natalya feoktistov'
  and e.client_id is null
  and e.monday_id = '12779463558';

-- verify: expect 1 client, 1 linked lead, 1 linked estimate
select
  (select count(*) from clients  where lower(trim(name)) = 'natalya feoktistov')                         as client_rows_expect_1,
  (select count(*) from leads    where lower(trim(name)) = 'natalya feoktistov' and client_id is not null) as lead_linked_expect_1,
  (select count(*) from estimates where monday_id = '12779463558' and client_id is not null)               as estimate_linked_expect_1;
