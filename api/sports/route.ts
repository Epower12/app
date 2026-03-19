import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
    try {
        const { rows: sports } = await db.query('SELECT * FROM sports ORDER BY name ASC');
        return NextResponse.json(sports);
    } catch (error) {
        console.error('Get sports error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || ((session.user as any).role !== 'admin' && (session.user as any).role !== 'premium')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'Sport name is required' }, { status: 400 });
        }

        // Check if exists
        const { rows } = await db.query('SELECT id FROM sports WHERE LOWER(name) = LOWER($1)', [name]);
        const existing = rows[0];

        if (existing) {
            return NextResponse.json(existing);
        }

        const id = uuidv4();
        await db.query('INSERT INTO sports (id, name) VALUES ($1, $2)', [id, name]);

        return NextResponse.json({ id, name }, { status: 201 });
    } catch (error) {
        console.error('Create sport error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
