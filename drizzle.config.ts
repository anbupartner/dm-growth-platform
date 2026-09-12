import type { Config } from "drizzle-kit";
import "dotenv/config";

// Mirrors src/lib/db/index.ts's own connection logic: push against the
// hosted Turso database when TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are set
// (production, and any dev machine pointed at the shared database), or the
// local SQLite file otherwise.
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

export default (tursoUrl
  ? {
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dialect: "turso",
      dbCredentials: {
        url: tursoUrl,
        authToken: tursoToken,
      },
    }
  : {
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: {
        url: process.env.DATABASE_URL ?? "./data/app.db",
      },
    }) satisfies Config;
