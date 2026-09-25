import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import geoip from 'geoip-lite';

// Security headers applied to every response
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '1; mode=block',
};

// Public API routes that do NOT require authentication
const PUBLIC_API_ROUTES = new Set([
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/tournaments/open',
    '/api/stripe/webhook',  // Stripe servers POST events here — signed, not session-auth
    '/api/news/refresh',    // Cloud Scheduler cron — protected by NEWS_REFRESH_SECRET bearer token
    '/api/fixtures/sync',   // Cloud Scheduler cron — protected by FIXTURE_SYNC_SECRET bearer token
]);

// ── Host-based routing ───────────────────────────────────────
// yourfriendleague.com           → marketing-only (landing page)
// app.yourfriendleague.com       → the actual app (login, predictions, etc.)
// www.yourfriendleague.com       → canonicalize to root
// sport-predictions-*.run.app    → no redirects (for testing)
const PROD_ROOT = 'yourfriendleague.com';
const PROD_APP = 'app.yourfriendleague.com';
const PROD_WWW = 'www.yourfriendleague.com';

// Paths that belong on the marketing root domain (exact matches)
const MARKETING_PATHS = new Set([
    '/', '/landing', '/landing/',
    '/legal', '/legal/',
    '/terms', '/terms/',
    '/privacy', '/privacy/',
    '/blog', '/blog/',
    '/news', '/news/',
]);

// Marketing path *prefixes* — any path under these stays on the root domain.
// Used for dynamic routes like /blog/[slug].
const MARKETING_PREFIXES = ['/blog/', '/news/'];

function isStaticOrInternal(pathname: string): boolean {
    return (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/') || // let API hit either host — backend doesn't care
        pathname === '/favicon.ico' ||
        pathname === '/logo.png' ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml'
    );
}

// ── Visitor region (for regional copy, e.g. "Football" vs "Soccer") ──────
// geoip-lite ships its own offline IP→country database (no external calls,
// no rate limits) — safe to run per-request in this Node.js-runtime proxy.
function getClientIp(request: NextRequest): string | undefined {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        undefined
    );
}

function resolveVisitorRegion(request: NextRequest): 'us' | 'intl' {
    const ip = getClientIp(request);
    if (!ip) return 'intl';
    const geo = geoip.lookup(ip);
    return geo?.country === 'US' ? 'us' : 'intl';
}

// In-memory rate limiter for the login endpoint (NextAuth POSTs to /api/auth/callback/credentials)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): boolean {
    const now = Date.now();
    const window = 15 * 60 * 1000; // 15 minutes
    const limit = 10;

    const entry = loginAttempts.get(ip);
    if (!entry || entry.resetAt < now) {
        loginAttempts.set(ip, { count: 1, resetAt: now + window });
        return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
}

export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const host = (request.headers.get('host') ?? '').toLowerCase();

    // Forward the resolved region to Server Components via a request header
    // (only meaningful for page renders, but cheap enough to set unconditionally).
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-visitor-region', resolveVisitorRegion(request));
    const response = NextResponse.next({ request: { headers: forwardedHeaders } });

    // Apply security headers to every response
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(header, value);
    }

    // ── Host-based redirects (production only, never for static/API/internal) ──
    if (!isStaticOrInternal(pathname)) {
        // Canonicalize www → root
        if (host === PROD_WWW) {
            return NextResponse.redirect(`https://${PROD_ROOT}${pathname}${search}`, 308);
        }

        // Root marketing domain: only landing-related paths allowed; redirect everything else to app subdomain
        const isMarketingPath = MARKETING_PATHS.has(pathname)
            || MARKETING_PREFIXES.some(prefix => pathname.startsWith(prefix));
        if (host === PROD_ROOT && !isMarketingPath) {
            return NextResponse.redirect(`https://${PROD_APP}${pathname}${search}`, 308);
        }

        // App subdomain: marketing-only paths belong on the marketing root
        if (host === PROD_APP && isMarketingPath && pathname !== '/') {
            return NextResponse.redirect(`https://${PROD_ROOT}${pathname}${search}`, 308);
        }
    }

    // Rate-limit login attempts at the edge before they reach NextAuth
    if (pathname === '/api/auth/callback/credentials' && request.method === 'POST') {
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
            request.headers.get('x-real-ip') ??
            'unknown';

        if (!checkLoginRateLimit(ip)) {
            return new NextResponse(
                JSON.stringify({ error: 'Too many login attempts. Please try again in 15 minutes.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '900',
                        ...SECURITY_HEADERS,
                    },
                }
            );
        }
    }

    // Protect /api/* routes — require a valid session token
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
        // Skip public routes
        if (!PUBLIC_API_ROUTES.has(pathname)) {
            const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
            if (!token) {
                return new NextResponse(
                    JSON.stringify({ error: 'Unauthorized' }),
                    {
                        status: 401,
                        headers: {
                            'Content-Type': 'application/json',
                            ...SECURITY_HEADERS,
                        },
                    }
                );
            }
        }
    }

    return response;
}

export const config = {
    matcher: [
        // Apply to all routes except static files and Next.js internals
        '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|mp4|webm)).*)',
    ],
};
