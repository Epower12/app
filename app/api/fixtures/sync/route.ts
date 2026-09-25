import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ensureMigrations } from '@/lib/migrations';
import { resyncAllLeagues, resyncDueLeagues } from '@/lib/fixtureSync';

/**
 * POST /api/fixtures/sync
 *
 * Refreshes the tracked fixture sources (added via /owner) and then fills in
 * finished results on the league matches imported from them.
 * Designed to be called from Cloud Scheduler every 30 minutes (see docs/RESULTS.md).
 * By default only sources that are due are called (a game in progress or just
 * finished, or not refreshed for a day); `?full=1` refreshes every source.
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
        await ensureMigrations();
        const full = new URL(request.url).searchParams.get('full') === '1';
        const { results, applied } = full ? await resyncAllLeagues() : await resyncDueLeagues();
        const matchesSynced = results.reduce((sum, r) => sum + r.matchesSynced, 0);
        return NextResponse.json({
            ok: true,
            leaguesSynced: results.length,
            matchesSynced,
            resultsApplied: applied,
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
