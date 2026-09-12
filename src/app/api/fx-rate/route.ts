import { NextRequest, NextResponse } from "next/server";
import { getUsdExchangeRate } from "@/lib/fx-rate";

import { apiErrorResponse } from "@/lib/api-handler";

// Thin server-side proxy for the live USD exchange rate (see
// src/lib/fx-rate.ts) — kept server-side like every other external fetch in
// this app (website audit, competitor analysis) rather than called directly
// from the browser, so the in-memory cache is actually shared across the
// consultant's requests instead of refetching per page load.
export async function GET(req: NextRequest) {
  try {
    const currency = req.nextUrl.searchParams.get("currency");
    if (!currency) return NextResponse.json({ error: "currency is required" }, { status: 400 });
    const rate = await getUsdExchangeRate(currency);
    if (!rate) return NextResponse.json({ available: false }, { status: 200 });
    return NextResponse.json({ available: true, ...rate });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/fx-rate");
  }
}
