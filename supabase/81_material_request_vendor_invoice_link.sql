-- ============================================================
-- 81_material_request_vendor_invoice_link.sql
--
-- Roadmap Phase 5: connects Material Request -> Vendor Invoice (the
-- missing link in "Material Request -> Purchase -> Vendor Invoice ->
-- Job Cost" -- the Job Cost end of that chain already exists via the
-- "Use as Materials" button on Job Costing, joined through job_id;
-- this adds the piece before it, tying a specific invoice back to
-- the specific material request it was fulfilling).
--
-- This closes a real gap rather than adding a new one: the UI for
-- this already exists and has for a while -- each vendor invoice row
-- has a "link a material request" dropdown, updateViField() already
-- handles a `request_id` field, and 69_material_request_dependency_
-- counts.sql's own comment already describes "vendor_invoices.
-- request_id is ON DELETE SET NULL" -- but the column itself was
-- never actually created, so all of that has been silently inert.
-- This migration is the missing piece, named to match exactly what
-- the existing code already expects.
--
-- vendor_invoices.request_id is nullable -- most invoices, especially
-- non-material categories, have nothing to link to, and existing
-- invoices logged before this migration have no way to be matched
-- retroactively, so they stay unlinked rather than guessed.
--
-- Extends material_request_summary (47_material_requests.sql) with
-- invoice_count/invoiced_total, the same rollup pattern
-- job_vendor_invoice_totals already uses at the job level -- and
-- which the Materials block on every job's Overview, the Material
-- Requests list, and the Job Costing materials note already read
-- (r.invoice_count / r.invoiced_total), also silently inert until now.
-- Adding columns to the end of a view via CREATE OR REPLACE VIEW is
-- safe in Postgres (unlike functions with OUT parameters) and
-- doesn't require dropping it first.
--
-- Purely additive. No existing vendor_invoices or material_requests
-- row is touched.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table vendor_invoices add column if not exists request_id uuid references material_requests(request_id) on delete set null;
create index if not exists vendor_invoices_request_id_idx on vendor_invoices (request_id);

create or replace view material_request_summary as
select
  mr.request_id, mr.job_id, j.client_name, j.client_id,
  mr.project_type, mr.status, mr.submitted_at, mr.target_delivery_date,
  count(mi.item_id)                                    as line_count,
  count(mi.item_id) filter (where mi.quantity is not null) as lines_filled,
  count(mi.item_id) filter (where mi.ordered)          as lines_ordered,
  count(mi.item_id) filter (where mi.received)         as lines_received,
  count(vi.invoice_id)                                 as invoice_count,
  coalesce(sum(vi.total_amount), 0)                    as invoiced_total
from material_requests mr
join jobs j on j.job_id = mr.job_id
left join material_request_items mi on mi.request_id = mr.request_id
left join vendor_invoices vi on vi.request_id = mr.request_id
group by mr.request_id, j.client_name, j.client_id;

-- verify -- expect a request_id column now present on vendor_invoices, all null
select count(*) as invoices, count(request_id) as linked
from vendor_invoices;
