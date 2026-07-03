import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPreset, listPresets } from '@/lib/presets';
import { ensureLogosForTeams } from '@/lib/teamLogos';

// GET /api/matches/bulk
//   - no params       → returns the registry of available presets (id, name, sport, etc.)
//   - ?preset=<id>    → returns the full preset (metadata + matches array)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('preset');

    if (!presetId) {
        // Browse mode: return the registry
        return NextResponse.json({ presets: listPresets() });
    }

    const preset = getPreset(presetId);
    if (!preset) {
        return NextResponse.json({ error: 'Unknown preset' }, { status: 404 });
    }
    return NextResponse.json({ preset: presetId, ...preset });
}

// POST /api/matches/bulk
// Body: { tournamentId: string, preset?: string, selectedIndices?: number[], matches?: PresetMatch[] }
//   - If `selectedIndices` is provided alongside `preset`, only those indices are inserted.
//   - Otherwise the entire preset (or the supplied `matches` array) is inserted.
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'admin' && user.role !== 'premium') {
        return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
    }

    const { tournamentId, preset: presetId, matches: customMatches, selectedIndices } = await request.json();

    if (!tournamentId) {
        return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
    }

    // Verify tournament belongs to this user
    const { rows: tRows } = await db.query(
        'SELECT * FROM tournaments WHERE id = $1 AND created_by = $2',
        [tournamentId, session.user.id]
    );
    if (!tRows.length) {
        return NextResponse.json({ error: 'Tournament not found or not authorized' }, { status: 404 });
    }

    // Resolve match list — either from a registered preset or a custom array
    let matches: any[] | undefined;
    if (presetId) {
        const preset = getPreset(presetId);
        if (!preset) {
            return NextResponse.json({ error: 'Unknown preset' }, { status: 404 });
        }
        matches = preset.matches;
    } else if (customMatches) {
        matches = customMatches;
    }

    // If a selection was provided, narrow to just the chosen rows
    if (matches && Array.isArray(selectedIndices) && selectedIndices.length > 0) {
        matches = selectedIndices
            .map((i: number) => matches![i])
            .filter(Boolean);
    }

    if (!matches?.length) {
        return NextResponse.json({ error: 'No matches to import' }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;
    const teamNames: string[] = [];

    for (const m of matches) {
        // Skip duplicates (same teams + same time in this tournament)
        const { rows: existing } = await db.query(
            'SELECT id FROM matches WHERE tournament_id = $1 AND team_a = $2 AND team_b = $3 AND scheduled_time = $4',
            [tournamentId, m.teamA, m.teamB, m.scheduledTime]
        );
        if (existing.length) { skipped++; continue; }

        await db.query(
            `INSERT INTO matches (id, tournament_id, team_a, team_b, scheduled_time, sport, source)
             VALUES ($1, $2, $3, $4, $5, $6, 'manual')`,
            [uuidv4(), tournamentId, m.teamA, m.teamB, m.scheduledTime, m.sport]
        );
        teamNames.push(m.teamA, m.teamB);
        inserted++;
    }

    // Background fetch logos for any new team names
    ensureLogosForTeams(teamNames);

    return NextResponse.json({ success: true, inserted, skipped });
}
