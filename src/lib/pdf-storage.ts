import fs from "node:fs";
import path from "node:path";

// Generated report/proposal PDFs are stored as base64 in the database
// (reportSnapshots.pdfData / proposals.pdfData) — that's the source of
// truth, alongside every other write this app makes (see the Turso
// migration). Writing a copy to local disk (data/reports/, data/proposals/)
// is kept only as a best-effort convenience for local development (so the
// files are still browsable by hand on a dev machine); it must never be
// load-bearing, because Netlify's deployed function filesystem is
// read-only — a disk write there would throw on every single generate/edit
// call. These helpers swallow that failure silently rather than letting it
// take down the request: the PDF is already safely saved in the DB by the
// time these run.
export function tryWritePdfToDisk(dir: string, fileName: string, buffer: Buffer) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), buffer);
  } catch {
    // Read-only filesystem (Netlify) or any other local disk issue.
    // Non-fatal — pdfData in the DB is what every read path relies on.
  }
}

export function tryDeletePdfFromDisk(dir: string, fileName: string) {
  try {
    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Same reasoning as tryWritePdfToDisk — never let disk cleanup fail the request.
  }
}
