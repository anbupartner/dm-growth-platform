# Restore point — dm-growth-platform-backup-20260908-0611.zip

Taken: 2026-09-08 ~06:12 UTC (Asia/Calcutta ~11:42, 2026-09-08)

Source: `E:\My Project\Dm Project\dm-growth-platform` (live machine, via Claude's device bridge — not a shell snapshot)

## What this snapshot captures

- **Source code**: the full `src/`, `public/`, and `scripts/` trees, reconstructed from the cloud-workspace git repository at commit `b5b0db5` (tip of `main`) via `git archive` — byte-identical to what's shipped to the device, since every round ships with a content diff check before committing.
- **Root config**: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `drizzle.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`, `README.md`, `HOW_TO_APPLY.md`, `AGENTS.md`, `CLAUDE.md`, `.env`, `next-env.d.ts`.
- **Live database**: `data/app.db`, `data/app.db-shm`, `data/app.db-wal` — staged fresh from the device at backup time.
- **Benchmark seed data**: all 9 JSON files in `data/benchmarks/`.
- **Generated PDFs**: every report PDF in `data/reports/` (16 files) and every proposal PDF in `data/proposals/` (17 files) — staged fresh from the device at backup time.

**Not included**: `node_modules/` and `.next/` (rebuildable via `npm install` / `npm run build`), the `backups/` folder itself (avoids nesting old backups inside new ones), the `Claude outputs/` folder (delivery-only working files — their content already lives in `src/`), and `pitch-icons.zip` at the project root (a one-time delivery file from an earlier round, not source or live data — still pending extraction into `public/pitch-icons/` on the user's machine; see "Known state" below).

## How to restore

**Full restore** (new machine or full rollback):
1. Extract this zip to your project folder.
2. Run `npm install` to rebuild `node_modules/`.
3. Run `npm run build` (or `npm run dev`) to regenerate `.next/`.
4. The `.env` and live database are already included — no further setup needed.

**Database-only restore** (roll back data without touching code):
1. Stop the running app.
2. Replace `data/app.db`, `data/app.db-shm`, and `data/app.db-wal` with the copies from this zip.
3. Restart the app.

**Single-file restore** (undo one bad edit):
1. Extract just the one file you need from this zip (e.g. a file under `src/`).
2. Copy it over the live copy on your machine.

## Git history (code-only, cloud-workspace side — see caveat below)

One commit shipped since the previous restore point (`dm-growth-platform-backup-20260907-1836.zip`, tip `1cd06c3`):

- `b5b0db5` — Add follow-up badge, clickable dashboard cards, and desktop notification toggle (sidebar/mobile badge showing overdue+today follow-up count; Dashboard's three follow-up stat tiles now link to `/follow-ups` and its new `#today`/`#upcoming` anchors; a real, fully-functional Desktop Notifications toggle in Settings — browser permission request, 60s polling, deduped notifications via a new `useFollowUpAlerts` hook; new `consultant_settings.desktop_notifications_enabled` column, self-migrating).

## Known state at this snapshot

- **Follow-ups**: the sidebar "Follow-ups" nav item now carries a live badge (overdue + due-today count) in the desktop sidebar, mobile slide-over menu, and mobile bottom bar. The Follow-ups page itself gained `#overdue`/`#today`/`#upcoming` section anchors.
- **Dashboard**: the "Follow-ups Due", "Today's Follow-ups", and "Upcoming Follow-ups" stat tiles are now clickable — they navigate to the Follow-ups page (the aggregate tile) or jump straight to the matching section (the today/upcoming tiles).
- **Desktop notifications**: new optional Settings toggle. Off by default. When turned on, requests real browser notification permission at that moment (never automatically) and, once granted, a background poller checks every 60 seconds for follow-ups newly overdue or due today and fires a real OS desktop notification for each (deduped per-browser via `localStorage`, so nothing repeats). Unsupported-browser and blocked-permission states are both handled with inline messaging instead of a broken control.
- **Presentation (in-app "Report tab" + `.pptx` export)**: full 12-slide master template (dark-charcoal + green, Cambria/Calibri, feather-icon-in-circle motif), the large-empty-areas layout fix, and Slide 4's green/white journey-strip restyle — all live in both the on-screen preview and the downloadable `.pptx`.
- **Report PDF (audit report)**: rebuilt onto the house design system in an earlier round (Inter font, continuous page flow, orphan-safe headings), then switched its color palette specifically to match the website's own brand — indigo (`#4f46e5`) primary accent, slate grays, amber/red semantic colors for score bands and problem callouts — replacing the green/bronze it briefly shared with the Proposal PDF.
- **Proposal PDF**: still on its own green/bronze "Proposal Documentation" house palette (Inter font, continuous flow, orphan-safe headings, green section headings, cleaned-up pricing cards) — the two PDF types intentionally carry two different palettes.
- **Proposal builder**: sections 1–6 fully numbered per the user's outline (Executive Summary through Next Steps), Commercial Terms split into 4.1 Pricing packages / 4.2 Project Fee Discounts (shared discount schedule gated by an explicit checkbox), Quick Proposal flow for brand-new customers with no audit, INR default currency for new installs.
- **Error handling**: all 34 API route files wrapped with server-side logging + clean JSON error responses, client silent-failure fixes on the Leads/Proposals/Reports list pages, a root error boundary, and the PDF-generation orphaned-row fix.
- **Git version history**: lives only in Claude's cloud workspace (see caveat below) — one commit per shipped round, tip at `b5b0db5`.

## Caveat on git history

This git history lives only in Claude's cloud workspace, not as a `.git` folder inside the actual project folder on your machine — there's no shell access to your Windows machine in this session, only file staging/listing/commit tools. This zip-backup convention remains the way to get a restore point onto your own machine; the git commit history is this session's own internal safety net for reverting a bad in-progress edit before it ships.

## Outstanding action item

`pitch-icons.zip` is still sitting at the project root, unextracted (from an earlier round). Right-click → Extract All into the project's `public/` folder (so it produces `public/pitch-icons/`), then delete the zip. Until that's done, the in-app presentation preview still works (it uses inline icons, not the PNGs), but the downloaded `.pptx`'s icons will be missing/broken.

It's also worth doing one real-world check of the new desktop notification feature: enable it in Settings on a follow-up that's actually due today or overdue, and confirm the OS-level popup itself appears (this was verified in this session up through the permission/UI layer, but the OS popup rendering itself couldn't be confirmed headlessly).
