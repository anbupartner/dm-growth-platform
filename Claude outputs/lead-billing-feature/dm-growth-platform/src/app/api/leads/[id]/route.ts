import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, followUps, assessments, scenarios, reportSnapshots, proposals, leadBilling, billingPayments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const { id } = await ctx.params;
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [followUpRows, assessmentRows, scenarioRows, reportRows, proposalRows, billingRow, paymentRows] = await Promise.all([
    db.select().from(followUps).where(eq(followUps.leadId, id)).orderBy(desc(followUps.createdAt)),
    db.select().from(assessments).where(eq(assessments.leadId, id)).orderBy(desc(assessments.createdAt)),
    db.select().from(scenarios).where(eq(scenarios.leadId, id)).orderBy(desc(scenarios.createdAt)),
    // reportData omitted here deliberately — it can be a fairly large JSON
    // blob and this list is just for the Reports panel (date/version/
    // filename); the report editor fetches the full row (incl. reportData)
    // per-version from GET /api/reports/[id] instead.
    db
      .select({
        id: reportSnapshots.id,
        leadId: reportSnapshots.leadId,
        version: reportSnapshots.version,
        pdfFileName: reportSnapshots.pdfFileName,
        createdAt: reportSnapshots.createdAt,
        hasReportData: reportSnapshots.reportData,
      })
      .from(reportSnapshots)
      .where(eq(reportSnapshots.leadId, id))
      .orderBy(desc(reportSnapshots.version)),
    db.select().from(proposals).where(eq(proposals.leadId, id)).orderBy(desc(proposals.version)),
    db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, id) }),
    db.select().from(billingPayments).where(eq(billingPayments.leadId, id)).orderBy(desc(billingPayments.paymentDate)),
  ]);

  // Collapse the full reportData text down to a boolean the UI can check
  // ("is this version editable?") without shipping the whole blob to every
  // lead-page load.
  const reports = reportRows.map((r) => ({ ...r, hasReportData: Boolean(r.hasReportData) }));

  // No billing row yet (most leads, until the consultant first sets one up)
  // — return the same default shape GET /api/leads/[id]/billing falls back
  // to, so the Billing card always has something to render.
  const billing = billingRow ?? {
    leadId: id,
    status: "ACTIVE" as const,
    advanceAmount: null,
    monthlyFeeAmount: null,
    projectFeeAmount: null,
    currency: null,
    billingNotes: null,
    canceledAt: null,
    resumedAt: null,
  };

  return NextResponse.json({
    lead,
    followUps: followUpRows,
    assessments: assessmentRows,
    scenarios: scenarioRows,
    reports,
    proposals: proposalRows,
    billing,
    payments: paymentRows,
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();

  const prev = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { ...body };
  delete updateData.id;
  delete updateData.customerId;
  if (updateData.nextFollowUpDate) updateData.nextFollowUpDate = new Date(updateData.nextFollowUpDate as string);

  const [updated] = await db.update(leads).set(updateData).where(eq(leads.id, id)).returning();

  if (body.status && body.status !== prev.status) {
    await db.insert(followUps).values({
      leadId: id,
      type: "Status Change",
      note: `Status changed from ${prev.status} to ${body.status}.`,
      completed: true,
    });
  }

  return NextResponse.json(updated);
}

// Deletes the lead and — via the DB's ON DELETE CASCADE foreign keys — every
// follow-up, assessment, scenario, report and proposal row that belongs to
// it. That cascade only removes DB rows, not the PDF files those report/
// proposal rows point to on disk, so those are looked up and removed first
// here to avoid leaving orphaned files behind (same cleanup already done for
// a single report/proposal version in their own DELETE routes).
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const { id } = await ctx.params;
  const existing = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [reportRows, proposalRows] = await Promise.all([
    db.select({ id: reportSnapshots.id }).from(reportSnapshots).where(eq(reportSnapshots.leadId, id)),
    db.select({ id: proposals.id }).from(proposals).where(eq(proposals.leadId, id)),
  ]);
  for (const r of reportRows) {
    const p = path.join(process.cwd(), "data", "reports", `${r.id}.pdf`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  for (const p of proposalRows) {
    const filePath = path.join(process.cwd(), "data", "proposals", `${p.id}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await db.delete(leads).where(eq(leads.id, id));
  return NextResponse.json({ ok: true });
}
