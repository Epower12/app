import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - list drivers for a tournament
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId');
        if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 });

        const { rows } = await db.query(
            'SELECT * FROM race_drivers WHERE tournament_id = $1 ORDER BY number ASC NULLS LAST, driver_name ASC',
            [tournamentId]
        );
        return NextResponse.json(rows);
    } catch (err) {
        console.error('race-drivers GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - add a driver (tournament creator only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'admin' && session.user.role !== 'premium') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await ensureMigrations();

        const { tournamentId, driverName, teamName, number } = await request.json();
        if (!tournamentId || !driverName) return NextResponse.json({ error: 'tournamentId and driverName required' }, { status: 400 });

        // Verify caller created the tournament
        const { rows: tRows } = await db.query('SELECT id FROM tournaments WHERE id = $1 AND created_by = $2', [tournamentId, session.user.id]);
        if (!tRows[0]) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

        const id = uuidv4();
        await db.query(
            'INSERT INTO race_drivers (id, tournament_id, driver_name, team_name, number) VALUES ($1, $2, $3, $4, $5)',
            [id, tournamentId, driverName.trim(), teamName?.trim() || null, number ?? null]
        );

        const { rows } = await db.query('SELECT * FROM race_drivers WHERE id = $1', [id]);
        return NextResponse.json(rows[0], { status: 201 });
    } catch (err) {
        console.error('race-drivers POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - remove a driver
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('id');
        if (!driverId) return NextResponse.json({ error: 'id required' }, { status: 400 });

        // Verify caller owns the tournament this driver belongs to
        const { rows } = await db.query(`
            SELECT rd.id FROM race_drivers rd
            INNER JOIN tournaments t ON rd.tournament_id = t.id
            WHERE rd.id = $1 AND t.created_by = $2
        `, [driverId, session.user.id]);

        if (!rows[0]) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });

        await db.query('DELETE FROM race_drivers WHERE id = $1', [driverId]);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('race-drivers DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
