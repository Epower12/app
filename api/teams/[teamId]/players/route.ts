import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { getAuthContext } from '@/lib/teamPlatform/getAuthContext';
import { canViewTeam, canManageRoster } from '@/lib/teamPlatform/permissions';
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
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canViewTeam(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { rows } = await db.query(
            'SELECT * FROM players WHERE team_id = $1 ORDER BY jersey_number NULLS LAST, last_name ASC',
            [teamId]
        );
        return NextResponse.json(rows);
    } catch (err) {
        console.error('players GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canManageRoster(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { firstName, lastName, position, jerseyNumber, phone, duesMonthly } = await request.json();

        if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
            return NextResponse.json({ error: 'firstName is required' }, { status: 400 });
        }
        if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
            return NextResponse.json({ error: 'lastName is required' }, { status: 400 });
        }

        const playerId = uuidv4();
        await db.query(
            `INSERT INTO players (id, team_id, first_name, last_name, position, jersey_number, phone, dues_monthly)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                playerId, teamId, firstName.trim(), lastName.trim(),
                position || null, jerseyNumber ?? null, phone || null, duesMonthly ?? 0,
            ]
        );

        const { rows } = await db.query('SELECT * FROM players WHERE id = $1', [playerId]);
        return NextResponse.json(rows[0], { status: 201 });
    } catch (err) {
        console.error('players POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
