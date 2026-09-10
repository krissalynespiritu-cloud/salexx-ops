# App file → Google Drive (Zapier) — BUILT

When a file is uploaded on a job's **Files** tab it's stored in Supabase and
shows as **"syncing…"**. This Zap copies it into the matching subfolder of
that job's Google Drive folder and flips the badge to **"in Drive ✓"**.

**Status: built and published, Sept 2026.** It polls Supabase about every
2 minutes, so a real upload syncs within a couple of minutes.

This does not touch the separate "new client → create folder tree" zap.

---

## Why polling instead of a Supabase webhook

Supabase **Database Webhooks** could not be used — this project is missing
the internal `supabase_functions` schema and creating a hook fails with
`ERROR: 3F000: schema "supabase_functions" does not exist`. So the trigger
polls PostgREST directly instead. No Supabase-side setup is needed.

---

## The Zap, step by step

### 1. Trigger — Webhooks by Zapier → Retrieve Poll
- **URL:** `https://jrewbkwbbwpwflkqectk.supabase.co/rest/v1/project_files?drive_status=eq.pending&select=*&order=created_at.desc`
- **Key / Deduplication Key:** `file_id`
- **Headers:**
  | Key | Value |
  |---|---|
  | `apikey` | the Supabase secret key (`sb_secret_…`, or a correctly-copied legacy `service_role` JWT) |
  | `Authorization` | `Bearer ` + the same key — one space after "Bearer", **no `+`, no line break** |

### 2. Filter by Zapier
- Only continue if **`job_drive_url`** → **(Text) Exists**
  (skips jobs that don't have a Drive folder link yet)

### 3a. Formatter → Text → Split Text
- Input: **`job_drive_url`** · Separator: `folders/` · Segment: **Second**

### 3b. Formatter → Text → Split Text
- Input: **output of 3a** · Separator: `?` · Segment: **First**
- → the job's Drive folder ID

### 4. Google Drive → Find a Folder
- Folder Name: **`category`** (from the trigger) · Search Type: **Exact match**
- Drive: **My Google Drive** · Parent Folder: **output of 3b**
- "Successful if no results" → **False (halt)** · do **not** create if missing

### 5. Google Drive → Upload File
- Drive: **My Google Drive** · Folder: **Step 4 → Id**
- File: **`download_url`** (from the trigger) · File Name: **`file_name`**
- Convert to Document: **No**

### 6. Webhooks by Zapier → Custom Request
- Method: **PATCH**
- URL: `https://jrewbkwbbwpwflkqectk.supabase.co/rest/v1/project_files?file_id=eq.` + **`file_id`** (from the trigger)
- Data Pass-Through: **No**
- Data:
  ```
  {"drive_status": "synced", "drive_url": "«Step 5 → Alternate Link»", "drive_file_id": "«Step 5 → Id»"}
  ```
- Headers: same 4 as Step 1's headers **plus** `Content-Type: application/json` and `Prefer: return=minimal`

---

## If a file stays "syncing…" for more than ~5 min

- The job has no Drive folder link → open the job's Files tab and paste it in, then re-upload
- Check **Zapier → Zap History** for a halted/errored run
- The `download_url` on the row is a 7-day signed link — a file left unsynced
  longer than that needs re-uploading

## Test procedure

1. Upload a small file to a job that has a Drive folder link
2. Wait ~2–3 min (or open Zap History and run it)
3. Check that job's Drive folder → the right subfolder → the file is there
4. Refresh the app's Files tab → badge reads **"in Drive ✓"**
