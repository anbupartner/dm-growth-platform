"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeading, Card, CardHeader, Spinner, EmptyState } from "@/components/ui";
import { CheckCircle2, Circle } from "lucide-react";

interface FollowUp {
  id: string;
  leadId: string;
  type: string;
  note?: string | null;
  dueDate?: string | null;
  completed: boolean;
  businessName?: string;
  customerId?: string;
}

export default function FollowUpsPage() {
  const [rows, setRows] = useState<FollowUp[] | null>(null);

  const load = useCallback(() => {
    api.get<FollowUp[]>("/api/follow-ups").then(setRows);
  }, []);

  useEffect(() => load(), [load]);

  async function toggle(fu: FollowUp) {
    await api.patch(`/api/follow-ups/${fu.id}`, { completed: !fu.completed });
    load();
  }

  if (!rows) return <div className="flex justify-center py-20"><Spinner /></div>;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);

  const pending = rows.filter((r) => !r.completed && r.dueDate);
  const overdue = pending.filter((r) => new Date(r.dueDate!) < startOfToday);
  const today = pending.filter((r) => new Date(r.dueDate!) >= startOfToday && new Date(r.dueDate!) < endOfToday);
  const upcoming = pending.filter((r) => new Date(r.dueDate!) >= endOfToday);

  return (
    <div>
      <PageHeading title="Follow-ups" subtitle="Upcoming and overdue follow-ups across all leads." />
      {rows.length === 0 ? (
        <EmptyState title="No follow-ups yet" subtitle="Follow-ups are created automatically as you work leads, or add one from a lead's page." />
      ) : (
        <div className="space-y-4">
          <FollowUpGroup id="overdue" title="Overdue" items={overdue} onToggle={toggle} tone="danger" />
          <FollowUpGroup id="today" title="Today's Follow-ups" items={today} onToggle={toggle} tone="warn" />
          <FollowUpGroup id="upcoming" title="Upcoming Follow-ups" items={upcoming} onToggle={toggle} />
        </div>
      )}
    </div>
  );
}

function FollowUpGroup({
  id,
  title,
  items,
  onToggle,
  tone,
}: {
  id?: string;
  title: string;
  items: FollowUp[];
  onToggle: (fu: FollowUp) => void;
  tone?: "danger" | "warn";
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader title={`${title} (${items.length})`} />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.length === 0 && <p className="text-sm text-slate-400 px-5 py-4">Nothing here.</p>}
        {items.map((fu) => (
          <div key={fu.id} className="flex items-start gap-3 px-5 py-3">
            <button onClick={() => onToggle(fu)} className="mt-0.5 text-indigo-600 shrink-0">
              {fu.completed ? <CheckCircle2 size={18} /> : <Circle size={18} className={tone === "danger" ? "text-red-500" : tone === "warn" ? "text-amber-500" : "text-slate-300"} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/leads/${fu.leadId}`} className="text-sm font-medium text-slate-900 dark:text-white hover:underline">
                  {fu.businessName ?? "Unknown"}
                </Link>
                <span className="text-xs text-slate-400">{fu.type}</span>
                {fu.dueDate && <span className="text-xs text-slate-400">{new Date(fu.dueDate).toLocaleDateString()}</span>}
              </div>
              {fu.note && <p className="text-xs text-slate-500 mt-0.5">{fu.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
