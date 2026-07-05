import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { getAuthContext } from '@/lib/teamPlatform/getAuthContext';
import { canViewTeam, canDeleteTeam } from '@/lib/teamPlatform/permissions';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;

        const { rows } = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        const team = rows[0];
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        const ctx = await getAuthContext(userId, userRole, teamId);
        if (!canViewTeam(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        return NextResponse.json({ ...team, my_role: ctx.membership?.role ?? null });
    } catch (err) {
        console.error('team GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;

        const ctx = await getAuthContext(userId, userRole, teamId);
        if (!canDeleteTeam(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { rowCount } = await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
        if (rowCount === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('team DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
