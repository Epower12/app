import db from './db';
import { calculatePoints } from './scoring';
import { computeStandings } from './standings';

/**
 * Calculate streak and accuracy for a user
 */
export async function getUserStats(userId: string) {
    let data;
    try {
        const { rows } = await db.query(`
            SELECT 
                p.team_a_score as pred_a,
                p.team_b_score as pred_b,
                m.team_a_score as actual_a,
                m.team_b_score as actual_b
            FROM predictions p
            JOIN matches m ON p.match_id = m.id
            WHERE p.user_id = $1 AND m.is_finished = true
            ORDER BY m.scheduled_time DESC
        `, [userId]);
        data = rows;
    } catch (e) {
        console.error('Error in getUserStats query:', e);
        throw e;
    }

    let currentStreak = 0;
    let correctPredictions = 0;
    let totalPredictions = data.length;
    let streakBroken = false;

    for (const row of data) {
        // Ensure values are numbers even if null in DB
        const points = calculatePoints(
            { teamAScore: Number(row.pred_a || 0), teamBScore: Number(row.pred_b || 0) },
            { teamAScore: Number(row.actual_a || 0), teamBScore: Number(row.actual_b || 0) }
        );

        const isCorrect = points > 0;

        if (isCorrect) {
            correctPredictions++;
            if (!streakBroken) {
                currentStreak++;
            }
        } else {
            streakBroken = true;
        }
    }

    const accuracy = totalPredictions > 0
        ? Math.round((correctPredictions / totalPredictions) * 100)
        : 0;

    return {
        currentStreak,
        accuracy,
        totalPredictions
    };
}

/**
 * Get total points per league for a user
 */
export async function getUserLeagues(userId: string) {
    const { rows: leagues } = await db.query(`
        SELECT 
            t.id,
            t.name,
            t.join_code,
            tp.joined_at
        FROM tournament_participants tp
        JOIN tournaments t ON tp.tournament_id = t.id
        WHERE tp.user_id = $1
    `, [userId]);

    // Same numbers as the league table (score, series and race points, real
    // shared-place ranks). The old version hard-coded rank 1 and ignored races.
    const leaguesWithStats = await Promise.all(leagues.map(async (league) => {
        const standings = await computeStandings(league.id, userId);
        const me = standings.find(e => e.userId === userId);
        return {
            ...league,
            totalPoints: me?.totalPoints ?? 0,
            participantCount: standings.length,
            rank: me?.rank ?? standings.length,
        };
    }));

    return leaguesWithStats;
}
