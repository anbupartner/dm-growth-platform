"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { PageHeading, StatTile, Card, CardHeader, Spinner, Button, LinkButton, Badge } from "@/components/ui";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS, type LeadStatus } from "@/lib/constants";
import { BusinessAuditDialog } from "@/components/BusinessAuditDialog";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  totalLeads: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  revenue: { totalQuoteValue: number; wonValue: number; pipelineValue: number; avgProjectValue: number; conversionRate: number };
  followUps: { dueCount: number; todayCount: number; overdueCount: number; upcomingCount: number };
  recentLeads: Array<{ id: string; customerId: string; businessName: string; customerName: string; status: string; createdAt: string }>;
}

const PIE_COLORS = ["#4f46e5", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#ef4444", "#64748b"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  useEffect(() => {
    api
      .get<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  const funnelData = Object.entries(data.statusCounts)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({ status: LEAD_STATUS_LABELS[status as LeadStatus] ?? status, value }));

  const sourceData = Object.entries(data.sourceCounts)
    .filter(([, v]) => v > 0)
    .map(([source, value]) => ({ name: LEAD_SOURCE_LABELS[source as keyof typeof LEAD_SOURCE_LABELS] ?? source, value }));

  return (
    <div>
      <PageHeading
        title="Dashboard"
        subtitle="Lead, pipeline, revenue and follow-up overview."
        action={<Button onClick={() => setAuditDialogOpen(true)}>+ Business Audit</Button>}
      />
      <BusinessAuditDialog open={auditDialogOpen} onClose={() => setAuditDialogOpen(false)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Total Leads" value={data.totalLeads} />
        <StatTile label="New Leads" value={data.statusCounts.NEW_LEAD ?? 0} />
        <StatTile
          label="Follow-ups Due"
          value={data.followUps.dueCount}
          hint={`${data.followUps.overdueCount} overdue`}
          href="/follow-ups"
        />
        <StatTile label="Proposals Sent" value={data.statusCounts.PROPOSAL_SENT ?? 0} />
        <StatTile label="Won Projects" value={data.statusCounts.WON ?? 0} />
        <StatTile label="Lost Projects" value={data.statusCounts.LOST ?? 0} />
        <StatTile label="Pipeline Value" value={data.revenue.pipelineValue.toLocaleString()} />
        <StatTile label="Won Revenue" value={data.revenue.wonValue.toLocaleString()} />
        <StatTile label="Conversion Rate" value={`${data.revenue.conversionRate.toFixed(0)}%`} />
        <StatTile label="Avg Project Value" value={data.revenue.avgProjectValue.toLocaleString()} />
        <StatTile label="Today's Follow-ups" value={data.followUps.todayCount} href="/follow-ups#today" />
        <StatTile label="Upcoming Follow-ups" value={data.followUps.upcomingCount} href="/follow-ups#upcoming" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader title="Lead Pipeline by Status" />
          <div className="p-4 h-72">
            {funnelData.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">No leads yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="status" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Lead Source Performance" />
          <div className="p-4 h-72">
            {sourceData.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">No leads yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent Leads" action={<LinkButton href="/leads" variant="ghost" size="sm">View all →</LinkButton>} />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.recentLeads.length === 0 && <p className="text-sm text-slate-400 px-5 py-6">No leads yet.</p>}
          {data.recentLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{lead.businessName}</p>
                <p className="text-xs text-slate-400 truncate">{lead.customerId} · {lead.customerName}</p>
              </div>
              <Badge className={LEAD_STATUS_COLORS[lead.status as LeadStatus]}>{LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}</Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
