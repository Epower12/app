import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
    VALID_API_SPORTS,
    syncNewApiSportsLeague,
    syncNewNhlSeason,
    syncNewF1Season,
    resyncLeagueById,
    type FixtureProvider,
} from '@/lib/fixtureSync';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

function isOwner(session: any): boolean {
    return !!session?.user?.email && session.user.email === OWNER_EMAIL;
}

// GET /api/owner/api-leagues — list all tracked sources
// GET /api/owner/api-leagues?leagueId=X — list staged items for that source (api_matches or api_races)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (leagueId) {
        const { rows: leagueRows } = await db.query('SELECT * FROM api_leagues WHERE id = $1', [leagueId]);
        if (!leagueRows.length) return NextResponse.json({ error: 'League not found' }, { status: 404 });

        if (leagueRows[0].provider === 'jolpica-f1') {
            const { rows } = await db.query(
                `SELECT * FROM api_races WHERE api_league_id = $1 ORDER BY round ASC`,
                [leagueId]
            );
            return NextResponse.json(rows);
        }

        const { rows } = await db.query(
            `SELECT am.*, al.name as league_name
             FROM api_matches am
             JOIN api_leagues al ON am.api_league_id = al.id
             WHERE am.api_league_id = $1
             ORDER BY am.match_time ASC`,
            [leagueId]
        );
        return NextResponse.json(rows);
    }

    const { rows } = await db.query(
        'SELECT * FROM api_leagues ORDER BY synced_at DESC'
    );
    return NextResponse.json(rows);
}

// POST /api/owner/api-leagues — start tracking a new source
// Body (api-sports): { provider: 'api-sports', sport: 'Ice Hockey' | 'Football', leagueId: number, season: number }
// Body (nhl):        { provider: 'nhl', season: number }               // season = start year, e.g. 2025 for 2025-26
// Body (jolpica-f1): { provider: 'jolpica-f1', season: number }        // season = calendar year, e.g. 2026
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const provider: FixtureProvider = body.provider ?? 'api-sports';
    const season = Number(body.season);

    if (!season) {
        return NextResponse.json({ error: 'season is required' }, { status: 400 });
    }

    try {
        if (provider === 'nhl') {
            const { league, matchesSynced } = await syncNewNhlSeason(season);
            return NextResponse.json({ success: true, league, matchesSynced });
        }

        if (provider === 'jolpica-f1') {
            const { league, matchesSynced } = await syncNewF1Season(season);
            return NextResponse.json({ success: true, league, matchesSynced });
        }

        const sport = body.sport ?? 'Ice Hockey';
        const leagueId = Number(body.leagueId);
        if (!leagueId) return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });
        if (!VALID_API_SPORTS.includes(sport)) {
            return NextResponse.json({ error: `sport must be one of: ${VALID_API_SPORTS.join(', ')}` }, { status: 400 });
        }

        const { league, matchesSynced } = await syncNewApiSportsLeague(sport, leagueId, season);
        return NextResponse.json({ success: true, league, matchesSynced });
    } catch (error: any) {
        console.error('Fixture sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/owner/api-leagues — re-sync an already-tracked source
// Body: { id: number }  (api_leagues.id)
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    try {
        const { matchesSynced } = await resyncLeagueById(Number(id));
        return NextResponse.json({ success: true, matchesSynced });
    } catch (error: any) {
        console.error('Re-sync error:', error);
        const status = error.message === 'League not found' ? 404 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

// DELETE /api/owner/api-leagues?id=X — remove a tracked source + its staged matches/races
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await db.query('DELETE FROM api_leagues WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
}
