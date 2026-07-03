import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { calculatePoints, calculateRacePoints } from '@/lib/scoring';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { LeaderboardEntry } from '@/lib/types';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureMigrations();

        const { tournamentId } = await params;

        // Ensure participant
        const { rows: partRows } = await db.query(
            'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
            [tournamentId, session.user.id]
        );
        if (!partRows[0]) {
            const { rows: tRows } = await db.query('SELECT league_type FROM tournaments WHERE id = $1', [tournamentId]);
            if ((tRows[0] as any)?.league_type === 'open') {
                await db.query('INSERT INTO tournament_participants (id, tournament_id, user_id) VALUES ($1, $2, $3)', [uuidv4(), tournamentId, session.user.id]);
            } else {
                return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
            }
        }

        // Get all participants
        const { rows: participants } = await db.query(`
            SELECT u.id, u.username
            FROM users u
            INNER JOIN tournament_participants tp ON u.id = tp.user_id
            WHERE tp.tournament_id = $1
        `, [tournamentId]);

        // Get all matches
        const { rows: matches } = await db.query(`
            SELECT * FROM matches WHERE tournament_id = $1 ORDER BY scheduled_time ASC
        `, [tournamentId]);

        // Pre-fetch all score/series predictions
        const { rows: allPredictions } = await db.query(`
            SELECT p.* FROM predictions p
            INNER JOIN matches m ON p.match_id = m.id
            WHERE m.tournament_id = $1
        `, [tournamentId]);

        const predMap = new Map<string, any>();
        allPredictions.forEach(p => predMap.set(`${p.user_id}-${p.match_id}`, p));

        // Pre-fetch all race predictions
        const { rows: allRacePreds } = await db.query(`
            SELECT rp.* FROM race_predictions rp
            INNER JOIN matches m ON rp.match_id = m.id
            WHERE m.tournament_id = $1
        `, [tournamentId]);

        const racePredMap = new Map<string, any>();
        allRacePreds.forEach(rp => racePredMap.set(`${rp.user_id}-${rp.match_id}`, rp));

        // Build leaderboard
        const leaderboard: LeaderboardEntry[] = participants.map(participant => {
            let totalPoints = 0;
            const predictions: LeaderboardEntry['predictions'] = [];

            matches.forEach((match: any) => {
                const matchType = match.match_type || 'score';

                if (matchType === 'race') {
                    const rp = racePredMap.get(`${participant.id}-${match.id}`);
                    if (!rp) return;

                    let points = 0;
                    let breakdown = '';

                    if (match.is_finished && match.p1_driver) {
                        const result = calculateRacePoints(
                            { p1Driver: rp.p1_driver, p2Driver: rp.p2_driver, p3Driver: rp.p3_driver },
                            { p1Driver: match.p1_driver, p2Driver: match.p2_driver, p3Driver: match.p3_driver }
                        );
                        points = result.total;
                        breakdown = result.breakdown;
                        totalPoints += points;
                    }

                    predictions.push({
                        matchId: match.id,
                        teamA: match.team_a,
                        teamB: match.team_b,
                        matchType: 'race',
                        seriesFormat: null,
                        raceSession: match.race_session ?? null,
                        predictedP1: rp.p1_driver,
                        predictedP2: rp.p2_driver,
                        predictedP3: rp.p3_driver,
                        actualP1: match.p1_driver ?? null,
                        actualP2: match.p2_driver ?? null,
                        actualP3: match.p3_driver ?? null,
                        points,
                        pointsBreakdown: breakdown,
                    });
                } else {
                    const pred = predMap.get(`${participant.id}-${match.id}`);
                    if (!pred) return;

                    let points = 0;
                    if (match.is_finished && match.team_a_score !== null && match.team_b_score !== null) {
                        points = calculatePoints(
                            { teamAScore: pred.team_a_score, teamBScore: pred.team_b_score },
                            { teamAScore: match.team_a_score, teamBScore: match.team_b_score }
                        );
                        totalPoints += points;
                    }

                    predictions.push({
                        matchId: match.id,
                        teamA: match.team_a,
                        teamB: match.team_b,
                        matchType: matchType,
                        seriesFormat: match.series_format ?? null,
                        raceSession: null,
                        predictedScoreA: pred.team_a_score,
                        predictedScoreB: pred.team_b_score,
                        actualScoreA: match.team_a_score,
                        actualScoreB: match.team_b_score,
                        points,
                    });
                }
            });

            return { userId: participant.id, username: participant.username, totalPoints, predictions };
        });

        leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
        return NextResponse.json(leaderboard);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
