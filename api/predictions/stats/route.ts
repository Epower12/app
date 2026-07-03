import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/predictions/stats?matchId=X
// Premium/Admin only — returns community prediction breakdown for a match
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role !== 'premium' && user.role !== 'admin') {
        return NextResponse.json({ error: 'Premium feature' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

    // Get the match to know the teams
    const { rows: matchRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (!matchRows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = matchRows[0] as any;

    // Get all predictions for this match
    const { rows: preds } = await db.query(
        'SELECT team_a_score, team_b_score FROM predictions WHERE match_id = $1',
        [matchId]
    );

    const total = preds.length;
    if (total === 0) {
        return NextResponse.json({ total: 0, homeWin: 0, draw: 0, awayWin: 0, topPredictions: [] });
    }

    let homeWin = 0, draw = 0, awayWin = 0;
    const scoreMap: Record<string, number> = {};

    for (const p of preds) {
        const a = p.team_a_score;
        const b = p.team_b_score;
        if (a > b) homeWin++;
        else if (a === b) draw++;
        else awayWin++;

        const key = `${a}-${b}`;
        scoreMap[key] = (scoreMap[key] || 0) + 1;
    }

    // Top 5 most predicted scores
    const topPredictions = Object.entries(scoreMap)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([score, count]) => ({
            score,
            count,
            pct: Math.round((count / total) * 100),
        }));

    return NextResponse.json({
        total,
        homeWin: Math.round((homeWin / total) * 100),
        draw: Math.round((draw / total) * 100),
        awayWin: Math.round((awayWin / total) * 100),
        teamA: match.team_a,
        teamB: match.team_b,
        topPredictions,
    });
}
