import db from './db';
import { calculateRaceWeekendPoints, raceSessionMultiplier } from './scoring';
import { parseRaceBonusConfig } from './types';

/**
 * Send each league member a "you scored N points" notification for a match
 * whose result has just been entered (by the organiser or automatically).
 * `match` is the full matches row after the update. With `onlyIfPredicted`,
 * nothing is sent when nobody predicted the match (e.g. an old fixture
 * imported with its result already known).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a raw matches row
export async function notifyResult(match: any, { onlyIfPredicted = false } = {}) {
    const matchId = match.id;

    if (match.match_type === 'race') {
        // Notify based on race weekend predictions (Top 10 + bonus questions)
        const { rows: raceParticipants } = await db.query(`
            SELECT tp.user_id, rwp.picks, rwp.pole_pick, rwp.fastest_lap_pick, rwp.first_retirement_pick,
                   rwp.safety_car_pick, rwp.positions_gained_pick, rwp.positions_lost_pick,
                   rwp.winning_margin_pick, rwp.retirements_pick
            FROM tournament_participants tp
            LEFT JOIN race_weekend_predictions rwp ON rwp.match_id = $1 AND rwp.user_id = tp.user_id
            WHERE tp.tournament_id = $2
        `, [matchId, match.tournament_id]);
        if (onlyIfPredicted && !raceParticipants.some((p: { picks: unknown }) => p.picks)) return;

        const multiplier = raceSessionMultiplier(match.race_session, !!match.is_season_finale);
        const { rows: tRows } = await db.query('SELECT race_bonus_config FROM tournaments WHERE id = $1', [match.tournament_id]);
        const raceBonusConfig = parseRaceBonusConfig(tRows[0]?.race_bonus_config);

        for (const p of raceParticipants) {
            if (!p.picks || !match.top10_result) continue;
            const { total, breakdown } = calculateRaceWeekendPoints(
                {
                    picks: p.picks, polePick: p.pole_pick, fastestLapPick: p.fastest_lap_pick,
                    firstRetirementPick: p.first_retirement_pick, safetyCarPick: p.safety_car_pick,
                    positionsGainedPick: p.positions_gained_pick, positionsLostPick: p.positions_lost_pick,
                    winningMarginPick: p.winning_margin_pick, retirementsPick: p.retirements_pick,
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
            const sessionLabel = match.race_session ? ` (${match.race_session})` : '';
            const breakdownStr = breakdown.map(b => `${b.label} +${b.points}`).join(', ') || 'no points';
            const message = `${match.team_a}${sessionLabel} — ${breakdownStr} → +${total} pts`;
            await db.query(
                'INSERT INTO notifications (user_id, tournament_id, match_id, message, points_earned) VALUES ($1, $2, $3, $4, $5)',
                [p.user_id, match.tournament_id, matchId, message, total]
            );
        }
        return;
    }

    // Score/series notifications
    const { rows: participants } = await db.query(`
        SELECT tp.user_id, p.team_a_score AS pred_a, p.team_b_score AS pred_b
        FROM tournament_participants tp
        LEFT JOIN predictions p ON p.match_id = $1 AND p.user_id = tp.user_id
        WHERE tp.tournament_id = $2
    `, [matchId, match.tournament_id]);
    if (onlyIfPredicted && !participants.some((p: { pred_a: number | null; pred_b: number | null }) => p.pred_a !== null && p.pred_b !== null)) return;

    const actualA = match.team_a_score;
    const actualB = match.team_b_score;
    const scoreStr = `${actualA}–${actualB}`;

    for (const p of participants) {
        let pts: number | null = null;
        let emoji = '📋';
        let detail = 'No prediction';

        if (p.pred_a !== null && p.pred_b !== null) {
            const predW      = p.pred_a > p.pred_b ? 'A' : p.pred_a < p.pred_b ? 'B' : 'draw';
            const actualW    = actualA  > actualB  ? 'A' : actualA  < actualB  ? 'B' : 'draw';
            const exact      = p.pred_a === actualA && p.pred_b === actualB;
            const correctW   = predW === actualW;
            const correctGap = Math.abs(p.pred_a - p.pred_b) === Math.abs(actualA - actualB);

            if (exact)                     { pts = 5; emoji = '🎯'; detail = '+5 pts — exact!'; }
            else if (correctW && correctGap) { pts = 3; emoji = '↔️'; detail = '+3 pts — winner & margin'; }
            else if (correctW)              { pts = 2; emoji = '✅'; detail = '+2 pts — correct winner'; }
            else                            { pts = 0; emoji = '❌'; detail = '+0 pts — wrong'; }
        }

        const message = `${emoji} ${match.team_a} ${scoreStr} ${match.team_b} — ${detail}`;
        await db.query(
            'INSERT INTO notifications (user_id, tournament_id, match_id, message, points_earned) VALUES ($1, $2, $3, $4, $5)',
            [p.user_id, match.tournament_id, matchId, message, pts]
        );
    }
}
