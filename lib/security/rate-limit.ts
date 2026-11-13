/**
 * Fixed-window in-memory rate limiter. Certidrill runs as a single Node
 * process on one VPS (spec §9), so process memory is an adequate store.
 */
export interface RateLimiter {
  /** Records a hit; returns true while the limit is not exceeded. */
  hit(key: string, now?: number): boolean;
  /**
   * Records a hit like hit(), and returns a way to give it back (an attempt
   * that turned out not to count). Giving back only touches the window the
   * hit was counted in: once that window has ended, or the key was reset, it
   * does nothing, so it never lowers the count of a later window.
   */
  take(key: string, now?: number): { ok: boolean; release(now?: number): void };
  /** True when the key has reached the limit in the current window (does not record a hit). */
  blocked(key: string, now?: number): boolean;
  /** Forgets the key: every hit of its window, including tries still in flight. */
  reset(key: string): void;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  function take(key: string, now = Date.now()) {
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      }
    }
    bucket.count += 1;
    const counted = bucket;
    return {
      ok: counted.count <= limit,
      release(at = Date.now()) {
        // The same bucket object: a new window or a reset made a new one.
        if (buckets.get(key) === counted && counted.resetAt > at && counted.count > 0) counted.count -= 1;
      },
    };
  }
  return {
    hit: (key, now) => take(key, now).ok,
    take,
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

/** Checkout sessions: 10 per hour per user (each one creates Stripe objects). */
export const checkoutLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });

/** Wrong passwords on a sign-up confirmation link: 5 per 15 minutes per link. */
export const confirmLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

/**
 * The client address. In production Caddy sets X-Real-IP (deploy/Caddyfile:
 * the visitor behind Cloudflare, never a value sent by the client); without
 * it, "unknown", so limits still apply. Outside production (no Caddy), the
 * first X-Forwarded-For entry: a client can set it, so it is never trusted
 * in production.
 */
export function clientIp(headers: Headers, production = process.env.NODE_ENV === "production"): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  if (production) return "unknown";
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
