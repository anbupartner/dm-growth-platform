import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consultantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET() {
  try {
    let row = await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") });
    if (!row) {
      [row] = await db.insert(consultantSettings).values({ id: "default" }).returning();
    }
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/settings");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    delete body.id;
    delete body.updatedAt;
    const existing = await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") });
    if (!existing) {
      const [row] = await db
        .insert(consultantSettings)
        .values({ id: "default", ...body })
        .returning();
      return NextResponse.json(row);
    }
    const [row] = await db.update(consultantSettings).set(body).where(eq(consultantSettings.id, "default")).returning();
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/settings");
  }
}
