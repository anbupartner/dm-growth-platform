// Public site identity — reuses the same `consultantSettings` row the
// internal admin tool already manages (Settings page), instead of
// hardcoding a name/brand into the marketing site. Falls back to generic
// placeholder copy until the consultant fills in Settings.

import { db } from "@/lib/db";
import { consultantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface SiteSettings {
  consultantName: string;
  companyName: string;
  siteName: string; // companyName, or consultantName, or a generic fallback
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  ctaText: string;
}

const FALLBACK: SiteSettings = {
  consultantName: "",
  companyName: "",
  siteName: "Digital Marketing Consultant",
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  linkedin: null,
  ctaText: "Let's discuss how we can build your digital growth strategy.",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const row = await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") });
    if (!row) return FALLBACK;
    return {
      consultantName: row.consultantName || "",
      companyName: row.companyName || "",
      siteName: row.companyName || row.consultantName || FALLBACK.siteName,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      website: row.website,
      linkedin: row.linkedin,
      ctaText: row.ctaText || FALLBACK.ctaText,
    };
  } catch {
    return FALLBACK;
  }
}
