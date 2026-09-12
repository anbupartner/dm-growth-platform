import { NextRequest, NextResponse } from "next/server";
import { analyzeSite, buildCompetitiveInsights, parseCompetitorUrls } from "@/lib/competitor-analysis";

import { apiErrorResponse } from "@/lib/api-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const competitorUrlsRaw = typeof body.competitorUrls === "string" ? body.competitorUrls : "";
    const clientUrl = typeof body.clientUrl === "string" ? body.clientUrl.trim() : "";

    const urls = parseCompetitorUrls(competitorUrlsRaw);
    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No competitor URLs found — add one or more in the Business Details step first." },
        { status: 400 },
      );
    }

    const [client, competitors] = await Promise.all([
      clientUrl ? analyzeSite(clientUrl, "Your client's site") : Promise.resolve(null),
      Promise.all(urls.map((u) => analyzeSite(u))),
    ]);

    const insights = buildCompetitiveInsights(client, competitors);

    return NextResponse.json({ client, competitors, insights });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/competitor-analysis");
  }
}
