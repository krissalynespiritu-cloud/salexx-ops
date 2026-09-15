-- ============================================================
-- 52_link_vendor_invoices_to_material_requests.sql
--
-- Connects Vendor Payables to Material Requests instead of building
-- a third "materials tracker" that would just duplicate the same
-- facts. A vendor invoice can now be tagged with the material
-- request it's paying for; the request then shows how many invoices
-- and how many dollars have come in against it.
--
-- Run any time. Safe to re-run.
-- ============================================================

alter table vendor_invoices add column if not exists request_id uuid references material_requests(request_id) on delete set null;
create index if not exists vendor_invoices_request_idx on vendor_invoices (request_id);

-- Redefine material_request_summary to add the invoice rollup.
-- Item and invoice aggregates are computed in separate lateral
-- subqueries so joining both one-to-many tables in one view can't
-- fan out and double-count either side.
create or replace view material_request_summary as
select
  mr.request_id, mr.job_id, j.client_name, j.client_id,
  mr.project_type, mr.status, mr.submitted_at, mr.target_delivery_date,
  coalesce(mi_agg.line_count, 0)      as line_count,
  coalesce(mi_agg.lines_filled, 0)    as lines_filled,
  coalesce(mi_agg.lines_ordered, 0)   as lines_ordered,
  coalesce(mi_agg.lines_received, 0)  as lines_received,
  coalesce(vi_agg.invoice_count, 0)   as invoice_count,
  coalesce(vi_agg.invoiced_total, 0)  as invoiced_total
from material_requests mr
join jobs j on j.job_id = mr.job_id
left join lateral (
  select
    count(*)                                        as line_count,
    count(*) filter (where quantity is not null)     as lines_filled,
    count(*) filter (where ordered)                  as lines_ordered,
    count(*) filter (where received)                 as lines_received
  from material_request_items mi
  where mi.request_id = mr.request_id
) mi_agg on true
left join lateral (
  select
    count(*)                as invoice_count,
    coalesce(sum(total_amount), 0) as invoiced_total
  from vendor_invoices v
  where v.request_id = mr.request_id
) vi_agg on true;

-- verify
select
  (select count(*) from vendor_invoices where request_id is not null) as invoices_linked,
  (select count(*) from material_request_summary where invoice_count > 0) as requests_invoiced;
