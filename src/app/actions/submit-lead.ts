"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { websiteLeads } from "@/lib/db/schema";
import { nextWebsiteLeadId } from "@/lib/ids";
import { leadFormSchema } from "@/lib/marketing/lead-schema";
import { isRateLimited } from "@/lib/marketing/rate-limit";
import { forwardLeadToGoogleSheets } from "@/lib/marketing/google-sheets";
import { eq } from "drizzle-orm";

export interface SubmitLeadResult {
  ok: boolean;
  leadId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function detectDevice(userAgent: string): string {
  return /mobile|android|iphone|ipad/i.test(userAgent) ? "Mobile" : "Desktop";
}

export async function submitLead(input: unknown): Promise<SubmitLeadResult> {
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  // Honeypot — a real visitor never sees or fills this field (hidden via
  // CSS). Report success without persisting anything, so a bot gets no
  // signal that it was caught.
  if (data.honeypot) return { ok: true, leadId: "L0000" };

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") ?? "";

  if (isRateLimited(ip)) {
    return { ok: false, error: "Too many submissions from this connection. Please try again in a few minutes." };
  }

  const leadId = await nextWebsiteLeadId();

  await db.insert(websiteLeads).values({
    leadId,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    company: data.company || null,
    website: data.website || null,
    industry: data.industry,
    businessGoal: data.businessGoal,
    budget: data.budget || null,
    message: data.message || null,
    leadSource: "Website",
    landingPage: data.landingPage || null,
    caseStudyViewed: data.caseStudyViewed || null,
    industryViewed: data.industryViewed || null,
    utmSource: data.utmSource || null,
    utmMedium: data.utmMedium || null,
    utmCampaign: data.utmCampaign || null,
    utmTerm: data.utmTerm || null,
    utmContent: data.utmContent || null,
    device: detectDevice(userAgent),
    ipAddress: ip,
  });

  const sync = await forwardLeadToGoogleSheets({
    leadId,
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    company: data.company || "",
    website: data.website || "",
    industry: data.industry,
    businessGoal: data.businessGoal,
    budget: data.budget || "",
    message: data.message || "",
    leadSource: "Website",
    landingPage: data.landingPage || "",
    caseStudyViewed: data.caseStudyViewed || "",
    industryViewed: data.industryViewed || "",
    utmSource: data.utmSource || "",
    utmMedium: data.utmMedium || "",
    utmCampaign: data.utmCampaign || "",
    utmTerm: data.utmTerm || "",
    utmContent: data.utmContent || "",
    device: detectDevice(userAgent),
  });

  if (sync.ok) {
    await db.update(websiteLeads).set({ sheetSynced: true, sheetSyncError: null }).where(eq(websiteLeads.leadId, leadId));
  } else if (sync.error !== "not_configured") {
    console.error(`[website-leads] Google Sheets sync failed for ${leadId}:`, sync.error);
    await db.update(websiteLeads).set({ sheetSyncError: sync.error ?? "unknown_error" }).where(eq(websiteLeads.leadId, leadId));
  }

  return { ok: true, leadId };
}
