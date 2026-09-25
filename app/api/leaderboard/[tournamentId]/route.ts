import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { computeStandings } from '@/lib/standings';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureMigrations();

        const { tournamentId } = await params;

        // Ensure participant
        const { rows: partRows } = await db.query(
            'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
            [tournamentId, session.user.id]
        );
        if (!partRows[0]) {
            const { rows: tRows } = await db.query('SELECT league_type FROM tournaments WHERE id = $1', [tournamentId]);
            if ((tRows[0] as any)?.league_type === 'open') {
                await db.query('INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ($1, $2, $3)', [uuidv4(), tournamentId, session.user.id]);
            } else {
                return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
            }
        }

        return NextResponse.json(await computeStandings(tournamentId, session.user.id));
    } catch (error) {
        console.error('Get leaderboard error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
