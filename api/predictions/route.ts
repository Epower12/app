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
            // Get prediction for specific match
            const prediction = db
                .prepare('SELECT * FROM predictions WHERE match_id = ? AND user_id = ?')
                .get(matchId, session.user.id);

            return NextResponse.json(prediction || null);
        }

        if (tournamentId) {
            // Get all predictions for tournament
            const predictions = db
                .prepare(`
          SELECT p.* FROM predictions p
          INNER JOIN matches m ON p.match_id = m.id
          WHERE m.tournament_id = ? AND p.user_id = ?
        `)
                .all(tournamentId, session.user.id);

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
        const match = db
            .prepare('SELECT * FROM matches WHERE id = ?')
            .get(matchId) as any;

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Check if match has started
        if (hasMatchStarted(match.scheduled_time)) {
            return NextResponse.json({ error: 'Cannot predict after match has started' }, { status: 400 });
        }

        // Verify user is participant
        const participant = db
            .prepare('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?')
            .get(match.tournament_id, session.user.id);

        if (!participant) {
            return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
        }

        // Check if prediction exists
        const existing = db
            .prepare('SELECT id FROM predictions WHERE match_id = ? AND user_id = ?')
            .get(matchId, session.user.id) as any;

        if (existing) {
            // Update existing prediction
            db.prepare(
                'UPDATE predictions SET team_a_score = ?, team_b_score = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
            ).run(teamAScore, teamBScore, existing.id);

            const prediction = db.prepare('SELECT * FROM predictions WHERE id = ?').get(existing.id);
            return NextResponse.json(prediction);
        } else {
            // Create new prediction
            const predictionId = uuidv4();
            db.prepare(
                'INSERT INTO predictions (id, match_id, user_id, team_a_score, team_b_score) VALUES (?, ?, ?, ?, ?)'
            ).run(predictionId, matchId, session.user.id, teamAScore, teamBScore);

            const prediction = db.prepare('SELECT * FROM predictions WHERE id = ?').get(predictionId);
            return NextResponse.json(prediction, { status: 201 });
        }
    } catch (error) {
        console.error('Submit prediction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
