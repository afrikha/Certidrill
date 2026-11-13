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

/** Question reports: 20 per hour per user (a report can send a question back to review). */
export const reportLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60_000 });

/** Sign-ups: 5 per hour per IP and per address (each one sends an e-mail). */
export const signupLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });

/**
 * The client address. In production Caddy sets X-Real-IP (deploy/Caddyfile:
 * the visitor behind Cloudflare, never a value sent by the client); without
 * it, the first X-Forwarded-For entry; "unknown" without either, so limits
 * still apply.
 */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
