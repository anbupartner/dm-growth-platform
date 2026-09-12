// Real competitor research — no search-engine ranking API is configured, so
// this deliberately does NOT fabricate rankings, traffic or keyword data.
// Instead it fetches each competitor's live site (same honest, single-page
// approach as website-audit.ts) and reports only what is actually detectable
// in the HTML — content depth, structured data, social presence, mobile
// readiness, platform/tech signals, speed — then compares those real signals
// head-to-head against the client's own site to produce genuine, specific
// insights. Anything that can't be verified (rankings, ad spend, real
// traffic) is simply not claimed.

import { fetchText, extractTag } from "./website-audit";

export interface SiteSignals {
  url: string;
  hostname: string;
  label: string;
  fetchedOk: boolean;
  fetchError?: string;
  title?: string;
  metaDescription?: string;
  wordCount: number;
  responseTimeMs?: number;
  https: boolean;
  hasViewport: boolean;
  hasSchema: boolean;
  hasBlog: boolean;
  socialLinks: string[];
  techPlatform: string;
  hasFavicon: boolean;
  hasOgTags: boolean;
  hasContactInfo: boolean;
  hasSitemap: boolean;
  h1Count: number;
  // A real image already on the competitor's page (its og:image) — kept
  // only as a visual reference for the wizard's Sample Ads step when AI
  // image generation isn't configured, clearly labeled as such, never
  // presented as the client's own ad creative.
  ogImageUrl?: string;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function detectPlatform(html: string): string {
  const generator = extractTag(html, /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i);
  if (generator) {
    if (/wordpress/i.test(generator)) return "WordPress";
    if (/shopify/i.test(generator)) return "Shopify";
    if (/wix/i.test(generator)) return "Wix";
    if (/squarespace/i.test(generator)) return "Squarespace";
    if (/webflow/i.test(generator)) return "Webflow";
    if (generator.trim()) return generator.trim();
  }
  if (/wp-content|wp-includes|wp-json/i.test(html)) return "WordPress";
  if (/cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(html)) return "Shopify";
  if (/static\.wixstatic\.com|wix-code|_wixCssStates/i.test(html)) return "Wix";
  if (/squarespace-cdn\.com|squarespace\.com\/universal/i.test(html)) return "Squarespace";
  if (/cdn\.prod\.website-files\.com|data-wf-site|data-wf-page/i.test(html)) return "Webflow";
  return "Not detected";
}

/** Parses the free-text "Competitor URLs" field into a clean, deduplicated list. */
export function parseCompetitorUrls(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const norm = p.replace(/\/+$/, "").toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(p);
    }
  }
  return out.slice(0, 5); // cap — keeps the live-fetch step fast and avoids hammering competitor sites
}

/** Fetches and analyzes one live site. Works identically for the client's own site and for competitors, so comparisons are apples-to-apples. */
export async function analyzeSite(rawUrl: string, label?: string): Promise<SiteSignals> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const hostname = safeHostname(url);

  const started = Date.now();
  const page = await fetchText(url);
  const responseTimeMs = Date.now() - started;

  if (!page.ok || !page.text) {
    return {
      url,
      hostname,
      label: label ?? hostname,
      fetchedOk: false,
      fetchError: `Could not fetch this site (${page.status ?? "network error"}) — it may block automated requests, or the URL may be incorrect.`,
      wordCount: 0,
      https: url.startsWith("https://"),
      hasViewport: false,
      hasSchema: false,
      hasBlog: false,
      socialLinks: [],
      techPlatform: "Unknown",
      hasFavicon: false,
      hasOgTags: false,
      hasContactInfo: false,
      hasSitemap: false,
      h1Count: 0,
    };
  }

  const html = page.text;
  const title = extractTag(html, /<title[^>]*>([^<]*)<\/title>/i);
  const metaDescription = extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasSchema = /application\/ld\+json/i.test(html);
  const h1Count = (html.match(/<h1[^>]*>/gi) ?? []).length;
  const hasFavicon = /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i.test(html);
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const hasOgTags = ogTitle && ogImage;
  const ogImageRaw = extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  let ogImageUrl: string | undefined;
  if (ogImageRaw) {
    try {
      ogImageUrl = new URL(ogImageRaw, url).toString();
    } catch {
      // ignore malformed og:image URLs
    }
  }
  const bodyNoScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const hasContactInfo = /(?:tel:)|(?:mailto:)|(?:\+?\d[\d\s().-]{7,}\d)/.test(bodyNoScripts);
  const textOnly = bodyNoScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textOnly ? textOnly.split(" ").length : 0;

  const socialPatterns: Array<[string, RegExp]> = [
    ["Facebook", /(?:facebook\.com|fb\.com)\/[a-z0-9._-]+/i],
    ["Instagram", /instagram\.com\/[a-z0-9._-]+/i],
    ["LinkedIn", /linkedin\.com\/(?:company|in)\/[a-z0-9._-]+/i],
    ["Twitter/X", /(?:twitter\.com|x\.com)\/[a-z0-9._-]+/i],
    ["YouTube", /youtube\.com\/(?:channel|c|@)[a-z0-9._-]+/i],
  ];
  const socialLinks = socialPatterns.filter(([, re]) => re.test(html)).map(([name]) => name);

  // Heuristic, not a guarantee — same caveat style as the site-audit engine's
  // other pattern-based checks (e.g. NAP phone detection).
  const hasBlog = /href=["'][^"']*\/(blog|blogs|insights|resources|articles|news|guides)(\/[^"']*)?["']/i.test(html);

  const techPlatform = detectPlatform(html);

  const origin = new URL(url).origin;
  const sitemap = await fetchText(origin + "/sitemap.xml", 5000);

  return {
    url,
    hostname,
    label: label ?? hostname,
    fetchedOk: true,
    title,
    metaDescription,
    wordCount,
    responseTimeMs,
    https: url.startsWith("https://"),
    hasViewport,
    hasSchema,
    hasBlog,
    socialLinks,
    techPlatform,
    hasFavicon,
    hasOgTags,
    hasContactInfo,
    hasSitemap: sitemap.ok,
    h1Count,
    ogImageUrl,
  };
}

export interface CompetitorAnalysisResult {
  client: SiteSignals | null;
  competitors: SiteSignals[];
  insights: string[];
}

/**
 * Every sentence here is derived directly from the fetched signals above —
 * counts of what was actually detected, nothing invented, no rankings or
 * traffic figures (those need a paid search API, which isn't configured).
 */
export function buildCompetitiveInsights(client: SiteSignals | null, competitors: SiteSignals[]): string[] {
  const insights: string[] = [];
  const reachable = competitors.filter((c) => c.fetchedOk);
  const unreachable = competitors.filter((c) => !c.fetchedOk);

  if (unreachable.length > 0) {
    insights.push(
      `Could not analyze ${unreachable.length} of ${competitors.length} competitor site(s) (${unreachable
        .map((c) => c.hostname)
        .join(", ")}) — check the URL(s) are correct and publicly reachable.`
    );
  }

  if (reachable.length === 0) return insights;

  const avgWords = Math.round(reachable.reduce((sum, c) => sum + c.wordCount, 0) / reachable.length);
  if (client && client.fetchedOk) {
    if (client.wordCount < avgWords * 0.7) {
      insights.push(
        `Competitors average ${avgWords} words of on-page content vs. ${client.wordCount} words on your client's homepage — a real content-depth gap that can hold back search visibility.`
      );
    } else if (client.wordCount > avgWords * 1.3) {
      insights.push(
        `Your client's homepage has more on-page content (${client.wordCount} words) than the competitor average (${avgWords} words) — a genuine strength to keep leveraging in messaging.`
      );
    } else {
      insights.push(`Content depth is roughly comparable: ${client.wordCount} words on your client's homepage vs. a ${avgWords}-word competitor average.`);
    }
  } else {
    insights.push(`Competitor homepages average ${avgWords} words of on-page content.`);
  }

  const withBlog = reachable.filter((c) => c.hasBlog);
  if (withBlog.length > 0) {
    const clientHasBlog = client?.fetchedOk ? client.hasBlog : null;
    insights.push(
      `${withBlog.length} of ${reachable.length} competitor site(s) show a visible blog/resources section (${withBlog
        .map((c) => c.hostname)
        .join(", ")})` + (clientHasBlog === false ? " — your client's site doesn't appear to have one, a missed channel for ongoing organic search traffic." : ".")
    );
  } else if (client?.fetchedOk && !client.hasBlog) {
    insights.push("Neither the competitors analyzed nor your client's site show a visible blog/content section — an open opportunity to differentiate on organic content.");
  }

  const withSchema = reachable.filter((c) => c.hasSchema);
  if (withSchema.length > 0 && client?.fetchedOk && !client.hasSchema) {
    insights.push(
      `${withSchema.length} of ${reachable.length} competitor site(s) use structured data (schema.org) markup, which your client's site is currently missing — this affects how rich the listing can look in search results.`
    );
  }

  const withViewport = reachable.filter((c) => c.hasViewport);
  if (client?.fetchedOk && !client.hasViewport && withViewport.length > 0) {
    insights.push(`All ${withViewport.length} reachable competitor site(s) are mobile-optimized (responsive viewport tag); your client's site is not — a direct disadvantage on mobile search and ads.`);
  }

  const allCompetitorSocials = Array.from(new Set(reachable.flatMap((c) => c.socialLinks)));
  const clientSocials = client?.fetchedOk ? client.socialLinks : [];
  const missingSocials = allCompetitorSocials.filter((p) => !clientSocials.includes(p));
  if (missingSocials.length > 0) {
    insights.push(`Competitors link to ${missingSocials.join(", ")} that your client's site doesn't currently link to — worth reviewing for brand presence and off-page reach.`);
  }

  const withHttps = reachable.filter((c) => c.https).length;
  if (client?.fetchedOk && !client.https && withHttps === reachable.length) {
    insights.push("Every competitor analyzed is served over HTTPS; your client's site is not — this is a trust and ranking disadvantage worth fixing first.");
  }

  const speedsKnown = reachable.filter((c) => typeof c.responseTimeMs === "number");
  if (speedsKnown.length > 0 && client?.fetchedOk && typeof client.responseTimeMs === "number") {
    const avgSpeed = Math.round(speedsKnown.reduce((sum, c) => sum + (c.responseTimeMs ?? 0), 0) / speedsKnown.length);
    if (avgSpeed >= 50 && client.responseTimeMs > avgSpeed * 1.5) {
      insights.push(`Your client's site responded in ${client.responseTimeMs}ms vs. a ${avgSpeed}ms competitor average — page speed is worth investigating.`);
    }
  }

  const platforms = reachable.map((c) => `${c.hostname} (${c.techPlatform})`);
  if (platforms.length > 0) {
    insights.push(`Platform/tech signals detected — ${platforms.join("; ")}.`);
  }

  return insights;
}
