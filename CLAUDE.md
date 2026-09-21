## Phase 2A — Client/Data Integrity Rules

These rules are permanent and must be followed for all future client, job,
lead, estimate, task, and duplicate-client work.

### Core Identity Rules

1. NAME MATCH ALONE IS NEVER SUFFICIENT EVIDENCE.
   - Never merge or link records solely because names are identical,
     similar, abbreviated, reordered, or contain the same first name.
   - Exact name matches must still be treated as unverified unless supported
     by additional evidence.

2. REPEAT CUSTOMERS ARE NOT DUPLICATES BY DEFAULT.
   - A customer may have multiple projects.
   - A customer may have different services/projects under separate records.
   - Different trades, properties, dates, or projects do NOT automatically
     mean duplicate records.
   - Preserve separate client records unless there is strong evidence that
     the records were accidentally created as duplicates.

3. DIFFERENT SERVICES DO NOT MEAN DUPLICATE.
   - Example: Angelina may legitimately have multiple records because she
     has different projects/services.
   - Do not merge Angelina R / Angelina Rockelman based on name similarity
     alone.
   - Apply this principle consistently to all customers.

4. WHEN UNCERTAIN, LEAVE THE RECORDS ALONE.
   - Do not auto-link.
   - Do not merge.
   - Do not create a replacement client.
   - Do not "clean up" based on assumptions.
   - Flag the case for human review instead.

### Acceptable Supporting Evidence

A merge or client link may be proposed when there is meaningful corroborating
evidence such as:

- Matching normalized phone number
- Matching email address
- Strong financial/lifetime-value evidence combined with matching project,
  trade, and/or timing evidence
- Matching job/project evidence that strongly indicates the same customer
- Other direct database relationships that establish identity

Evidence should be evaluated together, not individually.

### Important Examples

Angelina:
- Do NOT assume "Angelina R" and "Angelina Rockelman" are duplicates.
- They may represent different projects/services for the same or different
  people.
- Keep them separate unless stronger evidence establishes that they are
  accidental duplicate client records.

Other repeat-customer examples:
- Steve Langella / Steve & Erin Langella
- Kylee & Cody Ray / Ray & Kylee
- Any customer with multiple services or projects

These must not be merged merely because their names look similar.

### Existing Phase 2A State

Phase 2A has already established:

- Client relationships were added to estimates/tasks.
- Creation-path client resolution exists.
- Phone normalization handles US country-code prefixes.
- Duplicate detection and review UI exist.
- Atomic `merge_clients()` exists.
- Merges are soft merges: losing clients are deactivated, not deleted.
- `client_merge_log` stores merge history and pre-merge snapshots.
- Merged/inactive clients are hidden from the active Clients list.

Previously approved merges must NOT be reconsidered or reversed unless explicitly
requested.

### Current Protected / Untouched Cases

Do not modify these without explicit approval:

- SLX-165 — Robyn Bryant
- SLX-166 — Angelina Rockelman
- Lexi accepted estimate
- Phil / Phil Rose
- Kathy 3-way group
- Remaining medium/low-confidence duplicate groups

### Resolved Cases

- Natalya Feoktistov accepted estimate — zero matches against all 150
  clients on name, email, or phone. Resolved 2026-09-21 as a tier 7
  (no-candidate) client creation per `resolveClientForCreate` in
  `index.html`; see `supabase/63_create_client_natalya_feoktistov.sql`.
  Not to be reopened or reconsidered absent new evidence.

### Before Any Data Change

For any proposed merge, link, client creation, or cleanup:

1. Perform a READ-ONLY audit first.
2. Show the exact records involved.
3. Explain the evidence supporting the proposed action.
4. Identify possible false-positive/repeat-customer scenarios.
5. Clearly separate:
   - Safe to auto-fix
   - Needs human approval
   - Leave untouched
6. Do not modify the database until explicit approval is given.
7. After approved changes, verify:
   - affected records
   - reassigned relationships
   - client counts
   - audit log
   - unrelated records remain untouched
   - no test-data residue
   - no console/app errors

### Critical Principle

The goal is NOT to minimize the number of client records.

The goal is to maintain CORRECT customer identity and relationships.

False-positive merges are worse than leaving a possible duplicate unresolved.
