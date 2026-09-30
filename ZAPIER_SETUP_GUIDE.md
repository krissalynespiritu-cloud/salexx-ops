# Zapier ↔ Ops Hub — Setup Guide (no code)

Do these in order. Phase 1 takes about 30 minutes; once one Zap works the
rest are copies of it.

UI labels move around — if a button isn't where this says, look for the
nearest thing with that name.

---

## Phase 0 — Get your two values (5 min)

In Supabase → **Project Settings → API**, copy:

1. **Project URL** — `https://xxxxxxxx.supabase.co`
2. **Secret key** — the one that says *secret* / *service_role*, NOT the
   publishable key

> **The secret key bypasses all your Row Level Security.** It goes in Zapier
> and nowhere else. Never put it in `index.html`, never paste it in Slack or
> a chat. If it ever leaks, rotate it on that same settings page.

Keep both in a note — every Zap below uses them.

---

## Phase 1 — First inbound Zap: Lead Tracking → `leads`

Build this one fully and test it before touching anything else.

1. Open the **Lead Tracking** Zap. **Duplicate it** — work on the copy, leave
   the original running.
2. Leave the trigger alone.
3. Delete the **Google Sheets** action step.
4. Add a new action → search **Webhooks by Zapier** → choose **POST**.
5. Fill it in:

**URL**
```
https://xxxxxxxx.supabase.co/rest/v1/leads
```

**Payload Type:** `json`

**Data** — map the right-hand values to your trigger fields:

| Field | Value |
|---|---|
| `lead_date` | the lead's date — **required, cannot be blank** |
| `name` | client name — **required** |
| `phone` | phone |
| `email` | email |
| `source` | Website / Referral / Nextdoor / Facebook etc. |
| `est_value` | estimated value, or leave out |

**Headers**

| Header | Value |
|---|---|
| `apikey` | your secret key |
| `Authorization` | `Bearer ` + your secret key |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` |

6. **Test step.** A green result with the new row echoed back means it worked.
7. Open the Ops Hub → **Leads Tracker** → your test lead should be there.
8. Delete the test lead from the app, turn the new Zap **on**, turn the old
   one **off**.

### If the test fails

| Message | Cause |
|---|---|
| `401` / `Invalid API key` | Wrong key, or you used the publishable one |
| `null value in column "lead_date"` | `lead_date` came through blank — give it a fallback |
| `null value in column "name"` | same, for name |
| `404` | Typo in the table name in the URL |

---

## Phase 2 — The rest of the inbound Zaps

Same recipe. Only the URL and the Data fields change. Headers are identical
every time.

| Zap | URL ends with | Key fields |
|---|---|---|
| Lead Tracking - Scheduled Estimates | `/rest/v1/leads` | `lead_date`, `name`, `source` |
| Source: Website | `/rest/v1/leads` | + `source` = `Website` |
| Source: Referral | `/rest/v1/leads` | + `source` = `Referral` |
| Source: Nextdoor | `/rest/v1/leads` | + `source` = `Nextdoor` |
| Door to Door Lead → GHL Contact | `/rest/v1/leads` | `lead_date`, `name`, `source` = `Door to Door` |
| Add New Contacts in GHL for every New Estimate Needed | `/rest/v1/estimates` | `client_name` (required), `job_type`, `amount` |
| Estimate Scheduled Tracker | `/rest/v1/estimates` | `client_name`, `sent_date` |
| Design Invoice Sent Tracker | `/rest/v1/estimates` | `client_name`, `design_sent` = `true` |
| Design Invoice Paid Tracker | `/rest/v1/estimates` | `client_name`, `design_paid` = `true` |
| Shows Tracker | `/rest/v1/estimates` | `client_name`, `shown_date` |
| Auto Add New Task | `/rest/v1/tasks` | `title` (required), `assignee`, `due_date`, `priority` |
| Material Request to SMS | `/rest/v1/material_requests` | `job_id` (required), `project_type` (required) |

### Three rules that will bite you

- **`priority`** on tasks must be exactly `Low`, `Medium` or `High`. Anything
  else is rejected.
- **`estimator`** on estimates must exactly match a name in your `crew`
  table. If your Zap sends something else, leave the field out entirely.
- **Never send a client name hoping the app will link it to an existing
  client.** It won't, by design. Records that can't be matched on phone or
  email land in **Needs Review** for you to decide. That's correct — it's
  what stopped Brant and Bryant becoming one record by accident.

---

## Phase 3 — Outbound: make the app trigger Zaps

This replaces every Zap that currently starts with "… in Monday".

### 3a. Create the catch hook in Zapier first

1. **Create Zap** → trigger → **Webhooks by Zapier** → **Catch Hook**.
2. Copy the URL it gives you. Leave this tab open.

### 3b. Point Supabase at it

1. Supabase → **Database → Webhooks** → **Create a new hook**.
2. Name: `job_created`
3. Table: `jobs`
4. Events: tick **Insert** only
5. Type: **HTTP Request**, Method **POST**
6. URL: the catch hook URL from 3a
7. Save.

### 3c. Test

Create a job in the Ops Hub. Zapier should catch it within a few seconds.
Delete the test job afterwards.

### The four hooks to create

| Name | Table | Events |
|---|---|---|
| `job_created` | `jobs` | Insert |
| `job_stage_changed` | `jobs` | Update |
| `estimate_changed` | `estimates` | Insert, Update |
| `lead_created` | `leads` | Insert |

Each needs its own catch hook URL — one per Zap.

---

## Phase 4 — Drive folders (do this one first of the outbound set)

This is the behaviour you'd actually miss. Monday does it today; nothing
else will.

Trigger: the `job_created` catch hook.

Actions:

1. **Google Drive → Create Folder**
   - Folder name: the client name from the payload
   - Parent: `Salexx Construction Projects`
2. Six more **Create Folder** steps, each with the folder from step 1 as
   parent:
   - `Accounting`
   - `Contracts`
   - `Estimate Details`
   - `Materials`
   - `Permits`
   - `Project Photos/Videos`

Then write the link back so the app shows it — **Webhooks by Zapier → PATCH**:

```
https://xxxxxxxx.supabase.co/rest/v1/jobs?job_id=eq.{{job_id from payload}}
```

Data: `drive_folder_url` = the URL from step 1. Same four headers as before.

---

## Phase 5 — Stage change Zaps

Trigger: the `job_stage_changed` catch hook.

**Add a Filter step immediately after the trigger, before anything else.**

> Only continue if… `record__stage` **(text) does not exactly match**
> `old_record__stage`

Without this, every single edit to a job — someone typing in a materials
figure — re-fires the whole chain. Monday only ever fired on status changes.
This filter is what recreates that.

Then a second filter for the specific stage that Zap cares about, and your
existing actions after it.

Rebuild these six on that pattern:

- PSO Scheduled → Move to Project Scheduled
- Job Approved → Move to Ready for Scheduling
- Move to Estimate Accepted → Ready for Scheduling
- Move to Design Paid → Design Paid
- Design Presentation → Move to Design Presentation
- COMPLETED STATUS → Content Tracker *(filter on Completed)*

Plus **Welcome Call Reminder** on the `job_created` hook.

---

## Phase 6 — Clean up

**Turn off now** (the app replaced them):

- Estimate Scheduled to Monday
- Project Scheduled → Added to Gross Profit Tracker — Job Costing *is* the GP tracker

**Check before deciding:** `NEW WORKSPACE — New Client Added in Monday`.
Open it and see whether it duplicates the folder Zap. Retire it if so.

**Leave running, don't touch:**

Design Paid in Markate · New Customer Added → Add as New Lead ·
New Estimate Accepted / Declined / Needed / Sent · Salexx Properties 23rd +
25th · Steps Reminder · Webhooks to Slack · Weekly Scheduled Messages ×2

**Leave pointed at Monday for now:** the three `Slack: …` Zaps — next session.

---

## Phase 7 — Parallel run, then delete Monday

Leave the **old Sheets Zaps switched on for 30 days** alongside the new ones.
They cost you nothing and give a second copy to check against when a number
looks wrong.

Switch them off after one month-end that closes cleanly in both.

**Do not delete the Monday board until the Slack Zaps are migrated.** They
still write to it.

---

## Watch your Zapier task usage

`job_stage_changed` fires on every `jobs` update, and the filter runs *after*
the task is counted. If you're near your plan limit, check usage after the
first week.
