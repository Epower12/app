import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST /api/matches/import-race
// Body: { tournamentId: string, apiRaceIds: number[] }
// Imports selected api_races rows as real match_type='race' matches in a tournament.
// Follows the same "Home Team = event name, Away Team = season/series" convention
// used for manually-created race matches (see /manage's Add Match form).
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'admin' && user.role !== 'premium') {
        return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
    }

    const { tournamentId, apiRaceIds } = await request.json();

    if (!tournamentId || !Array.isArray(apiRaceIds) || apiRaceIds.length === 0) {
        return NextResponse.json({ error: 'tournamentId and apiRaceIds[] are required' }, { status: 400 });
    }

    const { rows: tournamentRows } = await db.query(
        'SELECT * FROM tournaments WHERE id = $1 AND created_by = $2',
        [tournamentId, session.user.id]
    );
    if (!tournamentRows.length) {
        return NextResponse.json({ error: 'Tournament not found or not authorized' }, { status: 404 });
    }

    const placeholders = apiRaceIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
    const { rows: apiRaces } = await db.query(
        `SELECT * FROM api_races WHERE id IN (${placeholders})`,
        apiRaceIds
    );

    if (!apiRaces.length) {
        return NextResponse.json({ error: 'No valid API races found' }, { status: 404 });
    }

    const { rows: existing } = await db.query(
        `SELECT api_race_id FROM matches WHERE tournament_id = $1 AND api_race_id IS NOT NULL`,
        [tournamentId]
    );
    const existingIds = new Set(existing.map((r: any) => r.api_race_id));

    const toImport = apiRaces.filter((r: any) => !existingIds.has(r.id));

    if (!toImport.length) {
        return NextResponse.json({ error: 'All selected races are already imported' }, { status: 409 });
    }

    const inserted = [];
    for (const ar of toImport) {
        const matchId = uuidv4();
        const isFinished = ar.status === 'finished';

        await db.query(
            `INSERT INTO matches
             (id, tournament_id, team_a, team_b, scheduled_time, sport, source, api_race_id,
              match_type, race_session, is_finished, p1_driver, p2_driver, p3_driver)
             VALUES ($1, $2, $3, $4, $5, 'Formula 1', 'api', $6, 'race', 'race', $7, $8, $9, $10)`,
            [
                matchId,
                tournamentId,
                ar.race_name,
                `${ar.season} F1`,
                ar.race_time,
                ar.id,
                isFinished,
                ar.p1_driver,
                ar.p2_driver,
                ar.p3_driver,
            ]
        );
        inserted.push(matchId);
    }

    return NextResponse.json({ success: true, imported: inserted.length, skipped: apiRaces.length - toImport.length });
}
