import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Container, Eyebrow } from "@/components/marketing/ui";
import { CTASection } from "@/components/marketing/CTASection";
import { SERVICES } from "@/lib/marketing/services";

export const metadata: Metadata = {
  title: "Services",
  description: "SEO, performance marketing, lead generation, CRO, marketing strategy, analytics and CRM automation.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="pt-16 pb-14 sm:pt-24 sm:pb-16">
        <Container>
          <Eyebrow>Services</Eyebrow>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-2xl">
            Everything a growing business needs from one consultant
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
            Each service below can stand alone or plug into a full growth strategy — built around your budget and
            your goal, not a fixed package.
          </p>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container>
          <div className="grid sm:grid-cols-2 gap-6">
            {SERVICES.map((service) => (
              <div key={service.key} id={service.key} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-7">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{service.name}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
                <ul className="mt-5 space-y-2">
                  {service.whatItIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <Check size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CTASection heading="Need Help With Your Marketing?" subtext="Tell me what you're trying to fix and I'll tell you which of these actually matters first." />
    </>
  );
}
