import type { Config } from "drizzle-kit";
import "dotenv/config";

// Pushes the schema straight to Turso when TURSO_DATABASE_URL is set (same
// convention as src/lib/db/index.ts) — that's the database production
// (Netlify) actually reads from, since a local SQLite file can't survive a
// deployed function's read-only filesystem. Falls back to the local SQLite
// file for plain local dev.
const config: Config = process.env.TURSO_DATABASE_URL
  ? {
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dialect: "turso",
      dbCredentials: {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
    }
  : {
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: {
        url: process.env.DATABASE_URL ?? "./data/app.db",
      },
    };

export default config;
