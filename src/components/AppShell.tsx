"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FilePlus2,
  FileText,
  CalendarClock,
  Handshake,
  SlidersHorizontal,
  Database,
  Settings,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { useFollowUpAlerts } from "@/hooks/useFollowUpAlerts";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/assessment/new", label: "New Assessment", icon: FilePlus2 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/proposals", label: "Proposals", icon: Handshake },
  { href: "/scenarios", label: "Scenarios", icon: SlidersHorizontal },
  { href: "/benchmarks", label: "Benchmarks", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom bar shows the 5 most-used destinations; everything else
// lives in the hamburger menu. Tablet/desktop get the full sidebar.
const MOBILE_PRIMARY = ["/", "/leads", "/assessment/new", "/follow-ups"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);

  // Mounted once at the root (see layout.tsx), so this single fetch + poll
  // covers the whole app regardless of which page is active.
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ desktopNotificationsEnabled?: boolean }>("/api/settings")
      .then((s) => {
        if (!cancelled) setDesktopNotificationsEnabled(!!s.desktopNotificationsEnabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const followUpBadgeCount = useFollowUpAlerts(desktopNotificationsEnabled);

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-64 md:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
          <TrendingUp className="text-indigo-600" size={22} />
          <span className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
            Growth Platform
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const showBadge = item.href === "/follow-ups" && followUpBadgeCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                    {followUpBadgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={20} />
            <span className="font-semibold text-slate-900 dark:text-white text-sm">Growth Platform</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="p-2 -mr-2 text-slate-600 dark:text-slate-300"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Mobile slide-over menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative ml-auto w-72 max-w-[85%] h-full bg-white dark:bg-slate-900 shadow-xl flex flex-col">
              <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-sm">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="p-2 -mr-2">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  const showBadge = item.href === "/follow-ups" && followUpBadgeCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                          {followUpBadgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-20 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.href)).map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const showBadge = item.href === "/follow-ups" && followUpBadgeCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <span className="relative">
                  <Icon size={20} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[1rem] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-semibold leading-none">
                      {followUpBadgeCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-slate-500 dark:text-slate-400"
          >
            <Menu size={20} />
            More
          </button>
        </nav>
      </div>
    </div>
  );
}
