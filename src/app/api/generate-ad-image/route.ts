import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consultantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAdImage, type AdImageSize } from "@/lib/ad-image-gen";

import { apiErrorResponse } from "@/lib/api-handler";

const VALID_SIZES: AdImageSize[] = ["1024x1024", "1792x1024", "1024x1792"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const size: AdImageSize = VALID_SIZES.includes(body.size) ? body.size : "1024x1024";

    const settings = await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") });
    const apiKey = settings?.aiImageApiKey ?? "";

    const result = await generateAdImage(apiKey, prompt, size);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Image generation failed." }, { status: 502 });
    }
    return NextResponse.json({ dataUrl: result.dataUrl });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/generate-ad-image");
  }
}
