import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

function isOwner(session: any): boolean {
    return !!session?.user?.email && session.user.email === OWNER_EMAIL;
}

// POST /api/owner/migrate — run DB migrations (owner only)
export async function POST() {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // 1. api_leagues — one row per league+season synced from API-Sports
        await db.query(`
            CREATE TABLE IF NOT EXISTS api_leagues (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                sport TEXT NOT NULL DEFAULT 'Ice Hockey',
                external_id INTEGER NOT NULL,
                season INTEGER NOT NULL,
                country TEXT,
                logo_url TEXT,
                match_count INTEGER DEFAULT 0,
                synced_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
                UNIQUE(external_id, season)
            )
        `);

        // 2. api_matches — cached games from API-Sports
        await db.query(`
            CREATE TABLE IF NOT EXISTS api_matches (
                id SERIAL PRIMARY KEY,
                api_league_id INTEGER REFERENCES api_leagues(id) ON DELETE CASCADE,
                external_id BIGINT NOT NULL UNIQUE,
                home_team TEXT NOT NULL,
                away_team TEXT NOT NULL,
                match_time BIGINT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scheduled',
                home_score INTEGER,
                away_score INTEGER,
                synced_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
            )
        `);

        // 3. Extend matches table with source tracking
        await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`);
        await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_match_id INTEGER REFERENCES api_matches(id) ON DELETE SET NULL`);

        return NextResponse.json({ success: true, message: 'Migration complete' });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
