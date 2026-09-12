"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Spinner, EmptyState, LinkButton, Button, Input, Select } from "@/components/ui";
import { Download, Presentation } from "lucide-react";
import { ReportSlideshowModal } from "@/components/ReportSlideshowModal";

interface ReportRow {
  id: string;
  leadId: string;
  pdfFileName?: string | null;
  createdAt: string;
  businessName?: string;
  customerId?: string;
  customerName?: string;
  phone?: string | null;
}

interface ClientGroup {
  leadId: string;
  businessName: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  reports: ReportRow[];
}

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = () => {
    setLoadError(null);
    api
      .get<ReportRow[]>("/api/reports")
      .then(setRows)
      .catch((e) => setLoadError((e as Error).message));
  };

  useEffect(load, []);

  // Groups reports by client (leadId) — a client can have several report
  // versions (re-runs of the assessment), and those used to show as
  // separate-looking flat rows with no indication they belonged together.
  // Rows arrive pre-sorted newest-first from the API; a Map preserves
  // first-seen insertion order, so the group for whichever client's most
  // recent report is newest naturally sorts first, and each group's own
  // reports stay newest-first too — no separate sort needed.
  const groups = useMemo<ClientGroup[]>(() => {
    if (!rows) return [];
    const byLead = new Map<string, ClientGroup>();
    for (const r of rows) {
      let group = byLead.get(r.leadId);
      if (!group) {
        group = {
          leadId: r.leadId,
          businessName: r.businessName ?? "Unknown business",
          customerId: r.customerId ?? "—",
          customerName: r.customerName ?? "",
          phone: r.phone ?? null,
          reports: [],
        };
        byLead.set(r.leadId, group);
      }
      group.reports.push(r);
    }
    return Array.from(byLead.values());
  }, [rows]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups.filter(
      (g) =>
        g.businessName.toLowerCase().includes(q) ||
        g.customerName.toLowerCase().includes(q) ||
        g.customerId.toLowerCase().includes(q) ||
        (g.phone ?? "").toLowerCase().includes(q),
    );
  }, [groups, query]);

  if (loadError && !rows) {
    return (
      <div>
        <PageHeading title="Reports" subtitle="View and download generated client reports." />
        <Card className="p-5">
          <p className="text-sm text-red-600">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  if (!rows)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div>
      <PageHeading title="Reports" subtitle="View and download generated client reports." />

      {rows.length === 0 ? (
        <EmptyState
          title="No reports generated yet"
          subtitle="Run a New Assessment to generate your first client PDF."
          action={<LinkButton href="/assessment/new">Run New Assessment</LinkButton>}
        />
      ) : (
        <>
          <div className="mb-4">
            <Input
              placeholder="Search by client name, business, ID or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs"
            />
          </div>

          {filteredGroups.length === 0 ? (
            <EmptyState title="No matching clients" subtitle="Try a different name, ID or phone number." />
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Card key={group.leadId} className="overflow-hidden">
                  <Link href={`/leads/${group.leadId}`} className="block px-5 pt-4 pb-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{group.businessName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {group.customerId}
                      {group.customerName && ` · ${group.customerName}`}
                      {group.phone && ` · ${group.phone}`}
                      {` · ${group.reports.length} report${group.reports.length === 1 ? "" : "s"}`}
                    </p>
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    <ClientReportVersions reports={group.reports} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// A client can build up several report versions (re-runs of the
// assessment). Listing every version inline got long once a client had
// several, so with more than one, this shows a dropdown to pick a version
// plus a single Download button for whichever is selected — defaults to
// the newest (reports arrive newest-first). With exactly one version the
// dropdown would add nothing, so it stays a plain row, same as before.
function ClientReportVersions({ reports }: { reports: ReportRow[] }) {
  const [selectedId, setSelectedId] = useState(reports[0].id);
  // Which report's slideshow popup is currently open (null = closed). Kept
  // separate from selectedId so opening the popup never depends on which
  // dropdown option happens to be selected at the time.
  const [viewingId, setViewingId] = useState<string | null>(null);

  if (reports.length === 1) {
    const r = reports[0];
    return (
      <>
        <div className="flex items-center justify-between gap-3 px-5 py-2.5">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate min-w-0">
            {new Date(r.createdAt).toLocaleDateString()} · {r.pdfFileName}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="secondary" onClick={() => setViewingId(r.id)}>
              <Presentation size={13} /> View
            </Button>
            <a href={`/api/reports/${r.id}/pdf`}>
              <Button size="sm" variant="secondary">
                <Download size={13} /> Download
              </Button>
            </a>
          </div>
        </div>
        {viewingId && <ReportSlideshowModal reportId={viewingId} onClose={() => setViewingId(null)} />}
      </>
    );
  }

  const selected = reports.find((r) => r.id === selectedId) ?? reports[0];

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-2.5">
        <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="text-xs py-1.5 min-w-0 flex-1">
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {new Date(r.createdAt).toLocaleDateString()} · {r.pdfFileName}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => setViewingId(selected.id)}>
            <Presentation size={13} /> View
          </Button>
          <a href={`/api/reports/${selected.id}/pdf`}>
            <Button size="sm" variant="secondary">
              <Download size={13} /> Download
            </Button>
          </a>
        </div>
      </div>
      {viewingId && <ReportSlideshowModal reportId={viewingId} onClose={() => setViewingId(null)} />}
    </>
  );
}
