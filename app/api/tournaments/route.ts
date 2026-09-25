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
            const { rows: tournamentRows } = await db.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
            const tournament = tournamentRows[0];

            if (!tournament) {
                return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
            }

            return NextResponse.json(tournament);
        }

        // Get all tournaments user has joined
        const { rows: tournaments } = await db.query(`
            SELECT t.* FROM tournaments t
            INNER JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE tp.user_id = $1
            ORDER BY t.created_at DESC
        `, [(session.user as any).id]);

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
