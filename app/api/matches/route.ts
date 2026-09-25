import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureLogosForTeams, getLogosForTeams, nameKey } from '@/lib/teamLogos';
import { defaultMatchType, defaultSeriesFormat } from '@/lib/types';

// GET - List matches for a tournament
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId');

        if (!tournamentId) {
            return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
        }

        const { rows: participantRows } = await db.query(
            'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
            [tournamentId, session.user.id]
        );
        if (!participantRows[0]) {
            return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
        }

        await ensureMigrations();

        const { rows: matches } = await db.query(
            'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY scheduled_time ASC',
            [tournamentId]
        );

        // Decorate with team logos (only for non-race matches)
        const scoreMatches = matches.filter((m: any) => m.match_type !== 'race');
        const allTeamNames = scoreMatches.flatMap((m: any) => [m.team_a, m.team_b]);
        const logos = await getLogosForTeams(allTeamNames);
        const decorated = matches.map((m: any) => ({
            ...m,
            team_a_logo: m.match_type !== 'race' ? (logos.get(nameKey(m.team_a)) ?? null) : null,
            team_b_logo: m.match_type !== 'race' ? (logos.get(nameKey(m.team_b)) ?? null) : null,
        }));

        ensureLogosForTeams(allTeamNames);

        return NextResponse.json(decorated);
    } catch (error) {
        console.error('Get matches error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new match (admin/premium only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'admin' && session.user.role !== 'premium') {
            return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
        }

        await ensureMigrations();

        const { tournamentId, teamA, teamB, scheduledTime, sport, isPlayoff, matchType, seriesFormat, raceSession } = await request.json();

        if (!tournamentId || !teamA || !teamB || !scheduledTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { rows: tournamentRows } = await db.query(
            'SELECT * FROM tournaments WHERE id = $1 AND created_by = $2',
            [tournamentId, session.user.id]
        );
        const tournament = tournamentRows[0] as any;

        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found or not authorized' }, { status: 404 });
        }

        const resolvedSport = sport || tournament.sport || 'Football';
        const resolvedMatchType = matchType || defaultMatchType(resolvedSport);
        const resolvedSeriesFormat = seriesFormat || defaultSeriesFormat(resolvedSport) || null;
        const resolvedRaceSession = raceSession || null;

        const matchId = uuidv4();
        await db.query(
            `INSERT INTO matches (id, tournament_id, team_a, team_b, scheduled_time, sport, is_playoff, match_type, series_format, race_session)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [matchId, tournamentId, teamA, teamB, scheduledTime, resolvedSport, isPlayoff ?? false, resolvedMatchType, resolvedSeriesFormat, resolvedRaceSession]
        );

        const { rows: newMatchRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const match = newMatchRows[0];

        if (resolvedMatchType !== 'race') ensureLogosForTeams([teamA, teamB]);

        return NextResponse.json(match, { status: 201 });
    } catch (error) {
        console.error('Create match error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
