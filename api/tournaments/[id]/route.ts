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

        const role = (session.user as any).role;
        const email = (session.user as any).email;
        const isOwner = email === process.env.NEXT_PUBLIC_OWNER_EMAIL;

        if (role !== 'admin' && role !== 'premium' && !isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const { is_active } = await request.json();

        if (is_active === undefined) {
            return NextResponse.json({ error: 'Missing is_active field' }, { status: 400 });
        }

        // Verify tournament exists and user has rights (creator, admin, or owner)
        const { rows } = await db.query('SELECT created_by FROM tournaments WHERE id = $1', [id]);
        const tournament = rows[0] as any;
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        if (!isOwner && role !== 'admin' && tournament.created_by !== (session.user as any).id) {
            return NextResponse.json({ error: 'You can only edit your own tournaments' }, { status: 403 });
        }

        await db.query('UPDATE tournaments SET is_active = $1 WHERE id = $2', [is_active ? true : false, id]);

        return NextResponse.json({ success: true, is_active: !!is_active });

    } catch (error) {
        console.error('Update tournament status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
