import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureLogosForTeams } from '@/lib/teamLogos';

// POST /api/matches/import
// Body: { tournamentId: string, apiMatchIds: number[] }
// Imports selected api_matches rows as real matches in a tournament
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'admin' && user.role !== 'premium') {
        return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
    }

    const { tournamentId, apiMatchIds } = await request.json();

    if (!tournamentId || !Array.isArray(apiMatchIds) || apiMatchIds.length === 0) {
        return NextResponse.json({ error: 'tournamentId and apiMatchIds[] are required' }, { status: 400 });
    }

    // Verify the tournament belongs to this user
    const { rows: tournamentRows } = await db.query(
        'SELECT * FROM tournaments WHERE id = $1 AND created_by = $2',
        [tournamentId, session.user.id]
    );
    if (!tournamentRows.length) {
        return NextResponse.json({ error: 'Tournament not found or not authorized' }, { status: 404 });
    }
    const tournament = tournamentRows[0] as any;

    // Fetch the selected api_matches
    const placeholders = apiMatchIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
    const { rows: apiMatches } = await db.query(
        `SELECT * FROM api_matches WHERE id IN (${placeholders})`,
        apiMatchIds
    );

    if (!apiMatches.length) {
        return NextResponse.json({ error: 'No valid API matches found' }, { status: 404 });
    }

    // Skip any already imported (same api_match_id in this tournament)
    const { rows: existing } = await db.query(
        `SELECT api_match_id FROM matches WHERE tournament_id = $1 AND api_match_id IS NOT NULL`,
        [tournamentId]
    );
    const existingIds = new Set(existing.map((r: any) => r.api_match_id));

    const toImport = apiMatches.filter((m: any) => !existingIds.has(m.id));

    if (!toImport.length) {
        return NextResponse.json({ error: 'All selected matches are already imported' }, { status: 409 });
    }

    // Insert each as a match row
    const inserted = [];
    const teamNames: string[] = [];
    for (const am of toImport) {
        const matchId = uuidv4();
        const isFinished = am.status === 'finished';

        await db.query(
            `INSERT INTO matches
             (id, tournament_id, team_a, team_b, scheduled_time, sport, source, api_match_id,
              team_a_score, team_b_score, is_finished)
             VALUES ($1, $2, $3, $4, $5, $6, 'api', $7, $8, $9, $10)`,
            [
                matchId,
                tournamentId,
                am.home_team,
                am.away_team,
                am.match_time,
                tournament.sport || 'Ice Hockey',
                am.id,
                am.home_score,
                am.away_score,
                isFinished,
            ]
        );
        inserted.push(matchId);
        teamNames.push(am.home_team, am.away_team);
    }

    // Background fetch logos for any new team names
    ensureLogosForTeams(teamNames);

    return NextResponse.json({ success: true, imported: inserted.length, skipped: apiMatches.length - toImport.length });
}
