import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { calculatePoints } from '@/lib/scoring';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LeaderboardEntry } from '@/lib/types';

// GET - Get leaderboard for tournament
export async function GET(
    request: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tournamentId } = await params;

        // Verify user is participant or auto-join if open
        const { rows: participantRows } = await db.query('SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2', [tournamentId, session.user.id]);
        const participant = participantRows[0];

        if (!participant) {
            // Check if tournament is open
            const { rows: tournamentRows } = await db.query('SELECT league_type FROM tournaments WHERE id = $1', [tournamentId]);
            const tournament = tournamentRows[0] as any;

            if (tournament?.league_type === 'open') {
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

        // Get all finished matches with predictions
        const { rows: matches } = await db.query(`
            SELECT m.id, m.team_a, m.team_b, m.team_a_score, m.team_b_score, m.is_finished
            FROM matches m
            WHERE m.tournament_id = $1
            ORDER BY m.scheduled_time ASC
        `, [tournamentId]);

        // Pre-fetch all predictions for this tournament for all users to avoid N+1 queries
        // This is much more efficient than querying in a loop
        const { rows: allPredictions } = await db.query(`
            SELECT p.* 
            FROM predictions p
            INNER JOIN matches m ON p.match_id = m.id
            WHERE m.tournament_id = $1
        `, [tournamentId]);

        // Group predictions by user and match
        const predictionMap = new Map();
        allPredictions.forEach(p => {
            predictionMap.set(`${p.user_id}-${p.match_id}`, p);
        });

        // Build leaderboard
        const leaderboard: LeaderboardEntry[] = participants.map(participant => {
            let totalPoints = 0;
            const predictions: LeaderboardEntry['predictions'] = [];

            matches.forEach(match => {
                const prediction = predictionMap.get(`${participant.id}-${match.id}`);

                if (prediction) {
                    let points = 0;
                    if (match.is_finished && match.team_a_score !== null && match.team_b_score !== null) {
                        points = calculatePoints(
                            { teamAScore: prediction.team_a_score, teamBScore: prediction.team_b_score },
                            { teamAScore: match.team_a_score, teamBScore: match.team_b_score }
                        );
                        totalPoints += points;
                    }

                    predictions.push({
                        matchId: match.id,
                        teamA: match.team_a,
                        teamB: match.team_b,
                        predictedScoreA: prediction.team_a_score,
                        predictedScoreB: prediction.team_b_score,
                        actualScoreA: match.team_a_score,
                        actualScoreB: match.team_b_score,
                        points,
                    });
                }
            });

            return {
                userId: participant.id,
                username: participant.username,
                totalPoints,
                predictions,
            };
        });

        // Sort by total points descending
        leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

        return NextResponse.json(leaderboard);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
