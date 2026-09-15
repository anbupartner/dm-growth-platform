// Contextual CTA band (spec section 18) — dropped in after Results, after a
// case study, after Services, etc., each with its own framing instead of
// one generic CTA at the bottom of every page.

import { Section, CTAButton } from "./ui";

export function CTASection({
  heading,
  subtext,
  ctaLabel = "Discuss Your Business",
  href = "/contact",
}: {
  heading: string;
  subtext?: string;
  ctaLabel?: string;
  href?: string;
}) {
  return (
    <Section className="py-14 sm:py-16">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 px-6 py-10 sm:px-12 sm:py-12 text-center">
        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{heading}</h3>
        {subtext && <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{subtext}</p>}
        <div className="mt-6">
          <CTAButton href={href} size="lg">
            {ctaLabel}
          </CTAButton>
        </div>
      </div>
    </Section>
  );
}
