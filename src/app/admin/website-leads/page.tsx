"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Badge, Select, Spinner, EmptyState } from "@/components/ui";
import {
  WEBSITE_LEAD_STATUSES,
  WEBSITE_LEAD_STATUS_COLORS,
  WEBSITE_LEAD_PRIORITIES,
  WEBSITE_LEAD_PRIORITY_COLORS,
  type WebsiteLeadStatus,
  type WebsiteLeadPriority,
} from "@/lib/marketing/website-lead-constants";
import { ChevronDown, ChevronUp, ExternalLink, CloudOff } from "lucide-react";

interface WebsiteLead {
  id: string;
  leadId: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  industry: string | null;
  businessGoal: string | null;
  budget: string | null;
  message: string | null;
  landingPage: string | null;
  caseStudyViewed: string | null;
  industryViewed: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  device: string | null;
  status: WebsiteLeadStatus;
  priority: WebsiteLeadPriority;
  notes: string | null;
  sheetSynced: boolean;
  createdAt: string;
}

export default function WebsiteLeadsPage() {
  const [leads, setLeads] = useState<WebsiteLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function load() {
    api
      .get<WebsiteLead[]>("/api/website-leads")
      .then(setLeads)
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function updateLead(id: string, patch: Partial<Pick<WebsiteLead, "status" | "priority">>) {
    const prev = leads;
    setLeads((cur) => cur?.map((l) => (l.id === id ? { ...l, ...patch } : l)) ?? cur);
    try {
      await api.patch(`/api/website-leads/${id}`, patch);
    } catch (e) {
      setLeads(prev ?? null);
      setError(e instanceof Error ? e.message : "Failed to update lead.");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!leads) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <PageHeading
        title="Website Leads"
        subtitle="Public-site enquiries, mirrored locally. Google Sheets stays the primary, editable record — see docs/GOOGLE_SHEETS_SETUP.md."
      />

      {leads.length === 0 ? (
        <EmptyState title="No website enquiries yet" subtitle="Submissions from the public site's contact form will show up here." />
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const isOpen = expanded === lead.id;
            return (
              <Card key={lead.id} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : lead.id)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="text-xs font-mono text-slate-400 shrink-0">{lead.leadId}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {lead.name} {lead.company && <span className="text-slate-400 font-normal">· {lead.company}</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {lead.email} {lead.industry && `· ${lead.industry}`}
                    </p>
                  </div>
                  {!lead.sheetSynced && (
                    <span title="Not yet synced to Google Sheets (unconfigured or last attempt failed)">
                      <CloudOff size={14} className="text-amber-500 shrink-0" />
                    </span>
                  )}
                  <Badge className={WEBSITE_LEAD_PRIORITY_COLORS[lead.priority]}>{lead.priority}</Badge>
                  <Badge className={WEBSITE_LEAD_STATUS_COLORS[lead.status]}>{lead.status}</Badge>
                  <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 sm:px-5 py-4 space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <div className="w-40">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                        <Select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value as WebsiteLeadStatus })}>
                          {WEBSITE_LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                        <Select value={lead.priority} onChange={(e) => updateLead(lead.id, { priority: e.target.value as WebsiteLeadPriority })}>
                          {WEBSITE_LEAD_PRIORITIES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {lead.phone && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Phone</dt><dd className="text-slate-700 dark:text-slate-200">{lead.phone}</dd></div>
                      )}
                      {lead.website && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Website</dt><dd className="text-slate-700 dark:text-slate-200 truncate">{lead.website}</dd></div>
                      )}
                      {lead.businessGoal && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Looking to improve</dt><dd className="text-slate-700 dark:text-slate-200">{lead.businessGoal}</dd></div>
                      )}
                      {lead.budget && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Budget</dt><dd className="text-slate-700 dark:text-slate-200">{lead.budget}</dd></div>
                      )}
                      {lead.landingPage && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Landing page</dt><dd className="text-slate-700 dark:text-slate-200 truncate flex items-center gap-1"><a href={lead.landingPage} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">{lead.landingPage}<ExternalLink size={11} /></a></dd></div>
                      )}
                      {lead.caseStudyViewed && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Case study viewed</dt><dd className="text-slate-700 dark:text-slate-200">{lead.caseStudyViewed}</dd></div>
                      )}
                      {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">UTM</dt><dd className="text-slate-700 dark:text-slate-200">{[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}</dd></div>
                      )}
                      {lead.device && (
                        <div className="flex gap-2"><dt className="text-slate-400 w-32 shrink-0">Device</dt><dd className="text-slate-700 dark:text-slate-200">{lead.device}</dd></div>
                      )}
                    </dl>

                    {lead.message && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Challenge / message</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.message}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
