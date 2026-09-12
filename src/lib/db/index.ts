// Database client.
//
// Uses libSQL (`@libsql/client` + `drizzle-orm/libsql`) against one of two
// targets:
//   - TURSO_DATABASE_URL + TURSO_AUTH_TOKEN set → a hosted Turso database.
//     This is what production (and any developer who wants to share live
//     data) should use.
//   - Neither set → a local SQLite file at DATABASE_URL (default
//     ./data/app.db), for zero-config local dev.
//
// This replaced an earlier `node:sqlite` + `drizzle-orm/sqlite-proxy` setup
// that only ever supported the local-file case. That worked fine for
// `next dev`/`next start` on one machine, but broke entirely once this app
// was deployed to Netlify: a deployed serverless function's filesystem is
// read-only at runtime, so every write (INSERT/UPDATE/DELETE — lead
// capture, report/proposal generation, follow-ups, settings, everything)
// failed with "attempt to write a readonly database" the moment the app
// went live. Turso keeps the exact same SQLite dialect and schema (nothing
// in schema.ts changed) while being a real, writable, hosted database that
// every deployed instance — and every developer's machine, if they set the
// same two env vars — can share. See README.md for the one-time setup
// (create a database, get a URL + token, `npm run db:push`).
//
// Local dev with no Turso env vars still works exactly as before, just
// through the same libSQL client instead of node:sqlite.

import { createClient, type Client, type InArgs } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getTableColumns, getTableName } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (tursoUrl && !tursoToken) {
  // Fail loudly and immediately rather than letting every query fail later
  // with an opaque "unauthorized" error from the driver.
  throw new Error(
    "[db] TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is missing — both are required together."
  );
}

let connectionUrl: string;
if (tursoUrl) {
  connectionUrl = tursoUrl;
} else {
  const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
  const resolved = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), /* turbopackIgnore: true */ dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  connectionUrl = `file:${resolved}`;
}

const globalForDb = globalThis as unknown as { __libsql?: Client };
const rawClient: Client =
  globalForDb.__libsql ??
  createClient(
    tursoUrl ? { url: connectionUrl, authToken: tursoToken } : { url: connectionUrl }
  );
if (process.env.NODE_ENV !== "production") globalForDb.__libsql = rawClient;

// WAL + foreign-key pragmas only make sense (and only reliably apply) for
// the local-file path — a hosted Turso database manages its own storage
// engine and connection lifecycle server-side, and per-connection PRAGMAs
// aren't guaranteed to stick across the stateless request protocol Turso's
// hosted client uses.
if (!tursoUrl) {
  rawClient
    .execute("PRAGMA journal_mode = WAL")
    .catch((err) => console.error("[db] WAL pragma failed:", err));
  rawClient
    .execute("PRAGMA foreign_keys = ON")
    .catch((err) => console.error("[db] foreign_keys pragma failed:", err));
}

// --- Lightweight auto-migration ---------------------------------------------
// This project syncs schema.ts to the database with `drizzle-kit push` (no
// migration files) — see package.json's `db:push`. That's a command the
// consultant has to remember to re-run by hand after every schema change,
// but the app itself is updated by copying source files over, not by
// running commands. If a shipped change adds a column (e.g.
// `target_country`) before `db:push` is re-run, every insert/update
// touching that column then fails with a raw "no such column" error —
// which surfaces to the consultant as an unexplained "Internal Server
// Error" on Save & Generate.
//
// To make that whole class of failure impossible, this reconciles each
// table in schema.ts against the actual columns in the database and ALTER
// TABLE ADD COLUMN's anything missing. This only ever adds columns to
// tables that already exist — it never creates tables (initial setup is
// still `npm run setup` / db:push) and never drops, renames, or changes an
// existing column — so it's safe to run unconditionally, as often as this
// self-heal cycle re-fires (see the scheduling section below).
//
// Everything here is batched into as few round trips as the check allows —
// unlike the local `node:sqlite` file this used to run against (where a
// query costs microseconds), each of these is now a real network call to
// Turso, so turning "one round trip per table" into "one round trip total"
// is the difference between an invisible check and a multi-second delay on
// every cold start.
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

async function ensureSchemaColumns(client: Client) {
  const schemaTables: Array<{
    tableName: string;
    columns: Record<string, ReturnType<typeof getTableColumns>[string]>;
  }> = [];
  for (const value of Object.values(schema)) {
    try {
      const tableName = getTableName(value as Parameters<typeof getTableName>[0]);
      const columns = getTableColumns(value as Parameters<typeof getTableColumns>[0]);
      schemaTables.push({ tableName, columns });
    } catch {
      continue; // not a Drizzle table export (e.g. a type or helper)
    }
  }
  if (schemaTables.length === 0) return;

  // One round trip to find out which of these tables actually exist yet
  // (a brand-new install's tables are created by `npm run setup` / db:push,
  // not by this function).
  const existingTablesRes = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table'"
  );
  const existingTableNames = new Set(existingTablesRes.rows.map((r) => String(r.name)));
  const tablesToCheck = schemaTables.filter((t) => existingTableNames.has(t.tableName));
  if (tablesToCheck.length === 0) return;

  // One more round trip carrying a PRAGMA table_info(...) per table.
  const tableInfoResults = await client.batch(
    tablesToCheck.map((t) => `PRAGMA table_info(${quoteIdent(t.tableName)})`),
    "read"
  );

  const alterStatements: { sql: string; args: InArgs }[] = [];
  tablesToCheck.forEach((t, i) => {
    const existingCols = new Set(tableInfoResults[i].rows.map((r) => String(r.name)));
    for (const col of Object.values(t.columns)) {
      if (existingCols.has(col.name)) continue;
      const sqlType = col.getSQLType();
      let ddl = `ALTER TABLE ${quoteIdent(t.tableName)} ADD COLUMN ${quoteIdent(col.name)} ${sqlType}`;
      // Only literal defaults can be used in an ALTER ... ADD COLUMN;
      // $defaultFn callbacks (e.g. randomUUID/new Date for id/timestamps)
      // can't be — those columns are always present on table creation
      // already, so this only matters for the rare notNull column with a
      // literal default.
      if (typeof col.default !== "function" && col.default !== undefined) {
        ddl += ` DEFAULT ${formatSqlLiteral(col.default, sqlType)}`;
        if (col.notNull) ddl += " NOT NULL";
      }
      alterStatements.push({ sql: ddl, args: [] });
    }
  });

  if (alterStatements.length === 0) return;
  try {
    await client.batch(alterStatements, "write");
    for (const stmt of alterStatements) console.log(`[db] auto-migrated: ${stmt.sql}`);
  } catch (err) {
    // Fall back to one-by-one so a single failing ALTER doesn't mask the
    // others (batch() is all-or-nothing on some failure modes).
    for (const stmt of alterStatements) {
      try {
        await client.execute(stmt.sql);
        console.log(`[db] auto-migrated: ${stmt.sql}`);
      } catch (innerErr) {
        console.error(`[db] auto-migration failed for "${stmt.sql}":`, innerErr);
      }
    }
    console.error("[db] batched auto-migration failed, applied individually instead:", err);
  }
}

// --- Lightweight auto-migration: brand-new tables ---------------------------
// ensureSchemaColumns above deliberately only ever adds columns to tables
// that already exist — generically deriving full DDL (primary keys,
// foreign keys, defaults) from Drizzle's column metadata is unreliable.
// That's fine for column additions, but the Proposals and Lead Billing
// features each added whole new tables, which an already-running install
// (schema updates ship as source-file diffs, not `db:push` runs — see the
// comment above ensureSchemaColumns) would never get. Hand-written,
// idempotent `CREATE TABLE IF NOT EXISTS`, matching schema.ts exactly —
// batched into one round trip.
async function ensureNewTables(client: Client) {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS "proposals" (
        "id" text PRIMARY KEY NOT NULL,
        "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
        "report_snapshot_id" text,
        "version" integer DEFAULT 1 NOT NULL,
        "packages" text NOT NULL,
        "terms_text" text,
        "valid_until" integer,
        "pdf_file_name" text,
        "created_at" integer NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "lead_billing" (
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
      )`,
      `CREATE TABLE IF NOT EXISTS "billing_payments" (
        "id" text PRIMARY KEY NOT NULL,
        "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "amount" real NOT NULL,
        "payment_date" integer NOT NULL,
        "note" text,
        "created_at" integer NOT NULL
      )`,
    ],
    "write"
  );
}

// --- Lightweight auto-seed: benchmark data files ----------------------------
// The Benchmark Database (data/benchmarks/*.json) is the source of truth for
// per-platform, per-industry CPC/CTR/CVR/CPM/CPV/Profit-Margin starting
// points (see calculations.ts's resolveBenchmarkMetric and the Benchmarks
// page). scripts/seed.ts loads these files into a brand-new install, but an
// already-running consultant install never re-runs that script — updates
// ship as source-file diffs to the same long-running process, not as
// commands to run. So whenever a benchmark data file gains new rows (a new
// industry, a new platform/channel), this reconciles the live `benchmarks`
// table against every file in data/benchmarks/ and inserts only the rows
// that are genuinely missing.
//
// Uniqueness key: platform + industry + metric + campaignType (matching how
// the Benchmarks page's filters and calculations.ts's resolveBenchmarkMetric
// look a row up). This only ever INSERTs a row that doesn't already exist by
// that key — it never updates or overwrites, so a consultant's edit (or a
// disabled row, or a PATCH-versioned supersession) from the Benchmarks page
// is never touched by a later data-file update.
//
// Reads the entire existing key set in ONE query and inserts anything
// missing in batches — not one exists-check + one insert per row (there are
// several hundred benchmark rows across 8 files; at real network latency to
// a hosted database, one round trip per row would turn a cold start into a
// multi-minute wait instead of a sub-second check).
async function ensureBenchmarkSeedFiles(client: Client) {
  const tableExistsRes = await client.execute(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'benchmarks'"
  );
  if (tableExistsRes.rows.length === 0) return; // brand-new install — scripts/seed.ts seeds this on first run

  const dir = path.join(process.cwd(), /* turbopackIgnore: true */ "data", "benchmarks");
  if (!fs.existsSync(dir)) return;

  const existingRes = await client.execute(
    "SELECT platform, industry, metric, campaign_type FROM benchmarks"
  );
  const keyOf = (platform: string, industry: string, metric: string, campaignType: string | null) =>
    `${platform} ${industry} ${metric} ${campaignType ?? ""}`;
  const existingKeys = new Set(
    existingRes.rows.map((r) =>
      keyOf(String(r.platform), String(r.industry), String(r.metric), r.campaign_type as string | null)
    )
  );

  const toInsert: { sql: string; args: InArgs }[] = [];
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
      const key = keyOf(platform, industry, metric, campaignType);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key); // guards against duplicate rows within/across files in the same pass
      // schema.ts declares created_at/updated_at as integer mode "timestamp"
      // (Drizzle stores/reads these as Unix *seconds*, not milliseconds —
      // unlike mode "timestamp_ms" used nowhere in this schema).
      const now = Math.floor(Date.now() / 1000);
      toInsert.push({
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
    }
  }

  if (toInsert.length === 0) return;

  // Chunked, since a single batch request carrying every row of a brand-new
  // seed (several hundred) may exceed what one request should reasonably
  // carry.
  const CHUNK = 200;
  let added = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    try {
      await client.batch(chunk, "write");
      added += chunk.length;
    } catch (err) {
      console.error(`[db] benchmark seed batch insert failed (rows ${i}-${i + chunk.length}):`, err);
    }
  }
  if (added > 0) console.log(`[db] auto-seeded ${added} benchmark row(s) from data/benchmarks/*.json`);
}

// --- Self-heal scheduling ----------------------------------------------
// Re-run the checks above on a throttle rather than once at module load —
// a long-running `next dev` process (or a warm Netlify function instance)
// keeps the same process across every file update the consultant receives,
// and only re-evaluating this module when ITS OWN import graph changes
// (schema.ts) would miss a data-file-only update (see the git history of
// this comment for the exact incident that motivated this: new benchmark
// rows shipped with no schema.ts/db/index.ts change never reached a
// long-running process's database). Re-running on a short throttle instead
// self-heals on the next request no matter what kind of file changed —
// code, schema, or pure data.
//
// The throttle is longer than the original 5s local-file version (60s) —
// every check below is now a real network round trip rather than an
// in-process read, so there's real cost to re-running it, and a hosted,
// shared database doesn't need "another consultant's machine changed a
// file two seconds ago" responsiveness the way a single local file did.
// A fresh serverless cold start always re-runs it once regardless of this
// throttle (module-level state doesn't survive a cold start), which is
// exactly the case that actually matters after a new deploy.
const SELF_HEAL_INTERVAL_MS = 60_000;
const globalForSelfHeal = globalThis as unknown as {
  __dbSelfHealAt?: number;
  __dbSelfHealPromise?: Promise<void>;
};

async function runSelfHeal() {
  await ensureSchemaColumns(rawClient);
  await ensureNewTables(rawClient);
  await ensureBenchmarkSeedFiles(rawClient);
}

function maybeRunSelfHeal(): Promise<void> {
  const last = globalForSelfHeal.__dbSelfHealAt ?? 0;
  if (Date.now() - last < SELF_HEAL_INTERVAL_MS) return Promise.resolve();
  // Coalesce concurrent callers onto one in-flight run instead of firing
  // the same set of checks once per concurrent request.
  if (!globalForSelfHeal.__dbSelfHealPromise) {
    globalForSelfHeal.__dbSelfHealPromise = runSelfHeal()
      .catch((err) => console.error("[db] self-heal cycle failed:", err))
      .finally(() => {
        globalForSelfHeal.__dbSelfHealAt = Date.now();
        globalForSelfHeal.__dbSelfHealPromise = undefined;
      });
  }
  return globalForSelfHeal.__dbSelfHealPromise;
}

// Wrap the raw libSQL client so every query the app issues first waits for
// the (throttled) self-heal check — the same "run before every query, cheap
// no-op when nothing's due" pattern the old node:sqlite proxy callback
// used. Self-heal itself queries `rawClient` directly (not this wrapped
// `client`), so it never recurses into itself.
const client = new Proxy(rawClient, {
  get(target, prop, receiver) {
    if (prop === "execute" || prop === "batch") {
      const orig = Reflect.get(target, prop, receiver) as (...args: unknown[]) => Promise<unknown>;
      return async (...args: unknown[]) => {
        await maybeRunSelfHeal();
        return orig.apply(target, args);
      };
    }
    return Reflect.get(target, prop, receiver);
  },
}) as Client;

export const db = drizzle(client, { schema });
