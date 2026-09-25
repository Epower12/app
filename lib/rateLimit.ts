/**
 * Simple in-memory rate limiter using a sliding window.
 * Works per Cloud Run instance — good enough to block trivial brute-force.
 * For multi-instance production hardening, swap for Upstash Redis.
 */

interface WindowEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Clean up stale entries every 10 minutes to avoid memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) store.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * @param key       Unique key, e.g. `login:1.2.3.4`
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns { allowed: boolean, remaining: number, retryAfterMs: number }
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
    }

    if (entry.count >= limit) {
        return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/** Extract the best available client IP from a Next.js Request */
export function getClientIp(request: Request): string {
    const headers = request.headers;
    return (
        headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        headers.get('x-real-ip') ??
        'unknown'
    );
}
