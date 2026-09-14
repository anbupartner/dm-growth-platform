import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadDocuments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

// Supporting documents (contracts, ID/business proof, brand assets, existing
// creatives, etc.) a consultant attaches to a lead. Stored inline in the DB
// as a data: URL — same as consultantSettings.logoUrl — never written to
// local disk, so this works once deployed to Netlify's read-only function
// filesystem (unlike the pre-migration report/proposal PDF storage this app
// once had).
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

// GET returns metadata only (id/fileName/mimeType/fileSize/createdAt) — never
// fileData, so listing documents for a lead doesn't ship every attachment's
// full base64 payload just to render a list of names.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/documents">) {
  try {
    const { id } = await ctx.params;
    const rows = await db
      .select({
        id: leadDocuments.id,
        leadId: leadDocuments.leadId,
        fileName: leadDocuments.fileName,
        mimeType: leadDocuments.mimeType,
        fileSize: leadDocuments.fileSize,
        createdAt: leadDocuments.createdAt,
      })
      .from(leadDocuments)
      .where(eq(leadDocuments.leadId, id))
      .orderBy(desc(leadDocuments.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/documents");
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/documents">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const fileData = typeof body.fileData === "string" ? body.fileData : "";

    if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    if (!fileData.startsWith("data:")) {
      return NextResponse.json({ error: "fileData must be a data: URL" }, { status: 400 });
    }

    const ext = extensionOf(fileName);
    if (!ALLOWED_MIME_TYPES.has(mimeType) && !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type — only PDF, DOC/DOCX, XLS/XLSX, and JPG/PNG are allowed." },
        { status: 400 }
      );
    }

    // Estimate decoded byte size from the base64 payload without actually
    // decoding it, to reject an oversized upload cheaply.
    const commaIdx = fileData.indexOf(",");
    const base64 = commaIdx === -1 ? "" : fileData.slice(commaIdx + 1);
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const fileSize = Math.floor((base64.length * 3) / 4) - padding;

    if (fileSize > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "That file is over the 10MB limit." }, { status: 400 });
    }

    const [row] = await db
      .insert(leadDocuments)
      .values({
        leadId: id,
        fileName,
        mimeType: mimeType || "application/octet-stream",
        fileSize,
        fileData,
      })
      .returning({
        id: leadDocuments.id,
        leadId: leadDocuments.leadId,
        fileName: leadDocuments.fileName,
        mimeType: leadDocuments.mimeType,
        fileSize: leadDocuments.fileSize,
        createdAt: leadDocuments.createdAt,
      });

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/leads/[id]/documents");
  }
}
