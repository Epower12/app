import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await ensureMigrations();

        const { rows } = await db.query('SELECT * FROM teams ORDER BY created_at DESC');
        return NextResponse.json(rows);
    } catch (err) {
        console.error('teams admin GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
