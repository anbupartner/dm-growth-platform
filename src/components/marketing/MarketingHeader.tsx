"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { usePresentationMode, PresentationModeToggle } from "./PresentationMode";
import { CTAButton } from "./ui";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/industries", label: "Industries" },
];

export function MarketingHeader({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const { active: presenting } = usePresentationMode();
  const [open, setOpen] = useState(false);

  if (presenting) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <TrendingUp className="text-indigo-600" size={20} />
          <span className="tracking-tight">{siteName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <PresentationModeToggle />
          <CTAButton href="/contact" size="sm">
            Discuss Your Business
          </CTAButton>
        </div>

        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="md:hidden p-2 -mr-2 text-slate-600 dark:text-slate-300"
        >
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-72 max-w-[85%] h-full bg-white dark:bg-slate-900 shadow-xl flex flex-col">
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-sm">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 -mr-2">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-4 px-5 space-y-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block text-base font-medium text-slate-700 dark:text-slate-200"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="block text-base font-medium text-indigo-600 dark:text-indigo-400"
              >
                Discuss Your Business →
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
