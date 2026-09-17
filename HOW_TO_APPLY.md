# Lead Billing feature — manual install (your computer isn't linked to this chat)

This zip contains 7 files, in the exact same folder structure as your project.
Extract the zip, then copy each file into the matching path inside:

    E:\My Project\Dm Project\dm-growth-platform\

Overwrite the existing files when asked — these replace 4 files that already exist
and add 3 brand-new files/folders.

## Files and what they do

**Modified (overwrite the existing file):**
- `src/lib/db/schema.ts` — adds two new database tables (billing profile + payment ledger)
- `src/lib/db/index.ts` — makes those two new tables auto-create themselves the next
  time the app starts (same self-healing mechanism this app already uses for every
  other update — you do NOT need to run any database command)
- `src/app/api/leads/[id]/route.ts` — includes billing info when loading a lead
- `src/app/leads/[id]/page.tsx` — adds the new "Billing" card to the lead detail page

**New (create these — the folders don't exist yet, just copy the whole path in):**
- `src/app/api/leads/[id]/billing/route.ts`
- `src/app/api/leads/[id]/billing/payments/route.ts`
- `src/app/api/billing/payments/[id]/route.ts`

## After copying

1. If your dev server (`npm run dev`) is running, just refresh the browser — no restart needed.
   (If it's not running, start it as usual with `npm run dev`.).
2. Open any lead's detail page — you'll see a new "Billing" card with:
   - Advance Paid / Monthly Recurring Fee / Project Fee amounts (with currency)
   - An Active/Canceled status with Cancel Billing / Resume Billing buttons
   - A payment log where you can add any payment (Advance, Monthly Fee, Project Fee,
     PPC Ad Spend, or Other) with amount, date and an optional note, and delete a
     mistaken entry.

This has already been tested end-to-end (typecheck, build, and a full live run-through
of every button) before being packaged up here — it's ready to use as-is.

Once your computer reconnects to this chat, future updates will go back to shipping
automatically — this manual step is just a one-time workaround for right now.
