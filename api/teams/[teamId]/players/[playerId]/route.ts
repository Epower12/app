import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { getAuthContext } from '@/lib/teamPlatform/getAuthContext';
import { canManageRoster } from '@/lib/teamPlatform/permissions';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId, playerId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canManageRoster(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { firstName, lastName, position, jerseyNumber, phone, duesMonthly } = await request.json();

        const { rows: existingRows } = await db.query(
            'SELECT * FROM players WHERE id = $1 AND team_id = $2',
            [playerId, teamId]
        );
        if (!existingRows[0]) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        // Note: COALESCE means a field can be updated to a new value but not
        // explicitly cleared to NULL. Acceptable for Phase 1's manual roster
        // entry — nobody needs to "unset" a jersey number yet.
        await db.query(
            `UPDATE players SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                position = COALESCE($3, position),
                jersey_number = COALESCE($4, jersey_number),
                phone = COALESCE($5, phone),
                dues_monthly = COALESCE($6, dues_monthly)
             WHERE id = $7`,
            [
                firstName?.trim() || null, lastName?.trim() || null, position ?? null,
                jerseyNumber ?? null, phone ?? null, duesMonthly ?? null, playerId,
            ]
        );

        const { rows } = await db.query('SELECT * FROM players WHERE id = $1', [playerId]);
        return NextResponse.json(rows[0]);
    } catch (err) {
        console.error('player PATCH error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId, playerId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canManageRoster(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { rowCount } = await db.query(
            'DELETE FROM players WHERE id = $1 AND team_id = $2',
            [playerId, teamId]
        );
        if (rowCount === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('player DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
