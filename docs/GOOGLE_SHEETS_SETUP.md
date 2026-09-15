# Google Sheets lead capture — setup

The public site's lead form (`/contact`) works without any of this — every
submission is saved locally and shows up in `/admin/website-leads`
immediately. This guide wires up the spec's primary system on top of that:
every submission also gets appended as a new row to a Google Sheet you
control, so you can manage leads (status, priority, notes) from Sheets too.

No credentials are ever exposed to the browser — the site posts to your
Apps Script Web App from the server only (`src/app/actions/submit-lead.ts`).

## 1. Create the Google Sheet

1. Create a new Google Sheet, name it something like **Website Leads**.
2. You don't need to add columns by hand — the script creates the header
   row automatically the first time it runs (see step 4).

## 2. Add the Apps Script

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete the default `myFunction() {}` placeholder code.
3. Copy the contents of [`scripts/google-apps-script/Code.gs`](../scripts/google-apps-script/Code.gs)
   in this repo and paste it in.
4. Click **Save** (the disk icon), name the project (e.g. "Website Leads API").

## 3. Set a shared secret (recommended)

This stops random internet traffic from posting fake rows into your sheet.

1. In the Apps Script editor, go to **Project Settings** (the gear icon) →
   **Script Properties** → **Add script property**.
2. Key: `SHARED_SECRET`, Value: any long random string you choose (e.g.
   generate one with `openssl rand -hex 24`).
3. You'll set this same value as `GOOGLE_APPS_SCRIPT_SECRET` in your app's
   environment in step 6.

## 4. Run `setup` once

1. Back in the Apps Script editor, use the function dropdown (next to Run/Debug)
   to select **setup**, then click **Run**.
2. The first run will prompt for authorization — click through **Review
   permissions → (your account) → Advanced → Go to (project name) → Allow**.
   This is Google's standard one-time consent for a script you wrote
   yourself acting on your own Sheet.
3. Switch back to the Sheet — you should now see a "Website Leads" tab with
   a header row.

## 5. Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure:
   - **Execute as:** Me (your account)
   - **Who has access:** Anyone
     (This does NOT make your Sheet public — it only allows the deployed
     script's `doPost` endpoint to be called. Nobody can read your Sheet
     data through this URL, and the shared secret from step 3 blocks
     unauthorized writes.)
4. Click **Deploy**, authorize again if prompted, then copy the **Web app
   URL** shown (it looks like
   `https://script.google.com/macros/s/AKfycb.../exec`).

## 6. Configure the app

Add these to your `.env` (see `.env.example`):

```
GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/XXXXXXXX/exec"
GOOGLE_APPS_SCRIPT_SECRET="the-same-value-you-set-in-step-3"
```

Restart the app (`npm run dev` / redeploy). Submit a test enquiry through
`/contact` — it should appear both in `/admin/website-leads` and as a new
row in your Google Sheet within a few seconds.

## Updating the script later

If you change `scripts/google-apps-script/Code.gs` in this repo, you need
to manually re-paste it into the Apps Script editor and create a **new
deployment version** (Deploy → Manage deployments → edit → New version) —
Apps Script doesn't auto-sync with this repo.

## Managing leads from the Sheet

Each row has **Status** and **Priority** columns you can edit by hand —
see the spec's dropdown values:

- **Status:** New, Contacted, Qualified, Meeting Scheduled, Proposal Sent,
  Negotiation, Won, Lost, Not Relevant, Follow Up
- **Priority:** Hot, Warm, Cold

Use Google Sheets' own **Data → Data validation** to turn these into actual
dropdowns, and **Format → Conditional formatting** to color rows by status/
priority — both are one-time manual setup on your Sheet, not something the
script needs to do.

Editing a row in the Sheet does **not** sync back into the app's own
`/admin/website-leads` view (Sheets and the app keep independent copies of
status/priority) — the app is only a live mirror of new submissions, not a
two-way sync.
