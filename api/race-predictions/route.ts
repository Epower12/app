import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { hasMatchStarted } from '@/lib/scoring';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - fetch race predictions for the current user (by tournamentId or matchId)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');
        const tournamentId = searchParams.get('tournamentId');

        if (matchId) {
            const { rows } = await db.query(
                'SELECT * FROM race_predictions WHERE match_id = $1 AND user_id = $2',
                [matchId, session.user.id]
            );
            return NextResponse.json(rows[0] || null);
        }

        if (tournamentId) {
            const { rows } = await db.query(`
                SELECT rp.* FROM race_predictions rp
                INNER JOIN matches m ON rp.match_id = m.id
                WHERE m.tournament_id = $1 AND rp.user_id = $2
            `, [tournamentId, session.user.id]);
            return NextResponse.json(rows);
        }

        return NextResponse.json({ error: 'matchId or tournamentId required' }, { status: 400 });
    } catch (err) {
        console.error('race-predictions GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - submit or update a race podium prediction
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { matchId, p1Driver, p2Driver, p3Driver } = await request.json();

        if (!matchId || !p1Driver || !p2Driver || !p3Driver) {
            return NextResponse.json({ error: 'matchId, p1Driver, p2Driver, p3Driver required' }, { status: 400 });
        }

        if (p1Driver === p2Driver || p1Driver === p3Driver || p2Driver === p3Driver) {
            return NextResponse.json({ error: 'Each position must have a different driver' }, { status: 400 });
        }

        const { rows: matchRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const match = matchRows[0] as any;
        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        if (match.match_type !== 'race') return NextResponse.json({ error: 'Not a race match' }, { status: 400 });
        if (hasMatchStarted(match.scheduled_time)) return NextResponse.json({ error: 'Cannot predict after match has started' }, { status: 400 });

        // Ensure participant
        const { rows: partRows } = await db.query(
            'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
            [match.tournament_id, session.user.id]
        );
        if (!partRows[0]) {
            const { rows: tRows } = await db.query('SELECT league_type FROM tournaments WHERE id = $1', [match.tournament_id]);
            if ((tRows[0] as any)?.league_type === 'open') {
                await db.query('INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ($1, $2, $3)', [uuidv4(), match.tournament_id, session.user.id]);
            } else {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
            }
        }

        const { rows: existing } = await db.query(
            'SELECT id FROM race_predictions WHERE match_id = $1 AND user_id = $2',
            [matchId, session.user.id]
        );

        const now = Math.floor(Date.now() / 1000);

        if (existing[0]) {
            await db.query(
                'UPDATE race_predictions SET p1_driver=$1, p2_driver=$2, p3_driver=$3, updated_at=$4 WHERE id=$5',
                [p1Driver, p2Driver, p3Driver, now, existing[0].id]
            );
            const { rows } = await db.query('SELECT * FROM race_predictions WHERE id = $1', [existing[0].id]);
            return NextResponse.json(rows[0]);
        } else {
            const id = uuidv4();
            await db.query(
                'INSERT INTO race_predictions (id, match_id, user_id, p1_driver, p2_driver, p3_driver, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)',
                [id, matchId, session.user.id, p1Driver, p2Driver, p3Driver, now]
            );
            const { rows } = await db.query('SELECT * FROM race_predictions WHERE id = $1', [id]);
            return NextResponse.json(rows[0], { status: 201 });
        }
    } catch (err) {
        console.error('race-predictions POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
