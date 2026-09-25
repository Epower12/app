import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

// GET - Returns all open (public) tournaments for the browse tab
// No auth required — open leagues are publicly visible
export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const { rows: tournaments } = await db.query(`
            SELECT t.id, t.name, t.join_code, t.created_at, t.sport, t.league_type, t.description, t.max_participants,
                (SELECT COUNT(*)::int FROM tournament_participants x WHERE x.tournament_id = t.id) AS member_count,
                (SELECT COUNT(*)::int FROM matches m
                    WHERE m.tournament_id = t.id AND NOT m.is_finished AND m.scheduled_time > $1) AS open_matches
            FROM tournaments t
            WHERE t.is_active = true AND t.league_type = 'open'
            ORDER BY t.created_at DESC
        `, [now]);
        return NextResponse.json(tournaments);
    } catch (error) {
        console.error('Open tournaments error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
