import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, Eyebrow } from "@/components/marketing/ui";
import { CTASection } from "@/components/marketing/CTASection";
import { INDUSTRIES } from "@/lib/marketing/industries";

export const metadata: Metadata = {
  title: "Industries",
  description: "Digital marketing experience across dental, education, healthcare, SaaS, e-commerce, real estate and more.",
};

export default function IndustriesPage() {
  return (
    <>
      <section className="pt-16 pb-14 sm:pt-24 sm:pb-16">
        <Container>
          <Eyebrow>Industries</Eyebrow>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-2xl">
            Choose your industry
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
            See the challenges, relevant solutions and case studies for businesses like yours.
          </p>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={`/casestudy/${industry.slug}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-900 dark:hover:border-white transition-colors"
              >
                <h2 className="font-semibold text-slate-900 dark:text-white">{industry.name}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{industry.intro}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white">
                  See relevant work <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <CTASection heading="Don't See Your Industry?" subtext="I work across most B2B, B2C and D2C categories — tell me about your business." />
    </>
  );
}
