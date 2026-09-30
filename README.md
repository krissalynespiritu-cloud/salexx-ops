# Salexx Ops Hub

Internal business management app for Salexx Construction — jobs, leads,
estimates, billing, payroll, and job costing/margins in one place, backed
by Supabase.

This file is the starting point for anyone (including a future session of
Claude with no memory of past work) picking this codebase up cold.

## What this is, architecturally

- **`index.html`** is the entire application. One file, no build step, no
  framework, no bundler. It's a single-page app: one hash-routed page per
  sidebar tab (`activateTab()`), with a big delegated `click`/`input`/
  `change` listener near the bottom of the file driving most interactions
  via `data-*` attributes on the markup (`data-jf="stage"`, `data-open="…"`,
  etc.) rather than one listener per element.
- **Supabase** is the entire backend — Postgres, its REST API (PostgREST),
  and its Auth. There is no separate server; `index.html` talks to Supabase
  directly using the `sb` client and the public/publishable key baked into
  the file (that key is meant to be public — see **Security model** below).
- **`supabase/*.sql`** is the database, expressed as an ordered sequence of
  migrations (`01_schema.sql`, `02_seed.sql`, … up through the 90s). There
  is no migration tool — these are plain `.sql` files, meant to be pasted
  into the Supabase SQL editor **in filename order**. See
  `supabase/README.md` for what each one does (current through migration
  25; later ones are self-documented in their own header comment — read
  the file before running it).
- **`tests/`** is a custom regression suite — no test framework. Each file
  in `tests/cases/` loads a real jsdom DOM, mocks the Supabase client with
  in-memory arrays, `eval()`s the actual production code out of
  `index.html` unmodified, and drives it through real DOM events. See
  `tests/README.md` for the full methodology.
- **`tests/sql/job_financials_test.sql`** is a separate, SQL-level test for
  the job-costing math itself (`job_financials`/`job_margins`) that the JS
  suite above cannot exercise. See the note in **Running the tests** below.
- **`.github/workflows/test.yml`** runs both suites on every push and pull
  request against `main`.

There is currently no separate staging environment — every code change and
every SQL migration is written and run against the one production
Supabase project. Treat any schema-changing migration as live-data-risk
until that changes.

## Running it locally

```
python3 -m http.server 8743
```

Then open `http://localhost:8743/`. It talks to the real production
Supabase project — there is no local/mock database mode for manual
testing, only for the automated suite below.

## Running the tests

```
npm install   # once
npm test
```

`npm test` re-extracts fresh fixtures from the current `index.html` and
runs every case in `tests/cases/`, printing a pass/fail count per file and
a grand total. It exits non-zero if anything fails, which is what CI acts
on. Run one case directly while iterating with
`node tests/extract.js && node tests/cases/runNN.js`.

**What the JS suite does and doesn't cover:** it exercises the app's
JavaScript — click handlers, rendering, async flows, the shape of what
gets sent to Supabase. It does **not** execute any real SQL. Every JS test
that touches a margin mocks `job_margins`' *output* (a hand-typed object),
never the SQL that computes it.

**The SQL-level test** (`tests/sql/job_financials_test.sql`) closes that
gap: it spins up a minimal schema mirroring exactly what
`job_financials`/`job_margins` read, copied verbatim from their current
definitions, seeds a handful of hand-calculated scenarios (a normal
in-house job, an unpriced job, a fully sub-out job, a retired job, and the
"hours logged with no matching labor cost" edge case that motivated
tonight's `costingComplete()` fix), and asserts the computed columns
against expected values by hand. Run it against a throwaway Postgres —
**never against the real project**, it creates and drops tables by name:

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/job_financials_test.sql
```

CI runs this on a fresh `postgres:16` container on every push, so it needs
no local Postgres install. **Important:** this file is a hand-maintained
copy of the two views, not the real migration history replayed — if
`job_financials` or `job_margins` is ever changed in `supabase/*.sql`, this
file's copies must be updated to match by hand, or it silently starts
testing stale logic.

## Business rules that are load-bearing, not stylistic

Read **`CLAUDE.md`** before touching anything related to clients, jobs,
leads, estimates, or "is this a duplicate" logic. In short:

- A name match alone is never sufficient evidence that two client records
  are the same person — repeat customers with multiple legitimate projects
  are the expected case, not a data problem.
- Any proposed merge, link, or cleanup gets a read-only audit and explicit
  approval first. When uncertain, leave records alone and flag for human
  review rather than guessing.
- Several specific cases are marked protected/resolved in `CLAUDE.md` and
  must not be reopened without a new, explicit request.

There's also a pinned rule (in the assistant's own memory, not a file):
whenever a change includes a new or modified `supabase/*.sql` migration,
say so explicitly and give the full SQL to run — don't bury it in a commit
message.

## Security model

- The key hardcoded in `index.html` is Supabase's **publishable** key —
  this is meant to be public; Supabase's own docs say so. It is *not* a
  secret and does not need to be rotated or hidden.
- The **service_role/secret** key is a different, genuinely secret
  credential. It bypasses Row Level Security entirely. It must never be
  pasted into chat, committed, or put anywhere in `index.html` — the only
  place it belongs is typed directly into a tool's own config (e.g.
  Zapier), by a human, never relayed through an assistant.
- RLS policy everywhere in this app is the same shape: `for all to
  authenticated using (true)` — any logged-in user can read/write any
  table. There is currently no per-role restriction (no `role` column
  drives access control anywhere), and Kris has confirmed that's
  intentional for the current 4 users, not an oversight.
- Row Level Security has been audited against every `create table`
  statement across all migrations (see commit closing 3 gaps found this
  way), but **view-level RLS has not been independently verified against
  a live anon key** — Postgres views can leak RLS-protected data depending
  on view ownership, and that needs a live test, not a read of the
  migration files.

## Known gaps (not yet done, as of this writing)

- No staging Supabase project — schema changes are tested by review only.
- View-level RLS not independently verified live.
- No error monitoring (Sentry or similar) — failures surface only as an
  in-app toast; nothing alerts anyone remotely.
- No accounting-software integration (QuickBooks, etc.).
- Google/Apple sign-in buttons exist but the providers aren't enabled in
  Supabase Auth yet.
- The Monday.com → Supabase Zapier migration is fully planned
  (`ZAPIER_MIGRATION_PLAN.md`, `ZAPIER_SETUP_GUIDE.md`,
  `ZAPIER_STAGES_AND_KPI.md`) but not yet built — Monday.com is still the
  trigger source for several real workflows until it ships.
