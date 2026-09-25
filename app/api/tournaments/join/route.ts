import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST - Join tournament by code
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { joinCode } = await request.json();

        if (!joinCode) {
            return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
        }

        // Find tournament by join code
        const { rows: tournamentRows } = await db.query('SELECT * FROM tournaments WHERE join_code = $1 AND is_active = true', [joinCode.toUpperCase()]);
        const tournament = tournamentRows[0];

        if (!tournament) {
            return NextResponse.json({ error: 'Invalid or inactive tournament code' }, { status: 404 });
        }

        // Check if already joined
        const { rows: existingRows } = await db.query('SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2', [(tournament as any).id, session.user.id]);
        const existing = existingRows[0];

        if (existing) {
            return NextResponse.json({
                error: 'Already joined this tournament',
                tournamentId: (tournament as any).id,
                tournamentName: (tournament as any).name,
            }, { status: 409 });
        }

        // Add participant
        const participantId = uuidv4();
        await db.query(
            'INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ($1, $2, $3)',
            [participantId, (tournament as any).id, session.user.id]
        );

        return NextResponse.json({
            message: 'Joined tournament successfully',
            tournamentId: (tournament as any).id,
            tournamentName: (tournament as any).name,
        }, { status: 201 });
    } catch (error) {
        console.error('Join tournament error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
