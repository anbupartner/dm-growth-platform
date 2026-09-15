"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Badge, Input, Select, Spinner, LinkButton, EmptyState, Button, Modal } from "@/components/ui";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, type LeadStatus } from "@/lib/constants";
import { Trash2 } from "lucide-react";

interface Lead {
  id: string;
  customerId: string;
  customerName: string;
  businessName: string;
  city?: string | null;
  country?: string | null;
  status: string;
  leadSource: string;
  quoteValue?: number | null;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    const url = statusFilter ? `/api/leads?status=${statusFilter}` : "/api/leads";
    setLoadError(null);
    api
      .get<Lead[]>(url)
      .then(setLeads)
      .catch((e) => setLoadError((e as Error).message));
  };

  useEffect(load, [statusFilter]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.del(`/api/leads/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    if (!leads) return [];
    if (!query.trim()) return leads;
    const q = query.toLowerCase();
    return leads.filter(
      (l) => l.businessName.toLowerCase().includes(q) || l.customerName.toLowerCase().includes(q) || l.customerId.toLowerCase().includes(q),
    );
  }, [leads, query]);

  return (
    <div>
      <PageHeading title="Leads" subtitle="All prospects and customers." action={<LinkButton href="/admin/leads/new">+ Add Lead</LinkButton>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search by name, business or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:max-w-xs">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {loadError && !leads ? (
        <Card className="p-5">
          <p className="text-sm text-red-600">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Card>
      ) : !leads ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          subtitle="Try a different search or add a new lead."
          action={<LinkButton href="/admin/leads/new">+ Add Lead</LinkButton>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Contact</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Quote Value</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${lead.id}`} className="block">
                        <div className="font-medium text-slate-900 dark:text-white">{lead.businessName}</div>
                        <div className="text-xs text-slate-400">{lead.customerId}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-300">{lead.customerName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                      {[lead.city, lead.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={LEAD_STATUS_COLORS[lead.status as LeadStatus]}>
                        {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                      {lead.quoteValue ? lead.quoteValue.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/leads/${lead.id}/edit`} onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete this lead"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(lead);
                          }}
                        >
                          <Trash2 size={13} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!deleteTarget} onClose={() => (deleting ? null : setDeleteTarget(null))}>
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Delete lead &ldquo;{deleteTarget?.businessName}&rdquo;?
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This permanently deletes this lead and everything attached to it — notes, follow-ups, assessments, scenarios, every report and
            proposal version, and their PDFs. This can&apos;t be undone.
          </p>
          {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
