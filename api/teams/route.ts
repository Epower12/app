import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const MAX_NAME_LENGTH = 100;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { rows } = await db.query(`
            SELECT t.*, tm.role AS my_role FROM teams t
            INNER JOIN team_members tm ON tm.team_id = t.id
            WHERE tm.user_id = $1
            ORDER BY t.created_at DESC
        `, [(session.user as any).id]);

        return NextResponse.json(rows);
    } catch (err) {
        console.error('teams GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { name, sportType, role } = await request.json();

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
        }
        if (name.trim().length > MAX_NAME_LENGTH) {
            return NextResponse.json({ error: `Team name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
        }
        if (role !== 'coach' && role !== 'manager') {
            return NextResponse.json({ error: "role must be 'coach' or 'manager'" }, { status: 400 });
        }

        const teamId = uuidv4();
        const userId = (session.user as any).id;

        await db.query(
            'INSERT INTO teams (id, name, sport_type, created_by) VALUES ($1, $2, $3, $4)',
            [teamId, name.trim(), sportType || 'hockey', userId]
        );

        await db.query(
            'INSERT INTO team_members (id, user_id, team_id, role) VALUES ($1, $2, $3, $4)',
            [uuidv4(), userId, teamId, role]
        );

        const { rows } = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        return NextResponse.json({ ...rows[0], my_role: role }, { status: 201 });
    } catch (err) {
        console.error('teams POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
