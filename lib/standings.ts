import db from './db';
import { calculatePoints, calculateRaceWeekendPoints, raceSessionMultiplier, hasMatchStarted } from './scoring';
import type { LeaderboardEntry, LeaderboardStats } from './types';
import { parseRaceBonusConfig } from './types';

/**
 * The league table for one tournament, as seen by `viewerId`: every
 * participant's points, tier counts and shared-place rank. Used by the
 * rankings API and the profile page so both always show the same numbers.
 *
 * Other players' picks for matches that haven't started are left out, so
 * nobody can copy a rival's prediction.
 */
export async function computeStandings(tournamentId: string, viewerId: string): Promise<LeaderboardEntry[]> {
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

    const predMap = new Map<string, (typeof allPredictions)[number]>();
    allPredictions.forEach(p => predMap.set(`${p.user_id}-${p.match_id}`, p));

    // Pre-fetch all race weekend predictions
    const { rows: allRacePreds } = await db.query(`
        SELECT rwp.* FROM race_weekend_predictions rwp
        INNER JOIN matches m ON rwp.match_id = m.id
        WHERE m.tournament_id = $1
    `, [tournamentId]);

    const racePredMap = new Map<string, (typeof allRacePreds)[number]>();
    allRacePreds.forEach(rp => racePredMap.set(`${rp.user_id}-${rp.match_id}`, rp));

    const myId = viewerId;

    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = participants.map(participant => {
        let totalPoints = 0;
        const predictions: LeaderboardEntry['predictions'] = [];
        const stats: LeaderboardStats = { scored: 0, exact: 0, winnerAndMargin: 0, winner: 0, miss: 0 };

        matches.forEach(match => {
            // Fair play: other players' picks stay hidden until kick-off, so
            // nobody can copy a rival's prediction from the rankings page.
            if (participant.id !== myId && !hasMatchStarted(match.scheduled_time)) return;

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
                    stats.scored++;
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
                    stats.scored++;
                    if (points === 5) stats.exact++;
                    else if (points === 3) stats.winnerAndMargin++;
                    else if (points === 2) stats.winner++;
                    else stats.miss++;
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

        return { userId: participant.id, username: participant.username, totalPoints, rank: 0, stats, predictions };
    });

    // Order: points, then exact scores as the tie-breaker, then name for a stable list.
    // Players level on both points and exact scores share the same place.
    leaderboard.sort((a, b) =>
        b.totalPoints - a.totalPoints ||
        b.stats.exact - a.stats.exact ||
        a.username.localeCompare(b.username)
    );
    leaderboard.forEach((entry, i) => {
        const prev = leaderboard[i - 1];
        entry.rank = prev && prev.totalPoints === entry.totalPoints && prev.stats.exact === entry.stats.exact
            ? prev.rank
            : i + 1;
    });
    return leaderboard;
}
