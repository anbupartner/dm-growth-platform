import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarks } from "@/lib/db/schema";

import { apiErrorResponse } from "@/lib/api-handler";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Basic CSV split (handles quoted commas).
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    let rows: Record<string, string>[];
    try {
      // Accept either raw CSV text or a JSON array.
      if (body.trim().startsWith("[")) {
        rows = JSON.parse(body);
      } else {
        rows = parseCsv(body);
      }
    } catch {
      return NextResponse.json({ error: "Could not parse import payload as CSV or JSON." }, { status: 400 });
    }

    let imported = 0;
    for (const row of rows) {
      if (!row.platform || !row.industry || !row.metric || !row.value || !row.unit) continue;
      await db.insert(benchmarks).values({
        platform: row.platform,
        industry: row.industry,
        metric: row.metric,
        campaignType: row.campaignType || null,
        value: Number(row.value),
        unit: row.unit,
        currency: row.currency || "USD",
        region: row.region || "Global",
        source: row.source || null,
        sourceUrl: row.sourceUrl || null,
        benchmarkYear: row.benchmarkYear || null,
        status: row.status || "active",
        notes: row.notes || null,
      });
      imported++;
    }

    return NextResponse.json({ imported });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/benchmarks/import");
  }
}
