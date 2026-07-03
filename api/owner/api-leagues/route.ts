import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchLeague, fetchGames, mapStatus } from '@/lib/api-sports';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

function isOwner(session: any): boolean {
    return !!session?.user?.email && session.user.email === OWNER_EMAIL;
}

// GET /api/owner/api-leagues — list all synced leagues
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    // If leagueId provided, return matches for that league (for import UI)
    if (leagueId) {
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

// POST /api/owner/api-leagues — sync a new league from API-Sports
// Body: { leagueId: number, season: number }
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leagueId, season } = await request.json();

    if (!leagueId || !season) {
        return NextResponse.json({ error: 'leagueId and season are required' }, { status: 400 });
    }

    try {
        // 1. Fetch league metadata from API-Sports
        const leagues = await fetchLeague(Number(leagueId), Number(season));
        if (!leagues.length) {
            return NextResponse.json({ error: 'League not found on API-Sports' }, { status: 404 });
        }
        const l = leagues[0];

        // 2. Upsert the league row
        const { rows: leagueRows } = await db.query(
            `INSERT INTO api_leagues (name, sport, external_id, season, country, logo_url, synced_at)
             VALUES ($1, 'Ice Hockey', $2, $3, $4, $5, EXTRACT(EPOCH FROM NOW())::BIGINT)
             ON CONFLICT (external_id, season)
             DO UPDATE SET name = EXCLUDED.name, synced_at = EXCLUDED.synced_at
             RETURNING *`,
            [l.league.name, leagueId, season, l.country.name, l.league.logo]
        );
        const dbLeague = leagueRows[0];

        // 3. Fetch all games for this league+season
        const games = await fetchGames(Number(leagueId), Number(season));

        // 4. Upsert each game into api_matches
        let upserted = 0;
        for (const g of games) {
            const status = mapStatus(g.status.short);
            const homeScore = g.scores?.home?.total ?? null;
            const awayScore = g.scores?.away?.total ?? null;

            await db.query(
                `INSERT INTO api_matches (api_league_id, external_id, home_team, away_team, match_time, status, home_score, away_score, synced_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, EXTRACT(EPOCH FROM NOW())::BIGINT)
                 ON CONFLICT (external_id)
                 DO UPDATE SET status = EXCLUDED.status, home_score = EXCLUDED.home_score,
                               away_score = EXCLUDED.away_score, synced_at = EXCLUDED.synced_at`,
                [dbLeague.id, g.id, g.teams.home.name, g.teams.away.name, g.timestamp, status, homeScore, awayScore]
            );
            upserted++;
        }

        // 5. Update match count on the league
        await db.query(
            'UPDATE api_leagues SET match_count = $1 WHERE id = $2',
            [upserted, dbLeague.id]
        );

        return NextResponse.json({
            success: true,
            league: { ...dbLeague, match_count: upserted },
            matchesSynced: upserted,
        });
    } catch (error: any) {
        console.error('API-Sports sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/owner/api-leagues — re-sync matches for an existing league
// Body: { id: number }  (api_leagues.id)
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { rows } = await db.query('SELECT * FROM api_leagues WHERE id = $1', [id]);
    if (!rows.length) return NextResponse.json({ error: 'League not found' }, { status: 404 });

    const league = rows[0];

    try {
        const games = await fetchGames(league.external_id, league.season);
        let upserted = 0;

        for (const g of games) {
            const status = mapStatus(g.status.short);
            const homeScore = g.scores?.home?.total ?? null;
            const awayScore = g.scores?.away?.total ?? null;

            await db.query(
                `INSERT INTO api_matches (api_league_id, external_id, home_team, away_team, match_time, status, home_score, away_score, synced_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, EXTRACT(EPOCH FROM NOW())::BIGINT)
                 ON CONFLICT (external_id)
                 DO UPDATE SET status = EXCLUDED.status, home_score = EXCLUDED.home_score,
                               away_score = EXCLUDED.away_score, synced_at = EXCLUDED.synced_at`,
                [league.id, g.id, g.teams.home.name, g.teams.away.name, g.timestamp, status, homeScore, awayScore]
            );
            upserted++;
        }

        await db.query(
            'UPDATE api_leagues SET match_count = $1, synced_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $2',
            [upserted, id]
        );

        return NextResponse.json({ success: true, matchesSynced: upserted });
    } catch (error: any) {
        console.error('Re-sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/owner/api-leagues?id=X — remove a synced league + its matches
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
