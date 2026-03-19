import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - List matches for a tournament
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId');

        if (!tournamentId) {
            return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
        }

        // Verify user is participant
        const { rows: participantRows } = await db.query(
            'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
            [tournamentId, session.user.id]
        );
        const participant = participantRows[0];

        if (!participant) {
            return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
        }

        const { rows: matches } = await db.query(
            'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY scheduled_time ASC',
            [tournamentId]
        );

        return NextResponse.json(matches);
    } catch (error) {
        console.error('Get matches error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new match (admin only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'admin' && session.user.role !== 'premium') {
            return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
        }

        const { tournamentId, teamA, teamB, scheduledTime, sport } = await request.json();

        if (!tournamentId || !teamA || !teamB || !scheduledTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify tournament exists and user created it
        const { rows: tournamentRows } = await db.query(
            'SELECT * FROM tournaments WHERE id = $1 AND created_by = $2',
            [tournamentId, session.user.id]
        );
        const tournament = tournamentRows[0] as any;

        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found or not authorized' }, { status: 404 });
        }

        const matchId = uuidv4();
        await db.query(
            'INSERT INTO matches (id, tournament_id, team_a, team_b, scheduled_time, sport) VALUES ($1, $2, $3, $4, $5, $6)',
            [matchId, tournamentId, teamA, teamB, scheduledTime, sport || tournament.sport || 'Football']
        );

        const { rows: newMatchRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const match = newMatchRows[0];

        return NextResponse.json(match, { status: 201 });
    } catch (error) {
        console.error('Create match error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
