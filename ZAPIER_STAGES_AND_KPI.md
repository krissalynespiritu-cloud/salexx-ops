# Stage Zaps + KPI Tracker — build guide

**Written:** 1 Oct 2026
Companion to `ZAPIER_SETUP_GUIDE.md`. Covers the GHL stage Zaps and what
makes the KPI trackers fill themselves.

---

## Correction to the earlier plan

The stage Zaps are **triggered by GHL**, not by Monday. Monday was only the
action. So there is no database webhook and no filter step for these — you
keep the GHL trigger and swap the Monday action for a call to the app.

---

## Part 1 — Stage Zaps

### Prerequisite

Migration `94_job_pipeline_stage_always_sync.sql` must be run. Check:

```sql
select proname from pg_proc where proname = 'set_job_stage_by_contact';
```

Empty result = run migration 94 first. Nothing below works without it.

### Why an RPC instead of a PATCH

`set_job_stage_by_contact(p_email, p_phone, p_stage)` enforces the Phase 2A
rules for you:

- matches on **email or phone**, never on name
- always writes the raw GHL stage to `pipeline_stage` (visible on the job as
  context — the violet dot)
- updates the structured `stage` column **only** when the stage name is in
  `ghl_stage_map` **and** the client has exactly one active job
- refuses to guess when a client has zero or several active jobs

A plain PATCH would skip all of that.

### The recipe — same for every stage Zap

Duplicate the existing Zap, work on the copy.

1. **Leave the GHL trigger alone** (Pipeline Stage Changed → its own stage)
2. Delete the **monday.com** action
3. Add **Webhooks by Zapier → POST**

**URL** (identical for all of them)
```
https://jrewbkwbbwpwflkqectk.supabase.co/rest/v1/rpc/set_job_stage_by_contact
```

**Payload Type:** `Json`

**Data**

| Key | Value |
|---|---|
| `p_email` | Email from the trigger |
| `p_phone` | Phone from the trigger |
| `p_stage` | the stage name — see table below |

**Wrap Request In Array:** No · **Unflatten:** No

**Headers** (identical for all of them)

| Key | Value |
|---|---|
| `apikey` | secret key |
| `Authorization` | `Bearer ` + secret key |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` |

### What `p_stage` should be, per Zap

`p_stage` is the **GHL** stage name. The app translates it through
`ghl_stage_map`. Send what GHL calls it, not what the app calls it.

| Zap | `p_stage` |
|---|---|
| Design Presentation → Move to Design Presentation | `Design Presentation` |
| Move to Design Paid → Design Paid | `Design Paid` |
| Move to Estimate Accepted → Ready for Scheduling | `Ready for Scheduling` |
| Job Approved → Move to Ready for Scheduling | `Ready for Scheduling` |
| PSO Scheduled → Move to Project Scheduled | `Project Scheduled` |
| COMPLETED STATUS → Content Tracker | `Completed` |

Use the exact spelling from the GHL trigger's **Moved to Stage** field.

### Stages currently in `ghl_stage_map`

```
Designs Sold           → Designs Sold
Permitting / Drawings  → Permitting / Drawings
Ready for Scheduling   → Ready For Scheduling
Project Scheduled      → Project Scheduled
In Progress            → In Progress
Final Walkthrough      → Completed
Needs Some Touches     → Punch list / Touch-ups (if needed)
Completed              → Completed
Review Requested       → Completed
```

**`Design Presentation` and `Design Paid` are not in this list.** They will
show on the job as `pipeline_stage` (the violet dot) but won't move the
structured `stage`. That is correct behaviour if they're sales-side stages
before a job exists. If they should drive job stage, add a mapping:

```sql
insert into ghl_stage_map (ghl_stage, app_stage)
values ('Design Presentation', 'Designs Sold')
on conflict (ghl_stage) do update set app_stage = excluded.app_stage;
```

### Testing each one

Move a test contact into that stage in GHL, then open the job in the app.
The pipeline stage should show. If the stage name is mapped and the client
has one active job, the stage chip changes too.

---

## Part 2 — KPI trackers

### The thing to understand

**There are no KPI Zaps.** Admin Tracker, Closer Tracker and Design Sold
Tracker are SQL views computed live off date columns on the `leads` table.
Fill the dates, the trackers fill themselves.

| Tracker | Column | Source |
|---|---|---|
| Admin · Leads assigned | `lead_date` | count of leads per date |
| Admin · Appointments set | `estimate_booked_date` | count per date |
| Closer · Shows received | `shown_date` | count per date |
| Closer · Closed deals | `sale_date` where `status = 'Won'` | count per date |
| Closer · Revenue | `closed_revenue` where `status = 'Won'` | sum per date |
| Design · Design sent | `design_sent_date` | count per date |
| Design · Design sold | `design_sold_date` | count per date |

Historical rows through the import cutoff come from the `*_import` tables.
Every date after that is computed live. So from today onward, the trackers
only show what the Zaps write.

### ⚠️ Gap to fix first

**`estimate_booked_date` is not being written.** The Scheduled Estimates Zap
sets `estimate_booked = true` but not the date, because no booking-date field
was available in the trigger.

Result: **Admin Tracker "Appointments set" will read 0 from today onward.**

Fix — add to the Scheduled Estimates Zap's Data:

| Key | Value |
|---|---|
| `estimate_booked_date` | the step 2 Formatter output |

The Formatter has to output `YYYY-MM-DD`. It's the stage-change date rather
than the true appointment date, which is close enough for a daily count.

### The Zaps each KPI needs

All of these write to `leads` with the same upsert pattern already working:

```
URL     https://jrewbkwbbwpwflkqectk.supabase.co/rest/v1/leads?on_conflict=ghl_contact_id
Prefer  resolution=merge-duplicates,return=representation
```

Every one of them must send `ghl_contact_id`, or you get duplicate rows
instead of updates. Send only the fields that Zap owns — anything else you
send overwrites what an earlier Zap wrote.

| Zap | Trigger | Sends |
|---|---|---|
| Lead Tracking ✅ done | New Lead | `ghl_contact_id`, `name`, `lead_date`, `source` |
| Scheduled Estimates ✅ done, needs date | Estimate Scheduled | + `status` = `Estimated`, `estimate_booked` = `true`, **`estimate_booked_date`** |
| Shows Tracker — to build | appointment attended / showed | `shown_date` |
| Design Invoice Sent — to build | design invoice sent | `design_sent_date` |
| Design Sold — to build | design sold | `design_sold_date` |
| Estimate Accepted / Job Approved — to build | won | `status` = `Won`, `sale_date`, `closed_revenue` |

All dates must be `YYYY-MM-DD`. Add a **Formatter → Date/Time** step before
the webhook in each Zap, output format `YYYY-MM-DD`.

### Close rate — the reason it always reads 100%

`Lost` is 0 out of 230, and `Contacted` is 0 too. Nothing writes either, so
no lead can ever be lost and close rate can only ever be 100%.

Two things worth adding:

1. A Zap on the GHL **Job Declined** stage → `status` = `Lost`, plus
   `loss_reason` if the trigger carries one
2. A Zap on first contact / first reply → `status` = `Contacted`, which is
   what makes speed-to-lead measurable

Until `Lost` gets written, treat close rate on the dashboard as meaningless.

### Monthly KPI page

`monthly_kpi` rolls up the same lead records plus `ad_spend`. It fills in as
the Zaps above land. Ad spend is entered by hand on the Marketing
Performance page — no Zap needed.

---

## Build order

1. Run migration 94 (if not already)
2. Add `estimate_booked_date` to the Scheduled Estimates Zap — one field,
   unblocks the whole Admin Tracker
3. Design Presentation stage Zap, tested end to end
4. The other five stage Zaps — copies of it
5. Shows Tracker → `shown_date`
6. Design Sent / Design Sold → their dates
7. Estimate Accepted → `status` = `Won`, `sale_date`, `closed_revenue`
8. Job Declined → `status` = `Lost`
9. Turn the old Monday versions off as each replacement passes

## Keep in mind

- Send only the fields each Zap owns. Every field you send overwrites.
- `ghl_contact_id` goes in **every** lead Zap.
- `status` values are exactly `New` `Contacted` `Estimated` `Won` `Lost`.
- The 224 pre-existing leads have no `ghl_contact_id`, so the first GHL
  event for one of them creates a second row. Backfill from GHL on phone
  match when there's time.
