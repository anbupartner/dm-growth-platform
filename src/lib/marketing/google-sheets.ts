// Forwards a captured website lead to the Google Apps Script Web App that
// appends it to the "Website Leads" Google Sheet — see
// docs/GOOGLE_SHEETS_SETUP.md for how to deploy that script and get the
// two env vars below.
//
// This is deliberately best-effort: Google Sheets is the spec's primary
// record, but the local `website_leads` table (see src/lib/db/schema.ts)
// already has the lead the moment the form is submitted, so a Sheets
// outage or a not-yet-configured deployment never blocks the visitor's
// success screen — it only means this particular row hasn't synced to the
// Sheet yet (see `sheetSynced` / `sheetSyncError` on the row).

export interface GoogleSheetsLeadPayload {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  industry: string;
  businessGoal: string;
  budget: string;
  message: string;
  leadSource: string;
  landingPage: string;
  caseStudyViewed: string;
  industryViewed: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  device: string;
}

export async function forwardLeadToGoogleSheets(
  payload: GoogleSheetsLeadPayload
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.GOOGLE_APPS_SCRIPT_SECRET ?? "", lead: payload }),
      // Apps Script Web Apps can be slow to cold-start — give it a generous
      // timeout rather than failing a real sync attempt prematurely.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
    }
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (body && body.ok === false) return { ok: false, error: body.error ?? "unknown_error" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}
