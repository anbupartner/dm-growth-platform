# Restore point — dm-growth-platform-backup-20260912-1851.zip

Taken: 2026-09-12 ~18:51 UTC (Asia/Calcutta ~00:21, 2026-09-13)

Source: `E:\My Project\Dm Project\dm-growth-platform` (live machine, via Claude's device bridge — not a shell snapshot)

## Why this one matters more than usual

This snapshot was taken **immediately before the Turso database migration** (see
`claude/growth-platform-build-summary-addendum-2026-09-12.md` in the project
docs for the full story). It's the last point where the app still runs on the
old `node:sqlite` local-file database layer, and it's your rollback target if
anything about the Turso cutover goes wrong on your machine or in Netlify.

## What this snapshot captures

- **Source code**: the full `src/`, `public/`, and `scripts/` trees (including
  the new `scripts/migrate-turso-import.ts` and `scripts/seed.ts`), reconstructed
  from the cloud-workspace git repository at commit `25a088d` (tip of `main`)
  via `git archive` — byte-identical to what's shipped to the device.
- **Root config**: `package.json`, `package-lock.json`, `tsconfig.json`,
  `next.config.ts`, `drizzle.config.ts`, `eslint.config.mjs`,
  `postcss.config.mjs`, `.gitignore`, `.env.example`, `README.md`,
  `HOW_TO_APPLY.md`, `AGENTS.md`, `CLAUDE.md`.
- **`.env`** — staged fresh from the device at backup time. At the moment of
  this backup it already contains the new `TURSO_DATABASE_URL` /
  `TURSO_AUTH_TOKEN` pair (you'd added them shortly before this backup ran).
  If you ever need to go back to the pre-Turso local-file setup, replace these
  two lines with `DATABASE_URL="./data/app.db"` instead.
- **Old local database**: `data/app.db`, `data/app.db-shm`, `data/app.db-wal`
  — the pre-migration local SQLite file, staged fresh from the device. This is
  the local dev copy, not the production data (see next item).
- **Production data export**: `scripts/migration-data/leads.json`,
  `follow-ups.json`, `billing.json`, `settings.json` — the actual production
  data pulled from the live (pre-Turso) Netlify site on 2026-09-12: 13 leads,
  their follow-ups, billing/payment records, and consultant settings. This is
  what `npm run db:migrate-import` reads to repopulate Turso. **This is the
  single most important thing in this backup** — it can't be re-created once
  the old Netlify deploy is gone. (A raw copy of the original browser-side
  export also lives in `backups/netlify-production-data-export-20260912.zip`.)
- **Benchmark seed data**: all 8 JSON files in `data/benchmarks/`.
- **Generated PDFs**: the report PDFs in `data/reports/` (2 files) and
  proposal PDFs in `data/proposals/` (1 file) present on this machine at
  backup time — staged fresh from the device.

**Not included**: `node_modules/` and `.next/` (rebuildable via `npm install` /
`npm run build`), the `backups/` folder itself (avoids nesting old backups
inside new ones), and the `Claude outputs/` folder (delivery-only working
files — their content already lives in `src/`).

## How to restore

**Full restore** (new machine or full rollback to pre-Turso state):
1. Extract this zip to your project folder.
2. Run `npm install` to rebuild `node_modules/`.
3. Run `npm run build` (or `npm run dev`) to regenerate `.next/`.
4. If rolling back to the old local-file database, edit `.env` and replace
   the two `TURSO_*` lines with `DATABASE_URL="./data/app.db"`.

**Production-data-only restore** (re-run the Turso import from scratch):
1. Make sure `scripts/migration-data/*.json` from this zip are in place.
2. Run `npm run db:migrate-import` — it's idempotent (`onConflictDoNothing` /
   `onConflictDoUpdate`), safe to re-run.

**Local-database-only restore** (roll back local dev data without touching code):
1. Stop the running app.
2. Replace `data/app.db`, `data/app.db-shm`, and `data/app.db-wal` with the
   copies from this zip.
3. Restart the app.

**Single-file restore** (undo one bad edit):
1. Extract just the one file you need from this zip (e.g. a file under `src/`).
2. Copy it over the live copy on your machine.

## Git history (code-only, cloud-workspace side — see caveat below)

Two commits shipped since the previous restore point
(`dm-growth-platform-backup-20260908-0611.zip`, tip `b5b0db5`):

- `113423a` — Widen `.gitignore` ahead of publishing to GitHub.
- `25a088d` — Migrate database layer from `node:sqlite` to Turso (libSQL):
  rewrote `src/lib/db/index.ts` and `drizzle.config.ts` to use
  `@libsql/client` / `drizzle-orm/libsql` against a hosted Turso database
  (with local-file fallback when `TURSO_*` env vars are unset), added
  `scripts/migrate-turso-import.ts` to re-import the production data export,
  and updated `.env.example` with Turso setup instructions. This is the fix
  for the root cause of the production write failures: Netlify's deployed
  function filesystem is read-only, so the old local-SQLite-file approach
  could never be written to once deployed.

## Known state at this snapshot

- **The Turso migration is code-complete but not yet live.** As of this
  backup: the new database code and migration script are on this machine and
  in the cloud-workspace git repo, but production (`dmgrowthplatform.netlify.app`)
  is still running the old code — it has not been redeployed, and Netlify's
  own Environment variables (separate from this machine's `.env`) do not yet
  have `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` set.
- **Deploy method confirmed**: this site has no git-based continuous
  deployment. It's deployed by dragging the full project folder onto
  Netlify's Deploys page ("Netlify Drop"), which runs a real build
  server-side (installs dependencies, builds, packages API routes as
  functions) rather than just publishing static files as-is.
- **What's still needed to actually fix production** (tracked in this
  session, not yet done as of this backup):
  1. Add `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` in Netlify's dashboard
     (Project configuration → Environment variables) — Claude's browser
     automation was blocked by a safety classifier from doing this directly
     (it detected a secrets-store write), so this is a manual step.
  2. Redeploy — drag the project folder onto Netlify's Deploys page again.
  3. Re-run the full live-site QA pass (create a lead via the assessment
     wizard, save a note, complete a follow-up) to confirm writes actually
     succeed in production.
- **Two known UX gaps found during the pre-migration QA pass** (not yet
  fixed, just documented): saving a Note on a lead, and marking a follow-up
  complete, both fail silently on production right now — no error shown to
  the user, just an indefinite "Saving…" state, while the actual `Failed
  query` error only appears in the browser console. Worth a follow-up fix
  once the Turso cutover is confirmed working, so failures (if any ever occur
  again) are visible instead of silent.
- **Outstanding from the previous restore point, still true**: none — the
  `pitch-icons.zip` extraction mentioned in the last restore point is done;
  `public/pitch-icons/*.png` are now tracked in git.

## Caveat on git history

This git history lives only in Claude's cloud workspace, not as a `.git`
folder inside the actual project folder on your machine — there's no shell
access to your Windows machine in this session, only file staging/listing/
commit tools (`device_bash` is not available in this session at all, in fact
— even fewer capabilities than the shell-only-no-network situation from
earlier rounds). This zip-backup convention remains the way to get a restore
point onto your own machine; the git commit history is this session's own
internal safety net for reverting a bad in-progress edit before it ships.
