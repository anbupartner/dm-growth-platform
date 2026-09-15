"use client";

import Link from "next/link";
import { usePresentationMode } from "./PresentationMode";
import { CTAButton, Container } from "./ui";
import type { SiteSettings } from "@/lib/marketing/site-settings";

export function MarketingFooter({ settings }: { settings: SiteSettings }) {
  const { active: presenting } = usePresentationMode();
  if (presenting) return null;

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-24">
      <Container className="py-14">
        <div className="rounded-3xl bg-slate-900 dark:bg-white px-6 py-10 sm:px-12 sm:py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white dark:text-slate-900">
            Let&apos;s Discuss Your Growth
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 dark:text-slate-600 max-w-xl mx-auto">
            {settings.ctaText}
          </p>
          <div className="mt-6">
            <CTAButton
              href="/contact"
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-700"
            >
              Discuss Your Business
            </CTAButton>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span>© {new Date().getFullYear()} {settings.siteName}</span>
          <nav className="flex items-center gap-6">
            <Link href="/services" className="hover:text-slate-900 dark:hover:text-white">
              Services
            </Link>
            <Link href="/industries" className="hover:text-slate-900 dark:hover:text-white">
              Industries
            </Link>
            <Link href="/contact" className="hover:text-slate-900 dark:hover:text-white">
              Contact
            </Link>
            {settings.linkedin && (
              <a href={settings.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white">
                LinkedIn
              </a>
            )}
          </nav>
        </div>
      </Container>
    </footer>
  );
}
