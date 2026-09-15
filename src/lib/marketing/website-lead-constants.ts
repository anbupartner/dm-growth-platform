// Website lead status/priority — a separate, simpler vocabulary from the
// internal CRM's LEAD_STATUSES (constants.ts), matching spec section 6's
// Google Sheet dropdown lists exactly.

export const WEBSITE_LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Meeting Scheduled",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "Not Relevant",
  "Follow Up",
] as const;
export type WebsiteLeadStatus = (typeof WEBSITE_LEAD_STATUSES)[number];

export const WEBSITE_LEAD_STATUS_COLORS: Record<WebsiteLeadStatus, string> = {
  New: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Qualified: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "Meeting Scheduled": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Proposal Sent": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Not Relevant": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  "Follow Up": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

export const WEBSITE_LEAD_PRIORITIES = ["Hot", "Warm", "Cold"] as const;
export type WebsiteLeadPriority = (typeof WEBSITE_LEAD_PRIORITIES)[number];

export const WEBSITE_LEAD_PRIORITY_COLORS: Record<WebsiteLeadPriority, string> = {
  Hot: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Warm: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Cold: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};
