import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarks } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

export async function GET() {
  try {
    const rows = await db.select().from(benchmarks).orderBy(asc(benchmarks.platform), asc(benchmarks.industry), asc(benchmarks.metric));

    const header = [
      "platform",
      "industry",
      "metric",
      "campaignType",
      "value",
      "unit",
      "currency",
      "region",
      "source",
      "sourceUrl",
      "benchmarkYear",
      "version",
      "status",
      "notes",
    ];
    const lines = [toCsvRow(header)];
    for (const r of rows) {
      lines.push(
        toCsvRow([
          r.platform,
          r.industry,
          r.metric,
          r.campaignType,
          r.value,
          r.unit,
          r.currency,
          r.region,
          r.source,
          r.sourceUrl,
          r.benchmarkYear,
          r.version,
          r.status,
          r.notes,
        ]),
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="benchmarks-export.csv"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/benchmarks/export");
  }
}
