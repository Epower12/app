import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { hasMatchStarted } from '@/lib/scoring';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - Get predictions for user
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');
        const tournamentId = searchParams.get('tournamentId');

        if (matchId) {
            const { rows } = await db.query('SELECT * FROM predictions WHERE match_id = $1 AND user_id = $2', [matchId, session.user.id]);
            return NextResponse.json(rows[0] || null);
        }

        if (tournamentId) {
            const { rows: predictions } = await db.query(`
                SELECT p.* FROM predictions p
                INNER JOIN matches m ON p.match_id = m.id
                WHERE m.tournament_id = $1 AND p.user_id = $2
            `, [tournamentId, session.user.id]);
            return NextResponse.json(predictions);
        }

        return NextResponse.json({ error: 'matchId or tournamentId required' }, { status: 400 });
    } catch (error) {
        console.error('Get predictions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Submit or update prediction
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { matchId, teamAScore, teamBScore } = await request.json();

        if (!matchId || teamAScore === undefined || teamBScore === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get match details
        const { rows: matchRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const match = matchRows[0] as any;

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Check if match has started
        if (hasMatchStarted(match.scheduled_time)) {
            return NextResponse.json({ error: 'Cannot predict after match has started' }, { status: 400 });
        }

        // Verify user is participant or auto-join if open
        const { rows: participantRows } = await db.query('SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2', [match.tournament_id, session.user.id]);
        const participant = participantRows[0];

        if (!participant) {
            const { rows: tournamentRows } = await db.query('SELECT league_type FROM tournaments WHERE id = $1', [match.tournament_id]);
            const tournament = tournamentRows[0] as any;

            if (tournament?.league_type === 'open') {
                await db.query(
                    'INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ($1, $2, $3)',
                    [uuidv4(), match.tournament_id, session.user.id]
                );
            } else {
                return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
            }
        }

        // Check if prediction exists
        const { rows: existingRows } = await db.query('SELECT id FROM predictions WHERE match_id = $1 AND user_id = $2', [matchId, session.user.id]);
        const existing = existingRows[0] as any;

        if (existing) {
            // Update existing prediction
            await db.query(
                'UPDATE predictions SET team_a_score = $1, team_b_score = $2, updated_at = CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER) WHERE id = $3',
                [teamAScore, teamBScore, existing.id]
            );

            const { rows: updatedRows } = await db.query('SELECT * FROM predictions WHERE id = $1', [existing.id]);
            return NextResponse.json(updatedRows[0]);
        } else {
            // Create new prediction
            const predictionId = uuidv4();
            await db.query(
                'INSERT INTO predictions (id, match_id, user_id, team_a_score, team_b_score) VALUES ($1, $2, $3, $4, $5)',
                [predictionId, matchId, session.user.id, teamAScore, teamBScore]
            );

            const { rows: newRows } = await db.query('SELECT * FROM predictions WHERE id = $1', [predictionId]);
            return NextResponse.json(newRows[0], { status: 201 });
        }
    } catch (error) {
        console.error('Submit prediction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
