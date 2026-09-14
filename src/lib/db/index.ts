// Database client.
//
// Local dev / single machine: Node's built-in `node:sqlite` (stable as of
// Node 22.5+, no native compilation and no external package required —
// this deliberately avoids better-sqlite3, whose native build can fail on
// machines without build tools or with restricted network access to
// download prebuilt binaries).
//
// Production / cross-device sync: swap this for a hosted Postgres driver so
// every device talking to the same deployed app shares the same data. Steps:
//   1. npm install drizzle-orm pg (or @neondatabase/serverless for Neon)
//   2. Replace the block below with:
//        import { drizzle } from "drizzle-orm/node-postgres";
//        import { Pool } from "pg";
//        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//        export const db = drizzle(pool, { schema });
//   3. Run `npx drizzle-kit push` against the Postgres DATABASE_URL.
// See README.md → "Going to production: cross-device sync" for the full walkthrough.

import { DatabaseSync, type StatementSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { getTableColumns, getTableName } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
const resolved = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), /* turbopackIgnore: true */ dbPath);
fs.mkdirSync(path.dirname(resolved), { recursive: true });

const globalForDb = globalThis as unknown as { __sqlite?: DatabaseSync };
const sqlite = globalForDb.__sqlite ?? new DatabaseSync(resolved);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");
if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

// --- Lightweight auto-migration ---------------------------------------------
// This project syncs schema.ts to the SQLite file with `drizzle-kit push`
// (no migration files) — see package.json's `db:push`. That's a command the
// consultant has to remember to re-run by hand after every schema change,
// but the app itself is updated by copying source files over, not by running
// commands. If a shipped change adds a column (e.g. `target_country`) before
// `db:push` is re-run, every insert/update touching that column then fails
// with a raw "no such column" error — which surfaces to the consultant as an
// unexplained "Internal Server Error" on Save & Generate.
//
// To make that whole class of failure impossible, every time this module
// loads it reconciles each table in schema.ts against the actual columns in
// the SQLite file and ALTER TABLE ADD COLUMN's anything missing. This only
// ever adds columns to tables that already exist — it never creates tables
// (initial setup is still `npm run setup` / db:push) and never drops,
// renames, or changes an existing column — so it's safe to run
// unconditionally, as often as this module re-evaluates.
//
// Deliberately NOT gated behind a "have I already run this process?" latch:
// a long-running `next dev` server keeps the same Node process (and the same
// globalThis) across every file update the consultant receives, so a
// once-per-process guard would only ever catch the very first schema change
// after a cold start — any later shipped column addition would silently
// need a full server restart to pick up, reintroducing the exact "Internal
// Server Error" this was built to prevent. Turbopack re-evaluates this
// module on the next request whenever schema.ts (a direct import) changes,
// which is exactly when the check needs to re-run — so letting it run every
// time is what makes updates self-heal without a restart. The check itself
// is a handful of synchronous, in-process PRAGMA/ALTER statements per table,
// so re-running it costs virtually nothing when there's nothing to do.
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function formatSqlLiteral(value: unknown, sqlType: string): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0"; // sqlite has no bool type; drizzle stores as 0/1
  if (typeof value === "number") return String(value);
  if (sqlType === "integer" && value instanceof Date) return String(value.getTime());
  return `'${String(value).replace(/'/g, "''")}'`;
}

function ensureSchemaColumns(db: DatabaseSync) {
  for (const value of Object.values(schema)) {
    let tableName: string;
    let columns: Record<string, ReturnType<typeof getTableColumns>[string]>;
    try {
      tableName = getTableName(value as Parameters<typeof getTableName>[0]);
      columns = getTableColumns(value as Parameters<typeof getTableColumns>[0]);
    } catch {
      continue; // not a Drizzle table export (e.g. a type or helper)
    }

    const tableExists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName);
    if (!tableExists) continue; // brand-new install — `npm run setup` creates it

    const existingCols = new Set(
      (db.prepare(`PRAGMA table_info(${quoteIdent(tableName)})`).all() as Array<{ name: string }>).map(
        (r) => r.name
      )
    );

    for (const col of Object.values(columns)) {
      if (existingCols.has(col.name)) continue;
      const sqlType = col.getSQLType();
      let ddl = `ALTER TABLE ${quoteIdent(tableName)} ADD COLUMN ${quoteIdent(col.name)} ${sqlType}`;
      // Only literal defaults can be used in an ALTER ... ADD COLUMN; $defaultFn
      // callbacks (e.g. randomUUID/new Date for id/timestamps) can't be — those
      // columns are always present on table creation already, so this only
      // matters for the rare notNull column with a literal default.
      if (typeof col.default !== "function" && col.default !== undefined) {
        ddl += ` DEFAULT ${formatSqlLiteral(col.default, sqlType)}`;
        if (col.notNull) ddl += " NOT NULL";
      }
      try {
        db.exec(ddl);
        console.log(`[db] auto-migrated: added column "${tableName}"."${col.name}"`);
      } catch (err) {
        console.error(`[db] auto-migration failed for "${tableName}"."${col.name}":`, err);
      }
    }
  }
}

// --- Lightweight auto-migration: brand-new tables ---------------------------
// ensureSchemaColumns above deliberately only ever adds columns to tables
// that already exist — it never creates a table, since generically deriving
// full DDL (primary keys, foreign keys, defaults) from Drizzle's column
// metadata is unreliable. That's fine for column additions, but the
// Proposals feature added a whole new `proposals` table, which an
// already-running install (schema updates ship as source-file diffs, not
// `db:push` runs — see the comment above ensureSchemaColumns) would never
// get. Hand-written, idempotent `CREATE TABLE IF NOT EXISTS`, matching
// schema.ts's `proposals` table exactly — same "runs unconditionally, safe
// to re-run every module load" pattern as the rest of this file.
function ensureProposalsTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "proposals" (
      "id" text PRIMARY KEY NOT NULL,
      "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
      "report_snapshot_id" text,
      "version" integer DEFAULT 1 NOT NULL,
      "packages" text NOT NULL,
      "terms_text" text,
      "valid_until" integer,
      "pdf_file_name" text,
      "created_at" integer NOT NULL
    )
  `);
}

// Same reasoning as ensureProposalsTable above — the Lead Billing feature
// added two whole new tables (lead_billing, billing_payments), which
// ensureSchemaColumns deliberately never creates on its own.
function ensureLeadBillingTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "lead_billing" (
      "lead_id" text PRIMARY KEY NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
      "status" text DEFAULT 'ACTIVE' NOT NULL,
      "advance_amount" real,
      "monthly_fee_amount" real,
      "project_fee_amount" real,
      "currency" text,
      "billing_notes" text,
      "canceled_at" integer,
      "resumed_at" integer,
      "created_at" integer NOT NULL,
      "updated_at" integer NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS "billing_payments" (
      "id" text PRIMARY KEY NOT NULL,
      "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "amount" real NOT NULL,
      "payment_date" integer NOT NULL,
      "note" text,
      "created_at" integer NOT NULL
    )
  `);
}

// Same reasoning as ensureProposalsTable above — supporting-document uploads
// added a whole new `lead_documents` table.
function ensureLeadDocumentsTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "lead_documents" (
      "id" text PRIMARY KEY NOT NULL,
      "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
      "file_name" text NOT NULL,
      "mime_type" text NOT NULL,
      "file_size" integer NOT NULL,
      "file_data" text NOT NULL,
      "created_at" integer NOT NULL
    )
  `);
}

// Same reasoning as ensureProposalsTable above — the Daily To-Do's feature
// added a whole new `daily_tasks` table.
function ensureDailyTasksTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "daily_tasks" (
      "id" text PRIMARY KEY NOT NULL,
      "title" text NOT NULL,
      "note" text,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "priority" text DEFAULT 'MEDIUM' NOT NULL,
      "task_date" integer NOT NULL,
      "end_date" integer,
      "reminder_at" integer,
      "created_at" integer NOT NULL,
      "updated_at" integer NOT NULL
    )
  `);
}

// --- Lightweight auto-seed: benchmark data files ----------------------------
// The Benchmark Database (data/benchmarks/*.json) is the source of truth for
// per-platform, per-industry CPC/CTR/CVR/CPM/CPV/Profit-Margin starting
// points (see calculations.ts's resolveBenchmarkMetric and the Benchmarks
// page). scripts/seed.ts loads these files into a brand-new install, but an
// already-running consultant install never re-runs that script — updates
// ship as source-file diffs to the same long-running `next dev` process, not
// as commands to run. So whenever a benchmark data file gains new rows (a
// new industry, a new platform/channel), this reconciles the live
// `benchmarks` table against every file in data/benchmarks/ on every module
// load and inserts only the rows that are genuinely missing.
//
// Uniqueness key: platform + industry + metric + campaignType (matching how
// the Benchmarks page's filters and calculations.ts's resolveBenchmarkMetric
// look a row up). This only ever INSERTs a row that doesn't already exist by
// that key — it never updates or overwrites, so a consultant's edit (or a
// disabled row, or a PATCH-versioned supersession) from the Benchmarks page
// is never touched by a later data-file update. Same reasoning as
// ensureSchemaColumns above for why this is safe and cheap to run
// unconditionally on every load.
function ensureBenchmarkSeedFiles(db: DatabaseSync) {
  const tableExists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'benchmarks'")
    .get();
  if (!tableExists) return; // brand-new install — scripts/seed.ts seeds this table on first run

  const dir = path.join(process.cwd(), /* turbopackIgnore: true */ "data", "benchmarks");
  if (!fs.existsSync(dir)) return;

  // campaignType can be NULL, and NULL = NULL is never true in SQL — this
  // query needs `IS` (not `=`) so a row with a null campaignType correctly
  // matches an existing null-campaignType row instead of always looking new.
  const existsStmt = db.prepare(
    "SELECT 1 FROM benchmarks WHERE platform = ? AND industry = ? AND metric = ? AND campaign_type IS ?"
  );
  const insertStmt = db.prepare(
    `INSERT INTO benchmarks
       (id, platform, industry, metric, campaign_type, value, unit, currency, region, source, source_url, benchmark_year, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let added = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    let rows: Array<Record<string, unknown>>;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (!Array.isArray(parsed)) continue; // e.g. benchmark_metadata.json — not a row list
      rows = parsed;
    } catch (err) {
      console.error(`[db] benchmark seed file "${file}" is not valid JSON, skipping:`, err);
      continue;
    }
    for (const row of rows) {
      const platform = String(row.platform);
      const industry = String(row.industry);
      const metric = String(row.metric);
      const campaignType = (row.campaignType as string | undefined) ?? null;
      try {
        if (existsStmt.get(platform, industry, metric, campaignType)) continue;
        // schema.ts declares created_at/updated_at as integer mode "timestamp"
        // (Drizzle stores/reads these as Unix *seconds*, not milliseconds —
        // unlike mode "timestamp_ms" used nowhere in this schema).
        const now = Math.floor(Date.now() / 1000);
        insertStmt.run(
          randomUUID(),
          platform,
          industry,
          metric,
          campaignType,
          Number(row.value),
          String(row.unit),
          (row.currency as string) ?? "USD",
          (row.region as string) ?? "Global",
          (row.source as string) ?? null,
          (row.sourceUrl as string) ?? null,
          (row.benchmarkYear as string) ?? null,
          (row.status as string) ?? "active",
          (row.notes as string) ?? null,
          now,
          now
        );
        added++;
      } catch (err) {
        console.error(`[db] benchmark seed failed for ${platform}/${industry}/${metric}:`, err);
      }
    }
  }
  if (added > 0) console.log(`[db] auto-seeded ${added} benchmark row(s) from data/benchmarks/*.json`);
}

// --- Self-heal scheduling -----------------------------------------------
// All three checks above were originally each called once, directly, at
// module top-level — correct in theory ("re-runs whenever this module
// re-evaluates"), but that turned out to depend on an assumption that
// didn't always hold: Turbopack only re-evaluates a module when something
// in ITS OWN import graph changes. `ensureSchemaColumns` re-runs reliably
// because every shipped column addition also touches `schema.ts`, which
// this module directly imports. But `ensureBenchmarkSeedFiles` reads
// data/benchmarks/*.json with plain `fs.readFileSync`, not `import` — so a
// shipped update that only adds new rows to those JSON files (no schema.ts
// or db/index.ts change at all) never invalidates this module, and the
// already-running `next dev` process keeps using its first, stale read of
// the benchmarks table forever, with no error and no restart prompt. That's
// exactly what happened when new business-vertical benchmark rows were
// shipped without a matching code change: the consultant's server never
// re-ran the seed check, so the new rows silently never made it into their
// database's `benchmarks` table, and the wizard's "Use industry benchmark"
// button had nothing to show for those verticals.
//
// Fix: don't rely on incidental module invalidation at all. Re-run every
// check on a short throttle (a few seconds) from inside the query path
// itself, so it self-heals on the next request no matter what kind of file
// changed — code, schema, or pure data. The checks are cheap, idempotent,
// in-process reads (see the comments above each function), so a few extra
// runs per minute costs nothing; the throttle just avoids doing the full
// file-system + table scan on literally every single query.
const SELF_HEAL_INTERVAL_MS = 5_000;
const globalForSelfHeal = globalThis as unknown as { __dbSelfHealAt?: number };

function runSelfHeal() {
  ensureSchemaColumns(sqlite);
  ensureProposalsTable(sqlite);
  ensureLeadBillingTables(sqlite);
  ensureLeadDocumentsTable(sqlite);
  ensureDailyTasksTable(sqlite);
  ensureBenchmarkSeedFiles(sqlite);
  globalForSelfHeal.__dbSelfHealAt = Date.now();
}

function maybeRunSelfHeal() {
  const last = globalForSelfHeal.__dbSelfHealAt ?? 0;
  if (Date.now() - last >= SELF_HEAL_INTERVAL_MS) runSelfHeal();
}

runSelfHeal(); // always run once when this module first loads

const statementCache = new Map<string, StatementSync>();
function prepare(sql: string): StatementSync {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = sqlite.prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

// Bridges Drizzle's async sqlite-proxy contract onto node:sqlite's
// synchronous API. "all"/"get"/"values" all return rows as plain arrays
// (setReturnArrays) since that's what Drizzle's row mapper expects; "run" is
// used for statements where the caller doesn't need rows back.
export const db = drizzle(
  async (sqlText, params, method) => {
    maybeRunSelfHeal();
    const stmt = prepare(sqlText);
    if (method === "run") {
      stmt.run(...params);
      return { rows: [] };
    }
    stmt.setReturnArrays(true);
    if (method === "get") {
      const row = stmt.get(...params) as unknown as unknown[] | undefined;
      return { rows: (row ?? undefined) as unknown as unknown[] };
    }
    const rows = stmt.all(...params) as unknown as unknown[][];
    return { rows };
  },
  { schema }
);

export { sqlite };
