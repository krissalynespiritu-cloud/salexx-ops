# Calendar Zaps — Google Calendar → Ops Hub (no code)

The Ops Hub **Calendar** page shows a read-only copy of the **Google
Calendar that GHL is linked to**. GHL copies its appointments into that
Google Calendar, and the grey "blocked off slots" you see in GHL (Randy
Johnson, ROSA + ALEX, the ‼️REMINDER‼️ CALL items…) live there too — so
this one Google Calendar covers everything.

Book, move and cancel **in GHL or Google** like always. The app never
writes back, so nothing can get out of sync.

Zapier labels move around — if a field isn't named exactly like this, pick
the closest match and check it in the **Test** step.

---

## Step 0 — Quick check (2 min)

Open that Google Calendar and find a GHL appointment you know about (e.g.
**"Juan Romero & Salexx", Thu Oct 1**). Check one from a few different GHL
calendars (Design Presentation, Final Walkthrough, Holiday Light…).

- **They're all there** → carry on.
- **Some are missing** → in GHL, open that calendar's settings and turn on
  its Google Calendar sync (linked calendar), or tell whoever manages GHL.
  Anything not in Google won't reach the app.

## Step 1 — Run the migration (once)

Paste `supabase/99_calendar_events.sql` into the Supabase **SQL Editor** and
run it. Safe to re-run.

## Step 2 — The POST step (same for both Zaps)

You'll need the **Project URL** and **secret key** from Phase 0 of
`ZAPIER_SETUP_GUIDE.md` (never the publishable key).

**Action:** **Webhooks by Zapier → POST**

**URL** — keep the `?on_conflict=` part; it's what makes an edited or
cancelled event overwrite its own row instead of adding a duplicate:
```
https://xxxxxxxx.supabase.co/rest/v1/calendar_events?on_conflict=source,external_id
```

**Payload Type:** `json`

**Headers**

| Header | Value |
|---|---|
| `apikey` | your secret key |
| `Authorization` | `Bearer ` + your secret key |
| `Content-Type` | `application/json` |
| `Prefer` | `resolution=merge-duplicates,return=representation` |

---

## Zap 1 — New or updated events

**Google Calendar is its own app in Zapier** (not Google Drive). Search
**Google Calendar**, connect the Google account GHL is linked to. Free app.

**Trigger:** Google Calendar → **New or Updated Event** → pick the calendar.

**Action:** the POST from Step 2, with this **Data**:

| Field | Value | Notes |
|---|---|---|
| `source` | `google` | type it literally |
| `external_id` | Event **ID** | **required** |
| `title` | **Summary** | |
| `starts_at` | **Start** date/time | **required** — check it has a time *and* an offset like `-07:00` or a `Z` (Google's usually does) |
| `ends_at` | **End** date/time | |
| `all_day` | `true` for all-day events, otherwise `false` | all-day events come through with a date but no time |
| `status` | event **Status** | Google sends `confirmed` / `cancelled` |
| `color` | **Color ID** | keeps the event's Google colour in the app; leave blank if there's no such field |
| `calendar_name` | the calendar's **name** | optional — only matters if you add Zaps for more than one Google calendar; each gets its own colour |
| `location` | **Location** | |
| `notes` | **Description** | GHL usually puts the contact's phone/email here |

If you want more than one Google calendar in the app (e.g. a crew calendar),
duplicate this Zap per calendar and set `calendar_name` on each.

## Zap 2 — Cancelled events

**Trigger:** Google Calendar → **Event Cancelled** → same calendar.

**Action:** the POST from Step 2, with:

| Field | Value |
|---|---|
| `source` | `google` |
| `external_id` | Event **ID** |
| `starts_at` | **Start** date/time (the table requires it) |
| `status` | `cancelled` |

---

## Test it

1. In each Zap's **Test** step, a green result echoing the row back means it
   worked. Open the Ops Hub → **Calendar** — the event should be there, at
   the same time Google shows.
2. Move that event in Google → it should **move** in the app, not appear twice.
3. Delete / cancel it → it should **disappear** from the app.
4. Turn both Zaps **on**.

| Message | Cause |
|---|---|
| `401` / `Invalid API key` | wrong key, or the publishable one |
| `null value in column "starts_at"` | the start came through blank |
| `null value in column "external_id"` | Event ID wasn't mapped |
| `there is no unique or exclusion constraint matching the ON CONFLICT` | the `?on_conflict=source,external_id` part is missing or misspelled |
| `relation "calendar_events" does not exist` | Step 1 hasn't been run |
| Event shows 7–8 hours off | the start time had no offset — use the date/time field that includes one, or add **Formatter → Date/Time** with From Timezone `America/Los_Angeles` |

---

## What's already on the calendar

The Zaps only fire for events created or changed **after** they're on. To
fill in what's already booked, export the calendar from Google (**Settings →
Import & export → Export**, gives an `.ics` file) and send it over — it can
be loaded once with the same `external_id`s so the Zaps keep it up to date
afterwards.

## In the app

- **Week / Month / List** views; ‹ › to move, **Today** to jump back.
- Events keep their Google colour; one filter chip per calendar.
- The daily **‼️REMINDER‼️** items are hidden — tick **Show reminders**.
- Click any event for its location and notes.
- Events are **not** linked to client records automatically — a name like
  "Juan Romero & Salexx" isn't enough evidence (CLAUDE.md Phase 2A).
