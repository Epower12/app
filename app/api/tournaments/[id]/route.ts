import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../../../lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';
import { ensureMigrations } from '../../../../lib/migrations';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureMigrations();

        const { id } = await params;
        const { is_active, race_bonus_config } = await request.json();

        if (is_active === undefined && race_bonus_config === undefined) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        // Only the creator can edit their league
        const { rows } = await db.query('SELECT created_by FROM tournaments WHERE id = $1', [id]);
        const tournament = rows[0] as any;
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        if (tournament.created_by !== (session.user as any).id) {
            return NextResponse.json({ error: 'Only the league creator can do this' }, { status: 403 });
        }

        if (is_active !== undefined) {
            await db.query('UPDATE tournaments SET is_active = $1 WHERE id = $2', [is_active ? true : false, id]);
        }
        if (race_bonus_config !== undefined) {
            await db.query('UPDATE tournaments SET race_bonus_config = $1 WHERE id = $2', [JSON.stringify(race_bonus_config), id]);
        }

        const { rows: updated } = await db.query('SELECT * FROM tournaments WHERE id = $1', [id]);
        return NextResponse.json(updated[0]);

    } catch (error) {
        console.error('Update tournament error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
