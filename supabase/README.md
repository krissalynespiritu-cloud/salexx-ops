# Salexx Ops Hub — database

Run these in order against a fresh Supabase project to rebuild the database
from nothing. Every file is safe to re-run unless its own header says
otherwise. Run order matches filename order — 01 through 21, no gaps, no
duplicate numbers.

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
