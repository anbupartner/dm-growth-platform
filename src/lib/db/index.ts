// Database client.
//
// Uses libSQL (@libsql/client) via drizzle-orm/libsql for everything — the
// same client/driver talks to a remote Turso database (TURSO_DATABASE_URL +
// TURSO_AUTH_TOKEN set) or to a local SQLite file (those vars unset, falls
// back to DATABASE_URL / ./data/app.db) with no code branching beyond the
// connection URL. This exists specifically so the app works when deployed to
// Netlify: a Netlify Function's filesystem is read-only outside /tmp, so a
// local SQLite file written by the app itself can't persist writes there —
// pointing at Turso (a real network database) sidesteps that entirely.
// Local dev keeps working exactly as before, hitting a local file, unless
// TURSO_DATABASE_URL is also set locally (e.g. to develop against the same
// data as production).

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getTableColumns, getTableName } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

function resolveUrl(): { url: string; authToken?: string } {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
  const resolved = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), /* turbopackIgnore: true */ dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return { url: `file:${resolved}` };
}

const globalForDb = globalThis as unknown as { __libsqlClient?: Client };
const { url, authToken } = resolveUrl();
const client = globalForDb.__libsqlClient ?? createClient({ url, authToken });
if (process.env.NODE_ENV !== "production") globalForDb.__libsqlClient = client;

export const db = drizzle(client, { schema });
export { client };

// --- Lightweight auto-migration ---------------------------------------------
// This project syncs schema.ts to the database with `drizzle-kit push` (no
// migration files) — see package.json's `db:push`. That's a command the
// consultant has to remember to re-run by hand after every schema change,
// but the app itself is updated by copying source files over, not by running
// commands. If a shipped change adds a column (e.g. `target_country`) before
// `db:push` is re-run, every insert/update touching that column then fails
// with a raw "no such column" error — which surfaces to the consultant as an
// unexplained "Internal Server Error" on Save & Generate.
//
// To make that whole class of failure impossible, every time this module
// loads it reconciles each table in schema.ts against the actual columns in
// the database and ALTER TABLE ADD COLUMN's anything missing. This only
// ever adds columns to tables that already exist — it never creates tables
// (initial setup is still `npm run setup` / db:push) and never drops,
// renames, or changes an existing column — so it's safe to run
// unconditionally, as often as this module re-evaluates.
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

async function tableExists(name: string): Promise<boolean> {
  const res = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [name],
  });
  return res.rows.length > 0;
}

async function ensureSchemaColumns() {
  for (const value of Object.values(schema)) {
    let tableName: string;
    let columns: Record<string, ReturnType<typeof getTableColumns>[string]>;
    try {
      tableName = getTableName(value as Parameters<typeof getTableName>[0]);
      columns = getTableColumns(value as Parameters<typeof getTableColumns>[0]);
    } catch {
      continue; // not a Drizzle table export (e.g. a type or helper)
    }

    if (!(await tableExists(tableName))) continue; // brand-new install — `npm run setup` creates it

    const info = await client.execute(`PRAGMA table_info(${quoteIdent(tableName)})`);
    const existingCols = new Set(info.rows.map((r) => String((r as unknown as { name: string }).name)));

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
        await client.execute(ddl);
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
// metadata is unreliable. Hand-written, idempotent `CREATE TABLE IF NOT
// EXISTS` statements matching schema.ts exactly, same "runs unconditionally,
// safe to re-run every module load" pattern as the rest of this file, cover
// every table added after the very first `db:push` on an already-running
// install.
async function ensureProposalsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "proposals" (
      "id" text PRIMARY KEY NOT NULL,
      "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
      "report_snapshot_id" text,
      "version" integer DEFAULT 1 NOT NULL,
      "packages" text NOT NULL,
      "terms_text" text,
      "valid_until" integer,
      "pdf_file_name" text,
      "pdf_data" text,
      "created_at" integer NOT NULL
    )
  `);
}

async function ensureLeadBillingTables() {
  await client.execute(`
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
  await client.execute(`
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

async function ensureLeadDocumentsTable() {
  await client.execute(`
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

async function ensureDailyTasksTable() {
  await client.execute(`
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
// load and inserts only the rows that are genuinely missing. On Netlify,
// data/benchmarks/*.json may not be present in the deployed function bundle
// (see outputFileTracingIncludes in next.config.ts) — this silently no-ops
// in that case rather than failing; benchmarks there are expected to already
// be seeded into Turso via `npm run db:seed` run once against it directly.
async function ensureBenchmarkSeedFiles() {
  if (!(await tableExists("benchmarks"))) return; // brand-new install — scripts/seed.ts seeds this table on first run

  const dir = path.join(process.cwd(), /* turbopackIgnore: true */ "data", "benchmarks");
  if (!fs.existsSync(dir)) return;

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
        // campaignType can be NULL, and NULL = NULL is never true in SQL —
        // this query needs `IS` (not `=`) so a row with a null campaignType
        // correctly matches an existing null-campaignType row instead of
        // always looking new.
        const existing = await client.execute({
          sql: "SELECT 1 FROM benchmarks WHERE platform = ? AND industry = ? AND metric = ? AND campaign_type IS ?",
          args: [platform, industry, metric, campaignType],
        });
        if (existing.rows.length > 0) continue;
        // schema.ts declares created_at/updated_at as integer mode "timestamp"
        // (Drizzle stores/reads these as Unix *seconds*, not milliseconds —
        // unlike mode "timestamp_ms" used nowhere in this schema).
        const now = Math.floor(Date.now() / 1000);
        await client.execute({
          sql: `INSERT INTO benchmarks
             (id, platform, industry, metric, campaign_type, value, unit, currency, region, source, source_url, benchmark_year, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
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
            now,
          ],
        });
        added++;
      } catch (err) {
        console.error(`[db] benchmark seed failed for ${platform}/${industry}/${metric}:`, err);
      }
    }
  }
  if (added > 0) console.log(`[db] auto-seeded ${added} benchmark row(s) from data/benchmarks/*.json`);
}

// --- Self-heal scheduling -----------------------------------------------
// Runs once when this module first loads (every cold start in production;
// every Turbopack re-evaluation of this module in local dev), then again at
// most once per SELF_HEAL_INTERVAL_MS on the next query, so a long-running
// `next dev` process picks up a shipped schema change without needing a
// restart. The checks are cheap, idempotent, in-process statements (see the
// comments above each function), so re-running them costs virtually nothing
// when there's nothing to do.
const SELF_HEAL_INTERVAL_MS = 5_000;
const globalForSelfHeal = globalThis as unknown as { __dbSelfHealAt?: number; __dbSelfHealPromise?: Promise<void> };

async function runSelfHeal() {
  await ensureSchemaColumns();
  await ensureProposalsTable();
  await ensureLeadBillingTables();
  await ensureLeadDocumentsTable();
  await ensureDailyTasksTable();
  await ensureBenchmarkSeedFiles();
  globalForSelfHeal.__dbSelfHealAt = Date.now();
}

function maybeRunSelfHeal(): Promise<void> {
  const last = globalForSelfHeal.__dbSelfHealAt ?? 0;
  if (Date.now() - last < SELF_HEAL_INTERVAL_MS) return Promise.resolve();
  const inFlight = globalForSelfHeal.__dbSelfHealPromise;
  if (inFlight) return inFlight;
  const promise = runSelfHeal().finally(() => {
    globalForSelfHeal.__dbSelfHealPromise = undefined;
  });
  globalForSelfHeal.__dbSelfHealPromise = promise;
  return promise;
}

// Kicked off once, eagerly, as soon as this module loads — not awaited by
// route handlers (matching the previous node:sqlite version's behavior,
// which also never blocked a query on it). Exported in case a call site
// ever wants to await schema readiness explicitly (e.g. a setup script).
export const dbReady: Promise<void> = runSelfHeal().catch((err) => {
  console.error("[db] initial self-heal failed:", err);
});

// Re-exported for call sites that want to re-trigger the throttled self-heal.
export { maybeRunSelfHeal };
