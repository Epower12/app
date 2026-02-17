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
        const tournament = db
            .prepare('SELECT * FROM tournaments WHERE join_code = ? AND is_active = 1')
            .get(joinCode.toUpperCase());

        if (!tournament) {
            return NextResponse.json({ error: 'Invalid or inactive tournament code' }, { status: 404 });
        }

        // Check if already joined
        const existing = db
            .prepare('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?')
            .get((tournament as any).id, session.user.id);

        if (existing) {
            return NextResponse.json({ error: 'Already joined this tournament' }, { status: 409 });
        }

        // Add participant
        const participantId = uuidv4();
        db.prepare(
            'INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES (?, ?, ?)'
        ).run(participantId, (tournament as any).id, session.user.id);

        return NextResponse.json({ message: 'Joined tournament successfully', tournament }, { status: 201 });
    } catch (error) {
        console.error('Join tournament error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
