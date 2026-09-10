# Phase 2 — copy app uploads into Google Drive (Zapier)

When someone uploads a file on a job's **Files** tab, it's stored in Supabase
and the app shows it as **"syncing…"**. This zap copies that file into the
matching subfolder of the job's Google Drive folder and flips the badge to
**"in Drive ✓"**.

You only build this once. New projects keep getting their folders from your
existing Monday/Zapier automation — this doesn't touch that.

---

## Before you start

1. **Run migration `46_project_files_sync_fields.sql`** in the Supabase SQL
   editor (adds `job_drive_url` and `download_url` to `project_files`).
2. **Each job needs its Google Drive folder link in the app.** Open a job →
   **Files** tab → paste the folder link into the box (or click *edit* next
   to an existing one). The link looks like
   `https://drive.google.com/drive/folders/1AbCdEf...`. A file uploaded
   before the link is set will stay "syncing…" — re-upload it after, or
   we can add a "resync" button later.
3. **Get your Supabase service key:** Supabase → *Project Settings* → *API*
   → copy the **`service_role`** secret. ⚠️ This key ignores all row
   security. Paste it **only** into the Zapier webhook step below — never
   into the app or anywhere public.

Your Supabase project URL: `https://jrewbkwbbwpwflkqectk.supabase.co`

---

## Step 1 — Supabase sends new files to Zapier

**In Zapier:** create a new Zap. Trigger = **Webhooks by Zapier → Catch
Hook**. Copy the custom webhook URL it gives you.

**In Supabase:** *Database* → *Webhooks* → *Create a new hook*
- Name: `project_files_to_zapier`
- Table: `project_files`
- Events: **Insert** only
- Type: **HTTP Request**, Method: **POST**
- URL: *(paste the Zapier catch-hook URL)*
- HTTP Headers: `Content-Type` = `application/json`

Then upload one test file in the app and click **Test trigger** in Zapier so
it learns the fields. You'll see fields like `record__job_id`,
`record__category`, `record__download_url`, `record__file_name`,
`record__file_id`, `record__job_drive_url`, `record__drive_status`.

---

## Step 2 — only act on files that need syncing

Add **Filter by Zapier**:
- `record__drive_status`  **(Text) Exactly matches**  `pending`
- AND `record__job_drive_url`  **(Text) Does not contain** *(leave the value box empty — this means "is not empty")*

---

## Step 3 — pull the folder ID out of the job's Drive link

Add **Formatter by Zapier → Text → Split Text**
- Input: `record__job_drive_url`
- Separator: `folders/`
- Segment: **Second**

Add another **Formatter by Zapier → Text → Split Text**
- Input: *(output of the previous step)*
- Separator: `?`
- Segment: **First**

The result is the job's Drive folder ID. Call this **folderId**.

---

## Step 4 — find the right subfolder

Add **Google Drive → Find a Folder**
- Drive: the shared drive where "Salexx Construction Projects" lives
- Title (exact match): `record__category`
- Parent Folder: **folderId** (from Step 3)
- *Do not* create the folder if missing — leave that off. Your Monday zap
  already makes the six subfolders; if this step can't find one, the run
  should fail so you notice.

---

## Step 5 — upload the file

Add **Google Drive → Upload File**
- Folder: the folder ID from Step 4
- File: `record__download_url`  *(Zapier fetches the file from this link)*
- File Name: `record__file_name`
- Convert to Google Document: **No**

---

## Step 6 — tell the app it's done

Add **Webhooks by Zapier → Custom Request**
- Method: **PATCH**
- URL:
  `https://jrewbkwbbwpwflkqectk.supabase.co/rest/v1/project_files?file_id=eq.{{record__file_id}}`
- Data (choose "Json" for the data type):
  ```json
  {
    "drive_status": "synced",
    "drive_url": "{{step5_webViewLink}}",
    "drive_file_id": "{{step5_id}}"
  }
  ```
  *(map `drive_url` to the "Web View Link" field from Step 5, and
  `drive_file_id` to Step 5's "Id".)*
- Headers:
  | Key | Value |
  |---|---|
  | `apikey` | *(your service_role key)* |
  | `Authorization` | `Bearer` *(space)* *(your service_role key)* |
  | `Content-Type` | `application/json` |
  | `Prefer` | `return=minimal` |

---

## Step 7 (optional) — mark failures

In Zapier, turn on **Zap → Settings → Autoreplay** so transient errors
retry. If you want failed files to show as **"sync failed"** in the app
instead of a stuck "syncing…", add an error path that PATCHes the same URL
with `{"drive_status": "error"}`.

---

## Test it

1. Upload a small PDF to a job's **Permits** section in the app.
2. Watch the Zap run (Zapier → Zap History).
3. Check the job's Drive folder → `Permits` → the file is there.
4. Back in the app, refresh the Files tab → the badge reads **"in Drive ✓"**
   and links to the Drive copy.

---

## How the pieces fit

```
app upload ──▶ Supabase Storage (private bucket)
     │              +
     └────────▶ project_files row (drive_status = pending,
                 job_drive_url, 7-day download_url)
                        │
                 Supabase DB webhook (INSERT)
                        ▼
                 Zapier catch hook
                   ├─ filter: pending + has folder link
                   ├─ split out the folder ID
                   ├─ Google Drive: find <category> subfolder
                   ├─ Google Drive: upload the file
                   └─ PATCH project_files → drive_status = synced,
                      drive_url = Drive link
                        │
                 app Files tab shows "in Drive ✓"
```
