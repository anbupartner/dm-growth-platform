# Restore point — dm-growth-platform-backup-20260913-1218.zip

Taken: 2026-09-13 ~12:18 UTC

Source: `E:\My Project\Dm Project\dm-growth-platform` (live machine, via Claude's device bridge — not a shell snapshot)

## Why this one matters

This is the first full backup taken since the **rollback to the Sep 8
snapshot** (commit `d369e28`, done at the user's explicit request on
2026-09-13 — see `claude/growth-platform-build-summary-addendum-2026-09-13.md`
in the project docs). Ten commits' worth of work have landed since the
previous zip (`dm-growth-platform-backup-20260913-0807.zip`, tip `9464399`,
taken as a safety net immediately before that rollback was applied) — this
snapshot is the current up-to-date rollback target.

## What this snapshot captures

- **Source code**: the full `src/`, `public/`, and `scripts/` trees,
  reconstructed from the cloud-workspace git repository at commit `1f13d5e`
  (tip of `main`) via `git archive` — byte-identical to what's shipped to
  the device.
- **Root config**: `package.json`, `package-lock.json`, `tsconfig.json`,
  `next.config.ts`, `drizzle.config.ts`, `eslint.config.mjs`,
  `postcss.config.mjs`, `.gitignore`, `.env.example`, `README.md`,
  `HOW_TO_APPLY.md`, `AGENTS.md`, `CLAUDE.md`.
- **`.env`** — staged fresh from the device at backup time.
- **Live database**: `data/app.db`, `data/app.db-shm`, `data/app.db-wal` —
  staged fresh from the device, including the WAL file (recent writes that
  hadn't been checkpointed into `app.db` itself yet are only in there, so
  it's included alongside the main file, not dropped).
- **Benchmark seed data**: all 8 JSON files in `data/benchmarks/`.
- **Generated PDFs**: the report PDFs in `data/reports/` (3 files) and
  proposal PDFs in `data/proposals/` (2 files) present on this machine at
  backup time — staged fresh from the device.

**Not included**: `node_modules/` and `.next/` (rebuildable via `npm install` /
`npm run build`), the `backups/` folder itself (avoids nesting old backups
inside new ones), the `Claude outputs/` folder (delivery-only working files —
their content already lives in `src/`), and two stray files sitting in the
project root that aren't part of this project's tracked source or data:
`- Copy 12-9-26.env` (an old manual copy of `.env` predating the Turso vars)
and `pitch-icons.zip` (design assets, unrelated to app source).

## How to restore

**Full restore** (new machine or full rollback to this point):
1. Extract this zip to your project folder.
2. Run `npm install` to rebuild `node_modules/`.
3. Run `npm run build` (or `npm run dev`) to regenerate `.next/`.

**Database-only restore** (roll back live data without touching code):
1. Stop the running app.
2. Replace `data/app.db`, `data/app.db-shm`, and `data/app.db-wal` with the
   copies from this zip.
3. Restart the app.

**Single-file restore** (undo one bad edit):
1. Extract just the one file you need from this zip (e.g. a file under `src/`).
2. Copy it over the live copy on your machine.

## Git history since the previous restore point

10 commits shipped since `dm-growth-platform-backup-20260913-0807.zip`
(tip `9464399`):

- `d369e28` — Roll back to Sep 8 snapshot at user's explicit request. This
  reverted the Turso/libSQL database migration (back to local `node:sqlite`
  only) and the PDF-storage-in-database fix, and removed the dated Notes
  log feature.
- `4949914` — Group same-day follow-up attempts, make notes editable, sort
  by latest activity.
- `049a2fe` — Add in-app pop-up notifications for lead activity and due
  follow-ups.
- `e4dcbeb` — Add supporting-document uploads to leads.
- `a9ef7c0` — Add a Daily To-Do's tab — a personal task list with
  Pending/Ongoing/Closed status.
- `3b556c6` — Add end date, priority, reminders, and a monthly calendar to
  Daily To-Do's.
- `4d331ea` — Categorize the Master Services List into 16 categories across
  3 groups.
- `9e417d4` — Add a customer Gender field to leads (Male/Female/Trans/
  Prefer not to say).
- `8eebaff` — Add an ongoing-task count badge to the Daily To-Do's nav item.
- `1f13d5e` — Fix Daily To-Do's tasks showing Overdue on their own due date.

## Known state at this snapshot

- **The app currently runs on local `node:sqlite` only** — the Turso
  migration from earlier this week is reverted (that was the whole point of
  the Sep 8 rollback). `src/lib/db/index.ts` reads `DATABASE_URL` and falls
  back to `./data/app.db` when it's unset.
- **`.env` on the device still has `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`
  set, left over from before the rollback.** The current code doesn't read
  those variable names (it reads `DATABASE_URL`), so they're harmless dead
  weight right now, not a bug — but worth knowing they're there if you're
  ever confused about which database the app is actually using. This zip
  preserves `.env` exactly as found, including those unused lines.
- **This means the read-only-filesystem problem that motivated the Turso
  migration in the first place is back.** If this project folder — as it
  stands in this snapshot — is deployed to Netlify via Netlify Drop again,
  every write (new leads, follow-ups, settings, proposals) will fail there
  the same way it did before, because Netlify's deployed function
  filesystem can't write to a local SQLite file. This snapshot is a rollback
  target the user explicitly asked for; it is not a recommendation to
  redeploy in this state.
- **Four files from the pre-rollback (Turso-era) code still exist on the
  device but were deleted in the Sep 8 snapshot this rolled back to** —
  flagged in the previous addendum as still needing manual removal for a
  fully faithful restore, and as of this backup still not confirmed removed:
  `RESTORE.md` (this file replaces that concern going forward), `scripts/migrate-turso-import.ts`,
  `src/app/api/leads/[id]/notes/route.ts`, `src/lib/pdf-storage.ts`. None of
  these are referenced by the current (rolled-back) code, so they're inert,
  not broken — just orphaned. Safe to delete by hand whenever convenient, or
  leave alone; this backup captures them as absent (they're not in the git
  tree at `1f13d5e`, so they're not in this zip either), matching how the
  reverted code expects things to look.
- **Nothing has been pushed to Netlify this session.** Production
  (`dmgrowthplatform.netlify.app`) is unaffected by any of this and reflects
  whatever was last manually deployed there.

## Caveat on git history

This git history lives only in Claude's cloud workspace, not as a `.git`
folder inside the actual project folder on your machine's connected drive —
this session has no shell access to your Windows machine, only file staging/
listing/commit tools. (Separately, a `.git` folder was observed to already
exist inside the project folder on the device itself during this backup —
if you or an earlier session set up git directly on your machine, that
history is independent of the cloud-workspace one described here and this
session can't inspect or reconcile the two.) This zip-backup convention
remains the way to get a restore point onto your own machine; the
cloud-workspace git commit history is this session's own internal safety
net for reverting a bad in-progress edit before it ships.
