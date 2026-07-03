import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../../../lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { is_active } = await request.json();

        if (is_active === undefined) {
            return NextResponse.json({ error: 'Missing is_active field' }, { status: 400 });
        }

        // Only the creator can open/close their league
        const { rows } = await db.query('SELECT created_by FROM tournaments WHERE id = $1', [id]);
        const tournament = rows[0] as any;
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        if (tournament.created_by !== (session.user as any).id) {
            return NextResponse.json({ error: 'Only the league creator can do this' }, { status: 403 });
        }

        await db.query('UPDATE tournaments SET is_active = $1 WHERE id = $2', [is_active ? true : false, id]);

        return NextResponse.json({ success: true, is_active: !!is_active });

    } catch (error) {
        console.error('Update tournament status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
