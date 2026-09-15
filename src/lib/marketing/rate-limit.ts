// Basic in-process rate limiting for the public lead form (spec section
// 16 — anti-spam). This app runs as a single long-lived Node process (see
// the DB module's own globalThis pattern in src/lib/db/index.ts), so an
// in-memory counter is sufficient here — no external store needed for a
// single-consultant site.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;

interface Bucket {
  count: number;
  windowStart: number;
}

const globalForRateLimit = globalThis as unknown as { __leadRateLimit?: Map<string, Bucket> };
const buckets = globalForRateLimit.__leadRateLimit ?? new Map<string, Bucket>();
globalForRateLimit.__leadRateLimit = buckets;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count++;
  return bucket.count > MAX_PER_WINDOW;
}
