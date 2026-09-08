-- ============================================================
-- 36_vendor_invoices.sql
--
-- Vendor Payables: a dedicated tracker for the supplier invoices
-- that arrive by email (Parr Lumber, Lakeside Lumber, Sherwin
-- Williams, Home Depot, SRS, QXO and the rest). Modeled on the
-- Vendor Payables Tracker spreadsheet.
--
-- Job Costing keeps its single editable Materials number. This is
-- the detail behind it: each invoice can be assigned to a job, and
-- job_vendor_invoice_totals rolls the assigned invoices up so the
-- Job Costing subtab can show "invoices logged for this job" next
-- to the editable figure without overwriting it.
--
-- Run any time. Safe to re-run.
-- ============================================================

create table if not exists vendor_invoices (
  invoice_id     uuid primary key default gen_random_uuid(),
  date_added     date not null default current_date,
  bill_date      date,
  due_date       date,
  vendor         text not null,
  job_id         text references jobs(job_id) on delete set null,
  category       text not null default 'Materials',
  invoice_number text,
  total_amount   numeric(12,2) not null default 0,
  amount_paid    numeric(12,2) not null default 0,
  payment_status text not null default 'Pending',
  portal         text,
  upload_status  text not null default 'Not Logged',
  invoice_link   text,
  next_step      text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table vendor_invoices enable row level security;

drop policy if exists team_all on vendor_invoices;
create policy team_all on vendor_invoices for all to authenticated
  using (true) with check (true);

drop trigger if exists vendor_invoices_touch on vendor_invoices;
create trigger vendor_invoices_touch before update on vendor_invoices
  for each row execute function touch_updated_at();

create index if not exists vendor_invoices_job_idx    on vendor_invoices (job_id);
create index if not exists vendor_invoices_vendor_idx on vendor_invoices (vendor);
create index if not exists vendor_invoices_status_idx on vendor_invoices (payment_status);

-- company-wide payables summary
create or replace view vendor_payables_summary as
select
  count(*)                                                             as invoice_count,
  coalesce(sum(total_amount), 0)                                       as billed_total,
  coalesce(sum(amount_paid), 0)                                        as paid_total,
  coalesce(sum(total_amount - amount_paid), 0)                         as balance_total,
  coalesce(sum(total_amount - amount_paid)
    filter (where payment_status <> 'Paid'), 0)                        as open_balance,
  coalesce(sum(total_amount - amount_paid)
    filter (where payment_status <> 'Paid'
      and due_date is not null and due_date < current_date), 0)        as overdue_balance,
  count(*) filter (where payment_status <> 'Paid'
    and total_amount - amount_paid > 0.005)                            as open_count,
  count(*) filter (where upload_status <> 'Logged')                    as not_logged_count
from vendor_invoices;

-- per-job rollup, used on the Job Costing subtab
create or replace view job_vendor_invoice_totals as
select
  j.job_id,
  count(v.invoice_id)                                                  as invoice_count,
  coalesce(sum(v.total_amount), 0)                                     as invoiced_total,
  coalesce(sum(v.total_amount) filter (where v.category = 'Materials'), 0) as invoiced_materials,
  coalesce(sum(v.total_amount - v.amount_paid), 0)                     as invoiced_balance
from jobs j
left join vendor_invoices v on v.job_id = j.job_id
group by j.job_id;

-- verify
select
  (select count(*) from vendor_invoices)                as invoice_rows,
  (select round(open_balance) from vendor_payables_summary) as company_open_balance;
