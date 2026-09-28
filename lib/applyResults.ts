import db from './db';
import { notifyResult } from './resultNotifications';
import { makeDriverMatcher, summariseF1Race, type F1ResultRow } from './results';
import { parseRaceBonusConfig } from './types';

export interface ApplySummary {
    /** Matches whose result was filled in automatically just now. */
    filled: number;
    /** Automatic results corrected after the source changed them (e.g. a post-race penalty). */
    corrected: number;
    /** Matches now carrying a note for the organiser. */
    flagged: number;
    /** Kick-off times moved to follow the competition's schedule. */
    rescheduled: number;
}

const OFFICIAL_PREFIX = 'Official result';

/**
 * Copy finished results from the synced fixture tables (api_matches, api_races)
 * onto the league matches imported from them. Rules:
 *  - a match with no result yet gets the official one and players are notified;
 *  - a result the organiser entered is never changed; if it differs from the
 *    official one the match gets a note so they can check it;
 *  - postponed/cancelled fixtures get a note, and a changed kick-off time is
 *    followed while the match hasn't started.
 * Pass a tournament id to limit the work to one league.
 */
export async function applyImportedResults(tournamentId?: string): Promise<ApplySummary> {
    const summary: ApplySummary = { filled: 0, corrected: 0, flagged: 0, rescheduled: 0 };
    await applyScores(summary, tournamentId);
    await applyRaces(summary, tournamentId);
    return summary;
}

async function setNote(matchId: string, current: string | null, note: string | null, summary: ApplySummary) {
    if (current === note) return;
    await db.query('UPDATE matches SET result_note = $1 WHERE id = $2', [note, matchId]);
    if (note) summary.flagged++;
}

async function applyScores(summary: ApplySummary, tournamentId?: string) {
    const now = Math.floor(Date.now() / 1000);
    const { rows } = await db.query(
        `SELECT m.id, m.is_finished, m.team_a_score, m.team_b_score, m.result_source, m.result_note,
                m.is_playoff, m.match_type, m.scheduled_time,
                am.status, am.home_score, am.away_score, am.match_time
         FROM matches m JOIN api_matches am ON am.id = m.api_match_id
         WHERE m.match_type <> 'race' AND ($1::uuid IS NULL OR m.tournament_id = $1)`,
        [tournamentId ?? null]
    );

    for (const r of rows) {
        const hasScore = r.home_score !== null && r.away_score !== null;

        if (r.status === 'finished' && hasScore) {
            const levelKnockout = r.home_score === r.away_score && (r.is_playoff || r.match_type === 'series');
            if (!r.is_finished) {
                if (levelKnockout) {
                    await setNote(r.id, r.result_note, `${OFFICIAL_PREFIX}: ${r.home_score}–${r.away_score}, but this knockout needs a winner. Please enter the result.`, summary);
                    continue;
                }
                const { rows: upd } = await db.query(
                    `UPDATE matches SET team_a_score = $1, team_b_score = $2, is_finished = true,
                            result_source = 'api', result_note = NULL
                     WHERE id = $3 AND is_finished = false RETURNING *`,
                    [r.home_score, r.away_score, r.id]
                );
                if (upd[0]) {
                    summary.filled++;
                    try { await notifyResult(upd[0], { onlyIfPredicted: true }); }
                    catch (err) { console.error('Automatic result notification failed:', err); }
                }
                continue;
            }

            const same = r.team_a_score === r.home_score && r.team_b_score === r.away_score;
            if (r.result_source === 'api') {
                if (!same && !levelKnockout) {
                    await db.query('UPDATE matches SET team_a_score = $1, team_b_score = $2 WHERE id = $3',
                        [r.home_score, r.away_score, r.id]);
                    summary.corrected++;
                }
            } else if (!same) {
                await setNote(r.id, r.result_note,
                    `${OFFICIAL_PREFIX}: ${r.home_score}–${r.away_score}. Your entry is ${r.team_a_score}–${r.team_b_score}; please check it.`, summary);
            } else if (r.result_note?.startsWith(OFFICIAL_PREFIX)) {
                await setNote(r.id, r.result_note, null, summary);
            }
            continue;
        }

        if (r.is_finished) continue;

        // Follow a moved kick-off while the match hasn't started (predictions stay open until the new time).
        if (r.match_time !== null && Number(r.match_time) !== Number(r.scheduled_time)
            && Number(r.scheduled_time) > now && Number(r.match_time) > now) {
            await db.query('UPDATE matches SET scheduled_time = $1 WHERE id = $2', [r.match_time, r.id]);
            summary.rescheduled++;
        }

        const note = r.status === 'postponed'
            ? 'Postponed by the competition. The new kick-off time will be picked up automatically once it is announced.'
            : r.status === 'cancelled'
                ? 'Cancelled by the competition. You can delete this match or enter a result yourself.'
                : null;
        if (note || r.result_note?.startsWith('Postponed') || r.result_note?.startsWith('Cancelled')) {
            await setNote(r.id, r.result_note, note, summary);
        }
    }
}

async function applyRaces(summary: ApplySummary, tournamentId?: string) {
    const { rows } = await db.query(
        `SELECT m.*, ar.result_rows, ar.pole_driver, t.race_bonus_config
         FROM matches m
         JOIN api_races ar ON ar.id = m.api_race_id
         JOIN tournaments t ON t.id = m.tournament_id
         WHERE m.match_type = 'race' AND m.race_session = 'race'
           AND ar.status = 'finished' AND ar.result_rows IS NOT NULL
           AND ($1::uuid IS NULL OR m.tournament_id = $1)`,
        [tournamentId ?? null]
    );

    const rosters = new Map<string, ReturnType<typeof makeDriverMatcher>>();
    for (const m of rows) {
        if (!rosters.has(m.tournament_id)) {
            const { rows: roster } = await db.query('SELECT driver_name FROM race_drivers WHERE tournament_id = $1', [m.tournament_id]);
            rosters.set(m.tournament_id, makeDriverMatcher(roster));
        }
        const match = rosters.get(m.tournament_id)!;
        const apiRows = m.result_rows as F1ResultRow[];
        const res = summariseF1Race(apiRows.map(r => ({ ...r, driverName: match(r.driverName) ?? r.driverName })));
        const pole = match(m.pole_driver);
        if (res.top10.length < 10) continue;

        const current: string[] = Array.isArray(m.top10_result) ? m.top10_result : [];
        const sameTop10 = current.length === res.top10.length && current.every((d, i) => d === res.top10[i]);

        if (m.is_finished && m.result_source !== 'api') {
            const note = sameTop10 ? null
                : `${OFFICIAL_PREFIX}: ${res.top10.slice(0, 3).join(', ')} on the podium. Your Top 10 differs; please check it.`;
            if (note || m.result_note?.startsWith(OFFICIAL_PREFIX)) await setNote(m.id, m.result_note, note, summary);
            continue;
        }
        if (m.is_finished && sameTop10) continue;

        // Safety car isn't in the data, so ask for it when the league scores it.
        const needsSafetyCar = parseRaceBonusConfig(m.race_bonus_config).safetyCar && m.safety_car_result === null;
        const note = needsSafetyCar
            ? 'Results came in automatically. Only the safety car answer is missing: open Enter results to add it.'
            : null;

        const { rows: upd } = await db.query(
            `UPDATE matches SET
                top10_result = $1::jsonb, p1_driver = $2, p2_driver = $3, p3_driver = $4,
                pole_result = COALESCE($5, pole_result),
                fastest_lap_result = COALESCE($6, fastest_lap_result),
                first_retirement_result = COALESCE($7, first_retirement_result),
                positions_gained_result = COALESCE($8, positions_gained_result),
                positions_lost_result = COALESCE($9, positions_lost_result),
                winning_margin_result = COALESCE($10, winning_margin_result),
                retirements_result = COALESCE($11, retirements_result),
                is_finished = true, result_source = 'api', result_note = $12
             WHERE id = $13 RETURNING *`,
            [JSON.stringify(res.top10), res.top10[0], res.top10[1], res.top10[2], pole, res.fastestLap,
             res.firstRetirement, res.positionsGained, res.positionsLost, res.winningMargin, res.retirements, note, m.id]
        );
        if (m.is_finished) { summary.corrected++; continue; }
        summary.filled++;
        if (note) summary.flagged++;
        try { await notifyResult(upd[0], { onlyIfPredicted: true }); }
        catch (err) { console.error('Automatic race notification failed:', err); }
    }
}
