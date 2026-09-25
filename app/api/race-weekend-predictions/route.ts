import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { hasMatchStarted } from '@/lib/scoring';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - fetch race weekend predictions for the current user (by matchId or tournamentId)
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
                'SELECT * FROM race_weekend_predictions WHERE match_id = $1 AND user_id = $2',
                [matchId, session.user.id]
            );
            return NextResponse.json(rows[0] || null);
        }

        if (tournamentId) {
            const { rows } = await db.query(`
                SELECT rwp.* FROM race_weekend_predictions rwp
                INNER JOIN matches m ON rwp.match_id = m.id
                WHERE m.tournament_id = $1 AND rwp.user_id = $2
            `, [tournamentId, session.user.id]);
            return NextResponse.json(rows);
        }

        return NextResponse.json({ error: 'matchId or tournamentId required' }, { status: 400 });
    } catch (err) {
        console.error('race-weekend-predictions GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - submit or update a race weekend prediction
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const body = await request.json();
        const {
            matchId, picks,
            polePick, fastestLapPick, firstRetirementPick, safetyCarPick,
            positionsGainedPick, positionsLostPick, winningMarginPick, retirementsPick,
        } = body;

        if (!matchId || !Array.isArray(picks)) {
            return NextResponse.json({ error: 'matchId and picks[] required' }, { status: 400 });
        }
        const cleanPicks = picks.filter((p: unknown) => typeof p === 'string' && p.trim()).slice(0, 10);
        if (cleanPicks.length < 3) {
            return NextResponse.json({ error: 'Pick at least a podium (3 drivers)' }, { status: 400 });
        }
        if (new Set(cleanPicks).size !== cleanPicks.length) {
            return NextResponse.json({ error: 'Each slot must have a different driver' }, { status: 400 });
        }

        const { rows: matchRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const match = matchRows[0] as any;
        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        if (match.match_type !== 'race') return NextResponse.json({ error: 'Not a race match' }, { status: 400 });
        if (hasMatchStarted(match.scheduled_time)) return NextResponse.json({ error: 'Cannot predict after the session has started' }, { status: 400 });

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

        const safetyCarValue = safetyCarPick === 'yes' ? true : safetyCarPick === 'no' ? false : null;
        const picksJson = JSON.stringify(cleanPicks);

        const { rows: existing } = await db.query(
            'SELECT id FROM race_weekend_predictions WHERE match_id = $1 AND user_id = $2',
            [matchId, session.user.id]
        );

        const now = Math.floor(Date.now() / 1000);
        const fields = [
            picksJson, polePick || null, fastestLapPick || null, firstRetirementPick || null, safetyCarValue,
            positionsGainedPick || null, positionsLostPick || null, winningMarginPick || null, retirementsPick || null,
        ];

        if (existing[0]) {
            await db.query(
                `UPDATE race_weekend_predictions SET
                    picks=$1, pole_pick=$2, fastest_lap_pick=$3, first_retirement_pick=$4, safety_car_pick=$5,
                    positions_gained_pick=$6, positions_lost_pick=$7, winning_margin_pick=$8, retirements_pick=$9,
                    updated_at=$10
                 WHERE id=$11`,
                [...fields, now, existing[0].id]
            );
            const { rows } = await db.query('SELECT * FROM race_weekend_predictions WHERE id = $1', [existing[0].id]);
            return NextResponse.json(rows[0]);
        } else {
            const id = uuidv4();
            await db.query(
                `INSERT INTO race_weekend_predictions
                    (id, match_id, user_id, picks, pole_pick, fastest_lap_pick, first_retirement_pick, safety_car_pick,
                     positions_gained_pick, positions_lost_pick, winning_margin_pick, retirements_pick, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)`,
                [id, matchId, session.user.id, ...fields, now]
            );
            const { rows } = await db.query('SELECT * FROM race_weekend_predictions WHERE id = $1', [id]);
            return NextResponse.json(rows[0], { status: 201 });
        }
    } catch (err) {
        console.error('race-weekend-predictions POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
