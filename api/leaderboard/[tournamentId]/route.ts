import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { calculatePoints, calculateRaceWeekendPoints, raceSessionMultiplier } from '@/lib/scoring';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { LeaderboardEntry } from '@/lib/types';
import { parseRaceBonusConfig } from '@/lib/types';

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

        const { rows: tournamentConfigRows } = await db.query('SELECT race_bonus_config FROM tournaments WHERE id = $1', [tournamentId]);
        const raceBonusConfig = parseRaceBonusConfig(tournamentConfigRows[0]?.race_bonus_config);

        // Pre-fetch all score/series predictions
        const { rows: allPredictions } = await db.query(`
            SELECT p.* FROM predictions p
            INNER JOIN matches m ON p.match_id = m.id
            WHERE m.tournament_id = $1
        `, [tournamentId]);

        const predMap = new Map<string, any>();
        allPredictions.forEach(p => predMap.set(`${p.user_id}-${p.match_id}`, p));

        // Pre-fetch all race weekend predictions
        const { rows: allRacePreds } = await db.query(`
            SELECT rwp.* FROM race_weekend_predictions rwp
            INNER JOIN matches m ON rwp.match_id = m.id
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
                    let breakdown: { label: string; points: number }[] = [];
                    const multiplier = raceSessionMultiplier(match.race_session, !!match.is_season_finale);

                    if (match.is_finished && match.top10_result) {
                        const result = calculateRaceWeekendPoints(
                            {
                                picks: rp.picks, polePick: rp.pole_pick, fastestLapPick: rp.fastest_lap_pick,
                                firstRetirementPick: rp.first_retirement_pick, safetyCarPick: rp.safety_car_pick,
                                positionsGainedPick: rp.positions_gained_pick, positionsLostPick: rp.positions_lost_pick,
                                winningMarginPick: rp.winning_margin_pick, retirementsPick: rp.retirements_pick,
                            },
                            {
                                top10Result: match.top10_result, poleResult: match.pole_result,
                                fastestLapResult: match.fastest_lap_result, firstRetirementResult: match.first_retirement_result,
                                safetyCarResult: match.safety_car_result, positionsGainedResult: match.positions_gained_result,
                                positionsLostResult: match.positions_lost_result, winningMarginResult: match.winning_margin_result,
                                retirementsResult: match.retirements_result,
                            },
                            match.race_session, multiplier, raceBonusConfig
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
                        raceWeekend: {
                            picks: rp.picks ?? [],
                            actual: match.top10_result ?? null,
                            pole: { pick: rp.pole_pick ?? null, actual: match.pole_result ?? null },
                            fastestLap: { pick: rp.fastest_lap_pick ?? null, actual: match.fastest_lap_result ?? null },
                            firstRetirement: { pick: rp.first_retirement_pick ?? null, actual: match.first_retirement_result ?? null },
                            safetyCar: { pick: rp.safety_car_pick ?? null, actual: match.safety_car_result ?? null },
                            positionsGained: { pick: rp.positions_gained_pick ?? null, actual: match.positions_gained_result ?? null },
                            positionsLost: { pick: rp.positions_lost_pick ?? null, actual: match.positions_lost_result ?? null },
                            winningMargin: { pick: rp.winning_margin_pick ?? null, actual: match.winning_margin_result ?? null },
                            retirements: { pick: rp.retirements_pick ?? null, actual: match.retirements_result ?? null },
                            multiplier,
                            breakdown,
                        },
                        points,
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
