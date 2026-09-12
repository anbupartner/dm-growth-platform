import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, followUps } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { nextCustomerId } from "@/lib/ids";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const rows = status
      ? await db.select().from(leads).where(eq(leads.status, status)).orderBy(desc(leads.createdAt))
      : await db.select().from(leads).orderBy(desc(leads.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customerName || !body.businessName) {
      return NextResponse.json({ error: "customerName and businessName are required" }, { status: 400 });
    }
    const customerId = await nextCustomerId();
    const [lead] = await db
      .insert(leads)
      .values({
        customerId,
        customerName: body.customerName,
        businessName: body.businessName,
        email: body.email ?? null,
        phone: body.phone ?? null,
        whatsapp: body.whatsapp ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        country: body.country ?? null,
        businessVertical: body.businessVertical ?? null,
        businessDescription: body.businessDescription ?? null,
        productsServices: body.productsServices ?? null,
        websiteUrl: body.websiteUrl ?? null,
        competitorUrls: body.competitorUrls ?? null,
        storeLocations: body.storeLocations ?? null,
        minOrderValue: body.minOrderValue ?? null,
        avgOrderValue: body.avgOrderValue ?? null,
        maxOrderValue: body.maxOrderValue ?? null,
        profitMarginPct: body.profitMarginPct ?? null,
        monthlyBudget: body.monthlyBudget ?? null,
        targetCountry: body.targetCountry ?? null,
        targetLocation: body.targetLocation ?? null,
        targetAudience: body.targetAudience ?? null,
        businessGoal: body.businessGoal ?? null,
        marketingChannels: body.marketingChannels ?? null,
        leadSource: body.leadSource ?? "OTHER",
        status: body.status ?? "NEW_LEAD",
        hasWebsite: body.hasWebsite ?? null,
        quoteValue: body.quoteValue ?? null,
        notes: body.notes ?? null,
        nextFollowUpDate: body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null,
      })
      .returning();

    await db.insert(followUps).values({
      leadId: lead.id,
      type: "Lead Created",
      note: `Lead captured via ${body.leadSource ?? "OTHER"}.`,
      completed: true,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/leads");
  }
}
