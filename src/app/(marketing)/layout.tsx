import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/marketing/site-settings";
import { PresentationModeProvider, PresentationModeExitButton } from "@/components/marketing/PresentationMode";
import { SelectedIndustryProvider } from "@/components/marketing/IndustryContext";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { IndustryPopup } from "@/components/marketing/IndustryPopup";
import { AttributionTracker } from "@/components/marketing/AttributionTracker";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: `${settings.siteName} — Digital Marketing That Creates Business Growth`,
      template: `%s — ${settings.siteName}`,
    },
    description:
      "Digital marketing consulting for D2C, B2C and B2B businesses — SEO, performance marketing, lead generation, CRO and marketing strategy.",
  };
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <PresentationModeProvider>
      <SelectedIndustryProvider>
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
          <MarketingHeader siteName={settings.siteName} />
          <main className="flex-1">{children}</main>
          <MarketingFooter settings={settings} />
        </div>
        <IndustryPopup />
        <AttributionTracker />
        <PresentationModeExitButton />
      </SelectedIndustryProvider>
    </PresentationModeProvider>
  );
}
