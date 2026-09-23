# Tests

This is a functional regression suite for `index.html`, the app's single
source file. It does not use a test framework — each case is a small
self-contained Node script that:

1. Loads a jsdom `document` built from the app's real body markup.
2. Mocks `window.supabase` with a fake Postgrest-style client backed by
   in-memory arrays (`global.mockJobsData`, etc.) instead of a live database.
3. `eval()`s the app's actual inline `<script>` code (unmodified — the
   production code, not a copy or a rewrite) into that environment.
4. Drives the app through real DOM events (`click`, `change`, `keydown`)
   and asserts on the resulting DOM/mock-Supabase state.

This catches real regressions — wrong click-handler wiring, wrong Supabase
column names, broken async flows — that a syntax check or a manual read
can't, without needing a live Supabase project or a browser.

## Running

```
npm install   # once, installs jsdom
npm test
```

`npm test` re-extracts fresh fixtures from `../index.html` (see below) and
runs every file in `cases/`, printing a pass/fail count per file and a
grand total. Exits non-zero if anything failed.

To run one case directly while iterating: `node tests/extract.js && node
tests/cases/run6.js` (it prints its own `=== PASS (n) ===` / `=== FAIL (n)
===` summary and exits non-zero on failure).

## How the fixtures work

`extract.js` pulls three things out of `index.html` on every run and
writes them to `_generated/` (gitignored, regenerated every run — never
edit it directly):

- `mainscript.js` — the first inline `<script>` block: the main app (~400KB).
- `block2.js` — the third inline `<script>` block: the Leads Tracker,
  which runs in its own IIFE/private scope, separate from the main script.
- `dom.html` — everything in `<body>` with `<script>` tags stripped, i.e.
  the real HTML structure the app's JS expects to find.

(The second inline script is a ~1KB fragment unrelated to app logic and
isn't used by any test.)

If `index.html`'s script-tag structure ever changes (e.g. a script gets
split up, or a new inline block is added), `extract.js` will throw with a
clear error rather than silently extracting the wrong thing — update the
assumption there and in whichever test cases reference `block2.js`.

## A known Node `eval()` gotcha

Every case does `(0, eval)(mainScript + '\n' + testLogic)` — concatenating
the app script and the test logic into **one** eval call, not two separate
ones. Two separate indirect-eval calls do not share top-level `let`/`const`
bindings in Node, so a test written as its own `eval()` call cannot see the
app's variables (`jobs`, `cur`, `activeTab`, etc.) at all. If you need to
read or set one of those from *outside* eval (e.g. to seed test data or
assert on it after the async test logic finishes), expose it as a
`global.` property instead — see `global.mockJobsData`, `global.nrJobs`
assignments in the existing cases for the pattern.

## Writing a new case

Copy the top of an existing case (e.g. `cases/run21.js` is a short one) and
adjust:

1. `global.mockJobsData` / whatever other tables your scenario needs, as
   plain arrays the mock `sb.from(table)` reads from and writes to.
2. The `testLogic` template string: call real app functions and dispatch
   real events, then `check(name, condition, optionalDebugDetail)`.
3. Always run the **full** suite (`npm test`) before committing a change
   to `index.html`, not just your new case — a change to shared code
   (a click handler, a shared helper) can break an unrelated case.

## Known gaps / non-goals

- `run7.js` from an earlier iteration of this suite tested a Change Orders
  UI that was later redesigned; it was retired rather than ported here
  since it no longer tests anything real. If you're rebuilding coverage
  for Change Orders, start fresh rather than resurrecting it.
- This suite covers UI/interaction logic, not SQL correctness — Supabase
  migrations in `supabase/` are still verified by hand by running them
  against the real project and checking the results, per `supabase/README.md`.
- jsdom prints `Not implemented: Window's scrollTo() method` warnings to
  stderr in some cases (jsdom doesn't implement scrolling). These are
  harmless noise, not failures — check the `=== FAIL (n) ===` count, not
  the presence of console output.
