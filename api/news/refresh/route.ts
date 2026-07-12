import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { refreshAllNews, purgeOffTopic, purgeMiscategorizedAndDuplicates } from '@/lib/news';

/**
 * POST /api/news/refresh
 *
 * Pulls fresh items from every RSS feed and upserts into Postgres.
 * Designed to be called from Cloud Scheduler on an hourly cron.
 *
 * Auth: requires `Authorization: Bearer <NEWS_REFRESH_SECRET>` matching the env var.
 * Cloud Scheduler is configured to send this header; random visitors can't trigger refreshes.
 *
 * Also accepts GET so Cloud Scheduler's default HTTP method works without configuration.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // RSS fetches across 7 sports can take 20-40s

async function handle(request: Request) {
    const secret = process.env.NEWS_REFRESH_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'Refresh endpoint not configured' }, { status: 500 });
    }

    // Constant-time compare to defeat timing attacks
    const header = request.headers.get('authorization') ?? '';
    const presented = header.startsWith('Bearer ') ? header.slice(7) : '';

    const a = Buffer.from(presented);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Optional one-shot purge of off-topic items already in DB.
        // Call with `?purge=1` to clean out stored items that match current off-topic keywords.
        const url = new URL(request.url);
        const purged = url.searchParams.get('purge') === '1'
            ? await purgeOffTopic()
            : 0;

        // Optional one-shot cleanup of already-stored miscategorized/duplicate items.
        // Call with `?cleanup=1` — see purgeMiscategorizedAndDuplicates() for what it does.
        const cleanup = url.searchParams.get('cleanup') === '1'
            ? await purgeMiscategorizedAndDuplicates()
            : null;

        const result = await refreshAllNews();
        return NextResponse.json({
            ok: true,
            purged,
            cleanup,
            ...result,
            at: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('News refresh failed:', err);
        return NextResponse.json(
            { error: 'Refresh failed', message: err.message ?? String(err) },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) { return handle(request); }
export async function GET(request: Request) { return handle(request); }
