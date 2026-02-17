import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

        // Verify user is participant
        const participant = db
            .prepare('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?')
            .get(tournamentId, session.user.id);

        if (!participant) {
            return NextResponse.json({ error: 'Not a participant of this tournament' }, { status: 403 });
        }

        // Get all participants
        const participants = db
            .prepare(`
        SELECT u.id, u.username
        FROM users u
        INNER JOIN tournament_participants tp ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
      `)
            .all(tournamentId) as any[];

        // Get all finished matches with predictions
        const matches = db
            .prepare(`
        SELECT m.id, m.team_a, m.team_b, m.team_a_score, m.team_b_score, m.is_finished
        FROM matches m
        WHERE m.tournament_id = ?
        ORDER BY m.scheduled_time ASC
      `)
            .all(tournamentId) as any[];

        // Build leaderboard
        const leaderboard: LeaderboardEntry[] = participants.map(participant => {
            let totalPoints = 0;
            const predictions: LeaderboardEntry['predictions'] = [];

            matches.forEach(match => {
                const prediction = db
                    .prepare('SELECT * FROM predictions WHERE match_id = ? AND user_id = ?')
                    .get(match.id, participant.id) as any;

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
