import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '../../../lib/db';
import { generateJoinCode } from '../../../lib/scoring';
import { authOptions } from '../auth/[...nextauth]/route';
import { ensureMigrations } from '../../../lib/migrations';

// GET - List tournaments for current user
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('id');

        if (tournamentId) {
            // Get specific tournament
            const { rows: tournamentRows } = await db.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
            const tournament = tournamentRows[0];

            if (!tournament) {
                return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
            }

            return NextResponse.json(tournament);
        }

        await ensureMigrations();

        // Get all tournaments user has joined, plus the "what should I do next"
        // numbers the league cards show: open matches, how many still need this
        // user's prediction, the next kick-off, and (for organisers) matches that
        // have started but still need a final result.
        const now = Math.floor(Date.now() / 1000);
        const { rows: tournaments } = await db.query(`
            SELECT t.*,
                tp.joined_at,
                (SELECT COUNT(*)::int FROM tournament_participants x WHERE x.tournament_id = t.id) AS member_count,
                (SELECT COUNT(*)::int FROM matches m
                    WHERE m.tournament_id = t.id AND NOT m.is_finished AND m.scheduled_time > $2) AS open_matches,
                (SELECT COUNT(*)::int FROM matches m
                    WHERE m.tournament_id = t.id AND NOT m.is_finished AND m.scheduled_time > $2
                      AND NOT EXISTS (SELECT 1 FROM predictions p WHERE p.match_id = m.id AND p.user_id = $1)
                      AND NOT EXISTS (SELECT 1 FROM race_weekend_predictions r WHERE r.match_id = m.id AND r.user_id = $1)
                ) AS to_predict,
                (SELECT MIN(m.scheduled_time) FROM matches m
                    WHERE m.tournament_id = t.id AND NOT m.is_finished AND m.scheduled_time > $2) AS next_kickoff,
                (SELECT COUNT(*)::int FROM matches m
                    WHERE m.tournament_id = t.id AND NOT m.is_finished AND m.scheduled_time <= $2) AS awaiting_results,
                (SELECT COUNT(*)::int FROM matches m WHERE m.tournament_id = t.id) AS total_matches
            FROM tournaments t
            INNER JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE tp.user_id = $1
            ORDER BY t.created_at DESC
        `, [(session.user as any).id, now]);

        return NextResponse.json(tournaments);
    } catch (error) {
        console.error('Get tournaments error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new tournament (admin only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if ((session.user as any).role !== 'admin' && (session.user as any).role !== 'premium') {
            return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
        }

        const { name, sport, league_type, description, max_participants } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 });
        }

        // Generate unique join code
        let joinCode = generateJoinCode();
        let attempts = 0;
        while (attempts < 10) {
            const { rows: existing } = await db.query('SELECT id FROM tournaments WHERE join_code = $1', [joinCode]);
            if (existing.length === 0) break;
            joinCode = generateJoinCode();
            attempts++;
        }

        const tournamentId = uuidv4();
        // Use RETURNING * to get the created tournament in one query
        const { rows: tournamentRows } = await db.query(
            'INSERT INTO tournaments (id, name, join_code, created_by, sport, league_type, description, max_participants) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [
                tournamentId, name, joinCode, (session.user as any).id,
                sport || 'Football',
                league_type || 'open',
                description || '',
                max_participants || 0
            ]
        );

        // Automatically add creator as participant
        const participantId = uuidv4();
        await db.query(
            'INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ($1, $2, $3)',
            [participantId, tournamentId, (session.user as any).id]
        );

        const tournament = tournamentRows[0];

        return NextResponse.json(tournament, { status: 201 });
    } catch (error) {
        console.error('Create tournament error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
