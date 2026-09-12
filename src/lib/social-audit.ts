// Lightweight, honest live check for a business's own social media links
// (Facebook, Instagram, LinkedIn, YouTube), entered on the Business Details
// step. Same non-fabrication principle as website-audit.ts: report only what
// a plain server-side fetch can actually verify — never a guessed or
// fabricated follower count / engagement number.
//
// Facebook, Instagram and LinkedIn pages are typically JS-rendered and
// gated behind a login wall for non-browser requests, so a plain fetch
// usually can't reach real profile content there — that's reported honestly
// as "not reachable" (with the raw HTTP status when available), never
// guessed at. YouTube channel pages are more often server-rendered and
// publicly viewable, so a check there is more likely to succeed.
//
// When a page IS reachable, we never surface its raw "about"/bio text —
// only structured, labeled stats parsed from the page's own public
// metadata. Each platform exposes a different, narrow slice of real numbers
// publicly, so each gets only the metric(s) that slice can actually
// support:
//   - Instagram: Followers, Following, Posts (its og:description follows a
//     predictable "N Followers, N Following, N Posts" pattern)
//   - Facebook: Followers only
//   - LinkedIn: Followers only
//   - YouTube: Subscribers, Videos (embedded in the page's inline data,
//     not og:description)
// If nothing structured can be honestly parsed for a platform, we say so
// plainly instead of showing unrelated bio text.
//
// Real follower/engagement numbers the platform doesn't expose publicly
// always come from the consultant pasting them in from that platform's own
// Insights/Analytics — see the "Real metrics" field shown next to each
// check in the wizard (SocialMediaInsightsPanel, assessment/new/page.tsx)
// and the "Off-Page Metrics" / "Local Presence" sections, which use the
// exact same pattern for data that can't be honestly scraped.

import { fetchText, extractTag } from "./website-audit";

export interface SocialMetric {
  label: string;
  value: string;
}

export interface SocialCheckResult {
  checkedUrl: string;
  reachable: boolean;
  https: boolean;
  pageTitle?: string;
  // Structured, labeled stats parsed from the page's own public metadata —
  // never raw bio/about text. Empty when the page is reachable but exposes
  // no parseable public numbers (common for Facebook/LinkedIn).
  metrics: SocialMetric[];
  error?: string;
}

type Platform = "facebook" | "instagram" | "linkedin" | "youtube" | "other";

function detectPlatform(url: string): Platform {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  return "other";
}

// Decode named + numeric (decimal and hex) HTML entities. extractTag's regex
// capture is a raw, byte-for-byte slice of the attribute value — it does not
// unescape entities, so text containing e.g. non-Latin script encoded as
// `&#xbb5;` or an ampersand as `&amp;` comes through as literal entity codes
// unless this runs first.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const isHex = entity[1] === "x" || entity[1] === "X";
      const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isNaN(code)) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function compactNumber(raw: string): string {
  return raw.replace(/\s+/g, "");
}

// Best-effort extraction of structured, labeled stats from a page's public
// metadata. Only ever returns numbers that were actually present in the
// fetched page — no defaults, no estimates. Different platforms expose
// different (narrow) slices of real data to a plain, logged-out fetch, so
// each gets its own pattern rather than one generic approach.
function extractMetrics(platform: Platform, html: string, description?: string): SocialMetric[] {
  const metrics: SocialMetric[] = [];

  if (platform === "instagram" && description) {
    // Instagram's public og:description follows a stable, well-known format:
    // "11K Followers, 0 Following, 1,499 Posts - See Instagram photos..."
    const m = description.match(
      /(\d[\d,.]*\s*[KMB]?)\s+Followers,\s*(\d[\d,.]*\s*[KMB]?)\s+Following,\s*(\d[\d,.]*\s*[KMB]?)\s+Posts/i
    );
    if (m) {
      metrics.push({ label: "Followers", value: compactNumber(m[1]) });
      metrics.push({ label: "Following", value: compactNumber(m[2]) });
      metrics.push({ label: "Posts", value: compactNumber(m[3]) });
    }
  }

  if (platform === "facebook") {
    // Facebook Page follower count is the one metric worth surfacing here —
    // likes/"talking about this" are legacy Graph-API-era numbers most
    // current Pages don't expose to a plain fetch at all, and showing a
    // half-populated mix of whichever ones happen to be present reads as
    // messier than just showing Followers alone. Many modern business Pages
    // don't put it in og:description (confirmed against a real Page) but do
    // still embed it as a plain numeric field in the page's inline JSON —
    // tried in order of how likely each is to actually be present.
    const match =
      (description && description.match(/(\d[\d,.]*\s*[KMB]?)\s+[Ff]ollowers/)) ||
      html.match(/"follower_count"\s*:\s*(\d+)/) ||
      html.match(/"fan_count"\s*:\s*(\d+)/) ||
      html.match(/"page_likers"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
    if (match) metrics.push({ label: "Followers", value: compactNumber(match[1]) });
  }

  if (platform === "linkedin" && description) {
    const followers = description.match(/(\d[\d,.]*\s*[KMB]?)\s+followers/i);
    if (followers) metrics.push({ label: "Followers", value: compactNumber(followers[1]) });
  }

  if (platform === "youtube") {
    // YouTube channel pages don't put the subscriber count in og:description,
    // but server-rendered pages embed it in the page's inline data as
    // subscriberCountText (e.g. "12.3K subscribers"). Best-effort only.
    const subs =
      html.match(/"subscriberCountText":\s*\{\s*"simpleText":\s*"([^"]+)"/) ??
      html.match(/"subscriberCountText":\s*\{\s*"accessibility":\s*\{\s*"accessibilityData":\s*\{\s*"label":\s*"([^"]+)"/);
    if (subs) metrics.push({ label: "Subscribers", value: decodeHtmlEntities(subs[1]) });

    const videos =
      html.match(/"videosCountText":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/) ??
      html.match(/"videoCountText":\s*\{\s*"simpleText":\s*"([^"]+)"/);
    if (videos) metrics.push({ label: "Videos", value: decodeHtmlEntities(videos[1]) });
  }

  return metrics;
}

export async function runSocialCheck(rawUrl: string): Promise<SocialCheckResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const https = url.startsWith("https://");
  const platform = detectPlatform(url);

  const page = await fetchText(url);
  if (!page.ok || !page.text) {
    return {
      checkedUrl: url,
      reachable: false,
      https,
      metrics: [],
      error: `Could not fetch this page (${page.status ?? "network error"}). Most social platforms block automated page loads, so this is expected — paste real metrics from the platform's own Insights/Analytics below instead.`,
    };
  }

  const html = page.text;
  const rawTitle =
    extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ??
    extractTag(html, /<title[^>]*>([^<]*)<\/title>/i);
  const rawDescription = extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);

  const pageTitle = rawTitle ? decodeHtmlEntities(rawTitle) : undefined;
  const description = rawDescription ? decodeHtmlEntities(rawDescription) : undefined;
  const metrics = extractMetrics(platform, html, description);

  return {
    checkedUrl: url,
    reachable: true,
    https,
    pageTitle,
    metrics,
  };
}
