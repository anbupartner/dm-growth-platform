import { NextRequest, NextResponse } from "next/server";
import { runSocialCheck } from "@/lib/social-audit";

import { apiErrorResponse } from "@/lib/api-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.url) return NextResponse.json({ error: "url is required" }, { status: 400 });
    const result = await runSocialCheck(body.url);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err, "POST /api/social-audit");
  }
}
