/**
 * Tiny in-memory fixed-window rate limiter.
 *
 * Good enough for one server instance / local development. On Vercel each
 * serverless instance has its own memory, so for real protection swap this
 * for Upstash Redis or Vercel's WAF rate limiting (see README → Hardening).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now(),
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    prune(now);
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export function resetRateLimits() {
  buckets.clear();
}
