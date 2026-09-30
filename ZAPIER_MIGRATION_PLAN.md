# Zapier Migration — Monday.com → Ops Hub

**Written:** 30 Sep 2026
**Goal:** Ops Hub becomes the source of truth. Monday.com gets deleted. Every
Zap that currently reads from or writes to Monday, or to a tracker Google
Sheet the app replaces, gets rebuilt against Supabase.

## Scope decisions (confirmed with Kris)

- **`monday_item_id` is not needed.** Nothing downstream depends on it. No
  need to keep it populated after the board goes.
- **Slack Zaps are out of scope for this pass.** The three
  `Slack: … → Move to …` Zaps stay pointed at Monday until a later session.
  Do not touch them, and do not delete the Monday board until they are
  migrated.
- Everything else in this file is in scope.

---

## The core problem

Most of the affected Zaps are **triggered by Monday**, not merely writing to
it. `New Client Added in Monday →`, `PSO Scheduled →`, `Project Scheduled →`.
Deleting the board removes the *trigger*. Those Zaps stop firing silently —
no error, no alert, they just never run again.

So this migration is two pieces of plumbing, not one.

---

## Piece 1 — Outbound: Supabase Database Webhooks

Replaces every Monday trigger.

Supabase has this built in (Database → Webhooks, backed by `pg_net`). Point
one at a table, choose the events, give it a URL. It POSTs the row as JSON.
Each one targets a **Zapier Catch Hook**.

Webhooks to create:

| Name | Table | Events | Replaces |
|---|---|---|---|
| `job_created` | `jobs` | INSERT | New Client Added in Monday → Drive folders; Welcome Call Reminder |
| `job_stage_changed` | `jobs` | UPDATE | PSO Scheduled; Job Approved; Move to Estimate Accepted; Move to Design Paid; Design Presentation; Move to Rough Estimate Needed; COMPLETED STATUS |
| `estimate_changed` | `estimates` | INSERT, UPDATE | Estimate Scheduled Tracker; Shows Tracker; Design Invoice Sent/Paid |
| `lead_created` | `leads` | INSERT | Lead Tracking; Source: * |

`job_stage_changed` fires on every `jobs` UPDATE, so the Zap must filter on
`stage` actually having changed — compare `record.stage` to
`old_record.stage` in a Zapier Filter step and stop when equal. Otherwise
every costing edit re-triggers the whole chain.

### Drive folder creation — highest priority

The one behaviour that must not regress. On `job_created`, create:

```
Salexx Construction Projects / [Client Name] /
    Accounting
    Contracts
    Estimate Details
    Materials
    Permits
    Project Photos/Videos
```

Then write the folder URL back to the job. `project_files` already has
`drive_status` (`pending` | `synced` | `error`), `drive_file_id` and
`drive_url` — use those rather than inventing new columns, so a failed
folder creation is visible in the app instead of lost.

---

## Piece 2 — Inbound: one Edge Function

Replaces every Zap that writes into a tracker Sheet.

Build **one** Supabase Edge Function, `zapier-in`, with a shared secret in an
`x-salexx-key` header. Every inbound Zap POSTs to the same URL with an
`event` field that routes it.

Why one function rather than Zapier hitting the REST API directly: the REST
route needs the service-role key stored inside Zapier, which bypasses RLS on
every table. One function keeps that key server-side and gives a single place
to validate payloads and enforce the identity rules below.

```
POST https://<project>.supabase.co/functions/v1/zapier-in
x-salexx-key: <secret>

{ "event": "lead.created", "data": { ... } }
```

Events to support:

| Event | Writes to | Required fields |
|---|---|---|
| `lead.created` | `leads` | `lead_date` (NOT NULL), `name` (NOT NULL); optional `phone`, `email`, `source`, `est_value` |
| `lead.stage_changed` | `leads.pipeline_stage` | `lead` identifier, raw GHL stage name |
| `job.stage_changed` | `jobs.pipeline_stage` + `stage` | client identifier, raw GHL stage name |
| `estimate.created` | `estimates` | `client_name` (NOT NULL); optional `job_type`, `amount`, `sent_date` |
| `estimate.updated` | `estimates` | `estimate_id` or lead/job link + the dates/flags that changed |
| `task.created` | `tasks` | `title` (NOT NULL); optional `assignee`, `due_date`, `priority` (Low\|Medium\|High) |
| `material_request.created` | `material_requests` | `job_id` (NOT NULL), `project_type` (NOT NULL) |

### Non-negotiable: identity rules apply to inbound writes

`CLAUDE.md` Phase 2A governs this function completely. Inbound GHL and email
payloads are exactly where bad merges get created.

- **Never** link a payload to an existing client or job on name match alone.
- Match on normalised phone or email. Where that is ambiguous — zero matches
  or several — create the record **unlinked** and let it surface in
  **Needs Review**, which already exists for precisely this.
- Never auto-merge. Never create a replacement client. When uncertain, leave
  it alone and flag it.

Follow the pattern `94_job_pipeline_stage_always_sync.sql` already
established: always write the raw stage to `pipeline_stage` (informational,
carries no identity risk), and only update the structured `stage` when the
name resolves through `ghl_stage_map` **and** the client has exactly one
active job.

### Two schema traps

- `estimates.estimator` is `references crew(name)`. A Zap sending a name not
  in `crew` fails on the foreign key. Either validate against `crew` in the
  function and null it out, or fix the sending Zap.
- `leads.lead_date` is NOT NULL. Default it to the payload timestamp in the
  function rather than letting the insert fail.

---

## Zap-by-zap

### Rebuild — currently Monday-triggered

| Zap | Action |
|---|---|
| New Client Added in Monday → Create New Folder and Subfolders | Re-trigger on `job_created`. **Do first.** |
| NEW WORKSPACE — New Client Added in Monday → Create… | Confirm whether this duplicates the above; retire if so |
| PSO Scheduled → Move to Project Scheduled | Re-trigger on `job_stage_changed` |
| Job Approved → Move to Ready for Scheduling | same |
| Move to Estimate Accepted → Ready for Scheduling | same |
| Move to Design Paid → Design Paid | same |
| Design Presentation → Move to Design Presentation | same |
| Move to Rough Estimate Needed → Monday: Estimate Sched… | same |
| COMPLETED STATUS → Content Tracker | Re-trigger on `job_stage_changed` filtered to Completed |
| Welcome Call Reminder | Re-trigger on `job_created` |
| Estimate Scheduled to Monday | **Retire** — the Estimates page owns this |
| Project Scheduled → Added to Gross Profit Tracker | **Retire** — Job Costing *is* the GP tracker |

### Repoint — currently writing to Sheets

Swap the Google Sheets action for a Webhooks POST to `zapier-in`. Triggers
stay as they are.

| Zap | Event |
|---|---|
| Lead Tracking · Lead Tracking - Scheduled Estimates | `lead.created` |
| Source: Website · Source: Referral · Source: Nextdoor | `lead.created` with `source` |
| Door to Door Lead → GHL Contact and New Lead Opportunity | `lead.created` |
| Add New Contacts in GHL for every New Estimate Needed | `estimate.created` |
| Estimate Scheduled Tracker | `estimate.updated` |
| Design Invoice Sent Tracker | `estimate.updated` → `design_sent` |
| Design Invoice Paid Tracker | `estimate.updated` → `design_paid` |
| Shows Tracker | `estimate.updated` → `shown_date` |
| Auto Add New Task | `task.created` |
| Material Request to SMS | `material_request.created` |

### Leave alone — no Monday, no Sheets

Design Paid in Markate → Update in GHL · New Customer Added → Add as New Lead ·
New Estimate Accepted / Declined / Needed / Sent → Update GHL Stage ·
Salexx Properties 23rd + 25th Payment Reminder · Steps Reminder ·
Webhooks to Slack Channel Message · Weekly Scheduled Messages ×2

### Deferred — next session

Slack: DESIGN SOLD · Slack: SOLD · Slack: REVIEW REQUEST

---

## Build order

1. `zapier-in` Edge Function, shared secret, `lead.created` only. Test with
   one real lead end to end.
2. Add the remaining inbound events.
3. `job_created` webhook + Drive folder Zap. Verify all six subfolders and
   that `drive_url` gets written back.
4. `job_stage_changed` webhook + the stage Zaps, with the
   stage-actually-changed filter.
5. `estimate_changed` and `lead_created` webhooks.
6. Retire the two dead Zaps.
7. **Run the Sheets Zaps in parallel for 30 days.** They cost nothing and
   give a second copy to diff against when a number looks wrong. Switch them
   off after one clean month-end in both.
8. Migrate the Slack Zaps.
9. Only then delete the Monday board.

## Open

- `NEW WORKSPACE — New Client Added in Monday` vs the original: same job or
  genuinely different? Confirm before retiring either.
- Confirm the Zapier plan has enough task volume for the webhook fan-out —
  `job_stage_changed` on every `jobs` UPDATE is chattier than Monday's
  status-only trigger, even with the filter.
