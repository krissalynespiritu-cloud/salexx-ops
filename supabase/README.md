# Salexx Ops Hub — database

Run these in order against a fresh Supabase project to rebuild the database
from nothing. Every file is safe to re-run unless its own header says
otherwise. Run order matches filename order — 01 through 31, no gaps, no
duplicate numbers.

**One exception to "just run them in order":** `26_add_labor_category.sql`
must be run on its own, in its own transaction, before
`27_import_real_costs.sql`. Postgres will not let a newly added enum value
be used in the same transaction that created it, and 27 inserts cost rows
using the `Labor` category that 26 adds. Run 26, let it commit, then run 27.

| # | File | What it does |
|---|------|---------------|
| 01 | `01_schema.sql` | Core tables, enums, RLS policies. |
| 02 | `02_seed.sql` | 84 real jobs recovered from the old spreadsheets. |
| 03 | `03_phase1.sql` | First round of app features on top of the seed. |
| 04 | `04_phase2.sql` | Second round of app features. |
| 05 | `05_phase3.sql` | Third round of app features. |
| 06 | `06_lead_import.sql` | Imports historical leads. |
| 07 | `07_crew_rates.sql` | Real per-person crew pay rates, replacing a flat hourly rate. |
| 08 | `08_payroll.sql` | Biweekly payroll periods. |
| 09 | `09_subcontractors.sql` | Subcontractor directory. |
| 10 | `10_sub_payments.sql` | Subcontractor payments, wired into job costing. |
| 11 | `11_align_stages.sql` | Renames 4 job stages to match Monday's wording exactly. |
| 12 | `12_job_stage_list.sql` | View exposing the job_stage enum in board order, for the Project Delivery board. |
| 13 | `13_monday_sync.sql` | Imports all 132 items from the Monday board; auto-links unambiguous matches, leaves ambiguous repeat-client rows unmatched on purpose. |
| 14 | `14_resolve_pending_matches.sql` | Hand-resolves the 8 ambiguous matches from 13: 7 link to an existing job, 10 insert as new projects. |
| 15 | `15_link_pending.sql` | Links a further batch of held-back jobs by price and trade. |
| 16 | `16_cleanup_unlinked.sql` | Links truncated-name spreadsheet jobs to their real Monday client; deletes empty leftover rows (no-op now that 02 no longer inserts them). |
| 17 | `17_merge_duplicates.sql` | Safety net: merges any pair of rows that ended up sharing one Monday item. Should find nothing on a fresh rebuild. |
| 18 | `18_clients.sql` | Builds the clients table from every distinct job client name; lifetime value, repeat-client, and source-value views. |
| 19 | `19_reconcile.sql` | Final sweep: Monday wins on every linked job's fields, inserts any Monday item still missing a job, relinks clients, adds audit views. |
| 20 | `20_import_updates.sql` | Imports the 60 Monday update notes (the "why" behind stalled jobs) onto their matching jobs. |
| 21 | `21_avatars_storage.sql` | Storage bucket for profile photos. Independent of everything above — run any time. |
| 22 | `22_costing_reviewed.sql` | Adds a done/not-done checkbox to each job, separate from its delivery stage. Independent — run any time. |
| 23 | `23_admin_tracker.sql` | Admin Tracker: imports 153 real historical daily rows, adds `estimate_booked_date` so future days compute live from real leads instead. Independent — run any time. |
| 24 | `24_closer_tracker.sql` | Closer Tracker: imports 151 real historical daily rows, adds `shown`/`shown_date` so future days compute live from real leads (`sale_date`/`closed_revenue` already existed, unused until now). Independent — run any time. |
| 25 | `25_fix_cost_attribution.sql` | Reattaches four seed cost rows that kept old SLX ids after the seed was regenerated — moving Adriana Britton's $14,214 off Elda Hernandez's job (the −186% margin), and three smaller ones. Matched by client name and exact amount. Adds `jobs_costing_more_than_revenue` and `seeded_cost_check` verify views. Run AFTER 24. Safe to re-run. |
| 26 | `26_add_labor_category.sql` | Adds a `Labor` value to the `cost_category` enum, for historical jobs whose only labor record is the Job Costing sheet (no time entries). **Run on its own, before 27** — see the note above. Safe to re-run. |
| 27 | `27_import_real_costs.sql` | Imports the real Job Costing sheet: 95 cost rows across 69 jobs, $341,230 total, Materials and Labor per job. Matched by client name; Labor is skipped for any job that already has logged hours so nothing double-counts. Unmatched rows surface in `costing_import_unmatched`. Run AFTER 26. Safe to re-run. |
| 28 | `28_overhead_18pct.sql` | Raises the company overhead rate from 12% to 18%: new column defaults on `jobs` and `settings`, plus every existing job still at exactly 12.00. Deliberate per-job overrides are left alone. Weighted margin on the dashboard drops a few points afterward — the old rate under-charged overhead. Run AFTER 27. Safe to re-run. |
| 29 | `29_editable_job_costing.sql` | Adds `jobs.manual_hours` and redefines `job_financials` so a `Labor` cost row counts as in-house labor and a `Subcontractors` cost row counts as subcontractor cost (both were previously mishandled). Logged crew time still wins over the typed figures. Backs the editable contract price / in-house labor / sub labor / hours fields on the Job Costing page. Run AFTER 28. Safe to re-run. |
| 30 | `30_reconcile_from_sheet.sql` | Makes the database match the Job Costing sheet. Changes two formulas in `job_financials`: revenue = contract + change orders + discounts (discounts stored negative, as the sheet enters them), and overhead = 18% of **direct cost** rather than of revenue. Sets `overhead_pct` to 18 on every job. Reconciles contract price / change orders / discounts / Materials / Labor / Subcontractor cost for 83 jobs from the sheet, and creates two jobs that were sheet-only (Robyn Bryant, Angelina Rockelman patio cover). Skips SLX-143. Run AFTER 29. Safe to re-run. This supersedes 28. |
| 31 | `31_design_tracker.sql` | Design Sold Tracker: adds `leads.design_sent_date` / `design_sold_date`, imports the 123 daily rows from the Design Sold Tracker sheet, and adds the `design_daily` view (import + live). Read-only page in the app, same as Admin/Closer trackers. Run AFTER 30 (independent, but keeps the numbering order). Safe to re-run. |

## Why the order matters

Files 13–20 all touch the same `jobs` rows, and getting the order wrong is
exactly what caused the duplicate rows `17_merge_duplicates.sql` has to
clean up: `19_reconcile.sql` auto-inserts any Monday item without a
matching job, so it has to run **after** every step that might still claim
one (14 through 18) — otherwise reconcile grabs a Monday item first and a
later linking step creates a second row for the same project.

Three Monday items are deliberately never auto-inserted by
`19_reconcile.sql`, even on a fresh rebuild: Casey Wixson's two rows look
like one job entered twice on Monday, and Sam Sabin has one row that's
entirely blank. Both need a human decision (or a fix on the Monday board
itself), not a guess.
