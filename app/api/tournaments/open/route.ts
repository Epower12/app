import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

// GET - Returns all open (public) tournaments for the browse tab
// No auth required — open leagues are publicly visible
export async function GET() {
    try {
        const { rows: tournaments } = await db.query(`
            SELECT id, name, join_code, created_at, sport, league_type, description, max_participants
            FROM tournaments
            WHERE is_active = true AND league_type = 'open'
            ORDER BY created_at DESC
        `);
        return NextResponse.json(tournaments);
    } catch (error) {
        console.error('Open tournaments error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
