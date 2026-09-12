"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Badge, Spinner, EmptyState, Input, Select, LinkButton, Button } from "@/components/ui";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, type LeadStatus } from "@/lib/constants";
import { formatCurrencyDisplay } from "@/lib/calculations";
import { Search, Pencil, Download } from "lucide-react";

interface Lead {
  id: string;
  customerId: string;
  businessName: string;
  customerName: string;
  status: string;
  quoteValue?: number | null;
}

interface ProposalListRow {
  id: string;
  leadId: string;
  version: number;
  pdfFileName: string | null;
  createdAt: string;
}

const PROPOSAL_STATUSES = ["PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

export default function ProposalsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [proposals, setProposals] = useState<ProposalListRow[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // Which proposal version is selected per lead, for leads with more than
  // one — defaults to the latest (proposals arrive newest-first from the
  // API) so the common case needs no extra click.
  const [selectedProposal, setSelectedProposal] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [leadLists, proposalRows, settings] = await Promise.all([
        Promise.all(PROPOSAL_STATUSES.map((s) => api.get<Lead[]>(`/api/leads?status=${s}`))),
        api.get<ProposalListRow[]>("/api/proposals"),
        api.get<{ currency: string }>("/api/settings"),
      ]);
      setLeads(leadLists.flat());
      setProposals(proposalRows);
      setCurrency(settings.currency || "USD");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateQuote(id: string, value: string) {
    setQuoteError(null);
    try {
      await api.patch(`/api/leads/${id}`, { quoteValue: value ? Number(value) : null });
      await load();
    } catch (e) {
      setQuoteError((e as Error).message);
    }
  }

  const proposalsByLead = useMemo(() => {
    const map = new Map<string, ProposalListRow[]>();
    for (const p of proposals ?? []) {
      const list = map.get(p.leadId) ?? [];
      list.push(p);
      map.set(p.leadId, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.version - a.version);
    return map;
  }, [proposals]);

  const filteredLeads = useMemo(() => {
    if (!leads) return null;
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) => l.businessName.toLowerCase().includes(q) || l.customerName.toLowerCase().includes(q) || l.customerId.toLowerCase().includes(q),
    );
  }, [leads, search]);

  if (loadError && !leads) {
    return (
      <div>
        <PageHeading title="Proposals" subtitle="Track proposals, quotes and negotiation status." />
        <Card className="p-5">
          <p className="text-sm text-red-600">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  if (!leads || !filteredLeads)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const totalPipeline = leads.filter((l) => l.status !== "WON" && l.status !== "LOST").reduce((s, l) => s + (l.quoteValue ?? 0), 0);
  const totalWon = leads.filter((l) => l.status === "WON").reduce((s, l) => s + (l.quoteValue ?? 0), 0);

  return (
    <div>
      <PageHeading
        title="Proposals"
        subtitle="Track proposals, quotes and negotiation status."
        action={
          <LinkButton href="/leads/new?next=proposal" size="sm">
            + Quick Proposal
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <Card className="p-4">
          <p className="text-xs text-slate-400">Open Proposal Value</p>
          <p className="text-xl font-semibold mt-1">{formatCurrencyDisplay(totalPipeline, currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Won Value</p>
          <p className="text-xl font-semibold mt-1 text-emerald-600">{formatCurrencyDisplay(totalWon, currency)}</p>
        </Card>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business, customer or ID…"
          className="pl-9"
        />
      </div>

      {quoteError && <p className="mb-4 text-sm text-red-600">{quoteError}</p>}

      {leads.length === 0 ? (
        <EmptyState title="No proposals yet" subtitle="Leads move here once their status becomes Proposal Sent or later." />
      ) : filteredLeads.length === 0 ? (
        <EmptyState title="No matches" subtitle={`Nothing found for "${search}".`} />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLeads.map((lead) => {
              const leadProposals = proposalsByLead.get(lead.id) ?? [];
              const selectedId = selectedProposal[lead.id] ?? leadProposals[0]?.id ?? "";
              return (
                <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <Link href={`/leads/${lead.id}`} className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{lead.businessName}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {lead.customerId} · {lead.customerName}
                      </p>
                    </Link>
                    <Badge className={LEAD_STATUS_COLORS[lead.status as LeadStatus]}>{LEAD_STATUS_LABELS[lead.status as LeadStatus]}</Badge>
                  </div>

                  <div className="flex flex-nowrap items-center gap-2 shrink-0">
                    {leadProposals.length === 0 ? (
                      <>
                        <Input
                          type="number"
                          defaultValue={lead.quoteValue ?? ""}
                          onBlur={(e) => updateQuote(lead.id, e.target.value)}
                          placeholder="Quote value"
                          className="w-32"
                        />
                        <LinkButton href={`/leads/${lead.id}/proposal/new`} variant="secondary" size="sm">
                          Create Proposal
                        </LinkButton>
                      </>
                    ) : (
                      <>
                        {leadProposals.length > 1 && (
                          // Select's own base style always includes w-full — inside this
                          // flex row that fights the "keep everything on one line" layout
                          // below, so it's wrapped in a fixed-width box that reliably caps
                          // it, rather than relying on a className override that Tailwind's
                          // specificity doesn't guarantee wins.
                          <div className="w-36 shrink-0">
                            <Select
                              value={selectedId}
                              onChange={(e) => setSelectedProposal((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                              className="text-xs py-1.5"
                            >
                              {leadProposals.map((p) => (
                                <option key={p.id} value={p.id}>
                                  v{p.version} — {new Date(p.createdAt).toLocaleDateString()}
                                </option>
                              ))}
                            </Select>
                          </div>
                        )}
                        {leadProposals.length === 1 && <span className="text-xs text-slate-400 shrink-0">v{leadProposals[0].version}</span>}
                        <LinkButton
                          href={`/leads/${lead.id}/proposal/${selectedId}/edit`}
                          variant="ghost"
                          size="sm"
                          title="Edit this proposal version"
                        >
                          <Pencil size={13} />
                        </LinkButton>
                        <a href={`/api/proposals/${selectedId}/pdf`}>
                          <Button size="sm" variant="ghost" title="Download this proposal version">
                            <Download size={13} />
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
