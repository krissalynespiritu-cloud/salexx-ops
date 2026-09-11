# Salexx Ops Hub — database

Run these in order against a fresh Supabase project to rebuild the database
from nothing. Every file is safe to re-run unless its own header says
otherwise. Run order matches filename order — 01 through 36, no gaps, no
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
| 31 | `31_design_tracker.sql` | Design Sold Tracker: adds `leads.design_sent_date` / `design_sold_date`, imports the 123 daily rows (via `generate_series`) from the Design Sold Tracker sheet, and adds the `design_daily` view (import + live). Read-only page in the app, same as Admin/Closer trackers. Run AFTER 30 (independent, but keeps the numbering order). Safe to re-run. |
| 32 | `32_finish_reconcile.sql` | Cleanup: the ~20 jobs that migration 30 did not fully apply because the Supabase SQL editor mangled the large paste. Standalone one-line revenue and cost-row statements for just those jobs. Run AFTER 30. Safe to re-run. |
| 33 | `33_drop_phantom_subs.sql` | Removes two `sub_payments` rows (Adriana Britton $3,500, Jacob Bohanam $730) that migration 25 moved from misfiled jobs. The sheet already counts those as Labor, so they were double-counting in `material_cost`. Run AFTER 32. Safe to re-run. |
| 34 | `34_normalize_job_types.sql` | Maps the 45 free-text job types to a fixed list (Roofing, Siding, Painting, Decking, Windows/Doors, Gutters, Concrete/Hardscape, Patio Cover, Fencing, Flooring, Multi-Trade, Other). Multi-trade combos go to Multi-Trade. The job type field in the app is a dropdown now. Run any time. Safe to re-run. |
| 35 | `35_dedupe_overhead.sql` | `04_phase2.sql` had no unique key on `overhead_expenses`, so re-runs inserted the whole seed list again (the table holds ~3x the real line items and `overhead_summary` / `overhead_rate_check` are inflated). Keeps one row per (item, category) and adds the unique key. Backs the new Overhead page. Run any time. Safe to re-run. |
| 36 | `36_vendor_invoices.sql` | Vendor Payables: a `vendor_invoices` table for the supplier invoices that arrive by email, plus `vendor_payables_summary` (company totals) and `job_vendor_invoice_totals` (per-job rollup shown next to the editable Materials figure on Job Costing). Backs the Vendor Payables page. Run any time. Safe to re-run. |
| 37 | `37_import_crew_time.sql` | Imports the Team Time Tracker: 448 crew time rows (Feb to Sep 2026) for Carlos, Tito, Roberto, Ronald, Avelino, Edy, Salvador, matched to 45 jobs by client name, repeat clients split by date. About 4,245 hours. Since `job_financials` prefers logged hours over a typed Labor figure, those 45 jobs now cost labor at each person's crew rate; the old reconciled Labor cost rows stay but are ignored while hours are present. "Jayme" (2 rows, no matching job) is skipped. Re-runnable via its `entered_by = 'ttt-import'` tag. **The Supabase SQL editor truncates this paste (~168 rows). If the verify does not say PASS, run `37_part1.sql` through `37_part6.sql` instead** — six self-contained, re-runnable slices by job (~75 rows each), order independent. Run any time. Safe to re-run. |
| 38 | `38_lead_source_report.sql` | Backs the rebuilt Lead Source Report page. Documents a one-time backfill applied through the app from the Sales Tracking Dashboard workbook: 114 leads marked estimate booked, 106 marked shown, 21 linked to their won job (stamping `jobs.lead_source`, 15 marked Won with the job's revenue). Contains the reproducible parts: the `Estimated` status bump, the lead-to-job `lead_source` stamp, and the Facebook Ads monthly spend (Jan-Aug 2026) into `ad_spend`. Run any time. Safe to re-run. |
| 39 | `39_performance_dashboard.sql` | Backs the new Performance page (weekly/monthly executive dashboard from the Report Monthly/Weekly workbook). Adds 11 columns to `weekly_metrics` (jobs costed, appointments set, calls answered, missed returned, estimates accepted/invoiced, videos to edit/ready, first-time calls answered/missed, still needs costing); adds `estimate_status_monthly` (the Estimate $ Status block) and `social_followers` (the Followers row). Imports 10 weeks of Weekly Entry (Jul to Sep 2026) and 3 months of Estimate $ Status. Run any time. Safe to re-run. |
| 40 | `40_repair_rls.sql` | Recovery script, not part of a normal rebuild. Run only if the app reads 0 rows from every base table while the views still return data — that means RLS was switched off and the `team_all` policies plus table grants were lost. Re-enables RLS, re-creates `team_all` on every public table, and re-grants `anon`/`authenticated`/`service_role`. Touches no data. Safe to re-run. |
| 42 | `42_link_more_leads.sql` | Second pass linking leads to jobs (migration 38 linked 21). Exact match on the name stripped of punctuation and spaces, picking the job closest in date, then a first-name plus last-name match where exactly one job qualifies. Newly linked leads whose job is priced are marked Won with the job's revenue and sold date, and the job's `lead_source` is stamped. Lost leads are skipped. Ends with a review SELECT of every link. Run any time. Safe to re-run. |
| 41 | `41_estimates_tracker.sql` | Imports the Estimates Tracker board (Monday) and backs the reworked Estimates page — a follow-up pipeline grouped by stage. Adds `stage` / `pipeline_status` / `requested_date` / `monday_id` to `estimates`, imports 149 estimates across 6 stages (Rough Estimate Needed, Estimate Needed, Sent, Follow Up Needed, Accepted, Lost / No Response), folds the latest follow-up note into `notes`, and links each to its lead and job by client name. **If the SQL editor truncates the paste, run `41_part1.sql` then `41_part2.sql`.** Run any time. Safe to re-run. |
| 43 | `43_overhead_rebuild_2026.sql` | Fixes the Overhead page. `overhead_expenses` had been seeded three times (108 rows for 36 items — migration 35's fix was never run), so the app showed ~$1.41M/yr of overhead instead of ~$0.47M. Clears the table and rebuilds it from the OH Tracker 2026 sheet: 36 line items, **$472,743.09/yr** total, payroll rows flagged out of the job-overhead rate. Adds the unique `(item, category)` key so 04 can't re-triple. Supersedes migration 35. Wrapped in `begin/commit`; select the whole file before running. Run any time. Safe to re-run. |
| 44 | `44_overhead_rate_window.sql` | Redefines `overhead_rate_check` so the revenue denominator is the trailing 12 months (jobs completed, or sold if not yet completed, in the last year) instead of all-time booked revenue — the old basis compared one year of overhead to ~2+ years of revenue and showed a ~6.5% suggested rate. Appends `overhead_pct_all_in` (~21%, full overhead ÷ trailing-12mo revenue — the figure that lines up against the 18% charged) and `booked_revenue_window`. View only, no data. Run any time. Safe to re-run. |
| 45 | `45_project_files.sql` | Phase 1 of project file storage. `project_files` table + private `project-files` storage bucket, backing the rebuilt Files tab on each job (upload invoices / permits / contracts / photos, grouped into the six folders the Monday/Zapier automation creates in Drive: Materials, Estimate Details, Contracts, Permits, Project Photos/Videos, Accounting). `drive_status` starts `pending`; Phase 2's Zapier zap copies each file to the matching Drive subfolder and flips it to `synced`. Run any time. Safe to re-run. |
| 46 | `46_project_files_sync_fields.sql` | Phase 2 of project file storage. Adds `job_drive_url` (the job's Drive folder link, copied onto each row at upload) and `download_url` (a 7-day signed URL to the file) to `project_files` — the two things the Zapier zap needs to push a file into Drive without any lookup. Zap build steps are in `docs/zapier-drive-sync.md`. Run any time. Safe to re-run. |
| 47 | `47_material_requests.sql` | Rebuilds the Google "Material Handoff Form" in the app. `material_requests` (one per job — project type, status Draft/Submitted/Ordered/Received, spec fields as JSON, checklist, supplier, delivery date) + `material_request_items` (quantity lines with ordered/received checkboxes) + `material_request_summary` view (per-job/per-client rollup for the queue). Standard item lists per trade live in the app. Quantities only, no prices. Backs the Material Requests page. Run any time. Safe to re-run. |
| 48 | `48_project_files_from_drive.sql` | Makes `project_files.storage_path` nullable and adds a unique index on `drive_file_id`, so the Files tab can hold files that live only in Google Drive (a null `storage_path` means "open via `drive_url`, not a signed storage URL"). Prereq for 49. Run any time. Safe to re-run. |
| 49 | `49_import_drive_files.sql` | Documentation of the one-time backfill (already applied through the app, not run in the editor): 640 of 641 files that already lived in the jobs' Google Drive folders, pulled in via a Google Apps Script export and inserted as Drive-only `project_files` rows matched to their job by folder id, then by client name for the ~13 clients whose Drive folder had been recreated. Depends on 48. |

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
