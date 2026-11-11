/**
 * Fixed-window in-memory rate limiter. Certidrill runs as a single Node
 * process on one VPS (spec §9), so process memory is an adequate store.
 */
export interface RateLimiter {
  /** Records a hit; returns true while the limit is not exceeded. */
  hit(key: string, now?: number): boolean;
  /** True when the key has reached the limit in the current window (does not record a hit). */
  blocked(key: string, now?: number): boolean;
  reset(key: string): void;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key, now = Date.now()) {
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        if (buckets.size > 10_000) {
          for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
        }
        return true;
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
    blocked(key, now = Date.now()) {
      const bucket = buckets.get(key);
      return !!bucket && bucket.resetAt > now && bucket.count >= limit;
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}

/** 10 failed sign-ins per 15 minutes, per e-mail and per IP; magic links per e-mail. */
export const authLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
