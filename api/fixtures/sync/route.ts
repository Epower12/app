import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { resyncAllLeagues } from '@/lib/fixtureSync';

/**
 * POST /api/fixtures/sync
 *
 * Re-syncs every currently tracked API-Sports league (added via /owner) into api_matches.
 * Designed to be called from Cloud Scheduler on a daily cron.
 *
 * Auth: requires `Authorization: Bearer <FIXTURE_SYNC_SECRET>` matching the env var.
 * Matches the pattern used by /api/news/refresh.
 *
 * Also accepts GET so Cloud Scheduler's default HTTP method works without configuration.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // a full NHL season walk is dozens of sequential requests

async function handle(request: Request) {
    const secret = process.env.FIXTURE_SYNC_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'Sync endpoint not configured' }, { status: 500 });
    }

    const header = request.headers.get('authorization') ?? '';
    const presented = header.startsWith('Bearer ') ? header.slice(7) : '';

    const a = Buffer.from(presented);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = await resyncAllLeagues();
        const matchesSynced = results.reduce((sum, r) => sum + r.matchesSynced, 0);
        return NextResponse.json({
            ok: true,
            leaguesSynced: results.length,
            matchesSynced,
            results,
            at: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('Fixture sync failed:', err);
        return NextResponse.json(
            { error: 'Sync failed', message: err.message ?? String(err) },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) { return handle(request); }
export async function GET(request: Request) { return handle(request); }
