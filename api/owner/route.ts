import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../../lib/db';
import { authOptions } from '../auth/[...nextauth]/route';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

function isOwner(session: any): boolean {
    return !!session?.user?.email && session.user.email === OWNER_EMAIL;
}

// GET /api/owner - Full platform stats + all users + all tournaments
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') ?? 'stats';

    if (section === 'stats') {
        const { rows: uRows } = await db.query('SELECT COUNT(*) as c FROM users');
        const { rows: tRows } = await db.query('SELECT COUNT(*) as c FROM tournaments');
        const { rows: mRows } = await db.query('SELECT COUNT(*) as c FROM matches');
        const { rows: pRows } = await db.query('SELECT COUNT(*) as c FROM predictions');

        return NextResponse.json({
            users: Number(uRows[0].c),
            tournaments: Number(tRows[0].c),
            matches: Number(mRows[0].c),
            predictions: Number(pRows[0].c)
        });
    }

    if (section === 'users') {
        const { rows: users } = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
        return NextResponse.json(users);
    }

    if (section === 'tournaments') {
        const { rows: tournaments } = await db.query(`
            SELECT t.*, u.username as creator_name
            FROM tournaments t
            LEFT JOIN users u ON t.created_by = u.id
            ORDER BY t.created_at DESC
        `);
        return NextResponse.json(tournaments);
    }

    return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
}

// PATCH /api/owner - Update user role
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
        return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
    }

    const validRoles = ['user', 'premium', 'admin'];
    if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    try {
        await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update role error:', error);
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}

// DELETE /api/owner - Delete a tournament (owner can delete any)
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
        return NextResponse.json({ error: 'tournamentId required' }, { status: 400 });
    }

    await db.query('DELETE FROM tournaments WHERE id = $1', [tournamentId]);
    return NextResponse.json({ success: true });
}
