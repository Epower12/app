import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '../../../lib/db';
import { generateJoinCode } from '../../../lib/scoring';
import { authOptions } from '../auth/[...nextauth]/route';

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
            const tournament = db
                .prepare('SELECT * FROM tournaments WHERE id = ?')
                .get(tournamentId);

            if (!tournament) {
                return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
            }

            return NextResponse.json(tournament);
        }

        // Get all tournaments user has joined
        const tournaments = db
            .prepare(`
        SELECT t.* FROM tournaments t
        INNER JOIN tournament_participants tp ON t.id = tp.tournament_id
        WHERE tp.user_id = ?
        ORDER BY t.created_at DESC
      `)
            .all((session.user as any).id);

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

        const { name, sport } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 });
        }

        // Generate unique join code
        let joinCode = generateJoinCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = db
                .prepare('SELECT id FROM tournaments WHERE join_code = ?')
                .get(joinCode);
            if (!existing) break;
            joinCode = generateJoinCode();
            attempts++;
        }

        const tournamentId = uuidv4();
        db.prepare(
            'INSERT INTO tournaments (id, name, join_code, created_by, sport) VALUES (?, ?, ?, ?, ?)'
        ).run(tournamentId, name, joinCode, (session.user as any).id, sport || 'Football');

        // Automatically add creator as participant
        const participantId = uuidv4();
        db.prepare(
            'INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES (?, ?, ?)'
        ).run(participantId, tournamentId, (session.user as any).id);

        const tournament = db
            .prepare('SELECT * FROM tournaments WHERE id = ?')
            .get(tournamentId);

        return NextResponse.json(tournament, { status: 201 });
    } catch (error) {
        console.error('Create tournament error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
