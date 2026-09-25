import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../../../../lib/db';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { calculatePoints } from '../../../../../lib/scoring';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;

        const { rows: history } = await db.query(`
            SELECT 
                p.id,
                -- Aliases must be quoted: Postgres lowercases unquoted ones
                -- (predA -> preda), which left every history row blank.
                p.team_a_score AS "predA",
                p.team_b_score AS "predB",
                p.created_at AS "createdAt",
                m.team_a AS "teamA",
                m.team_b AS "teamB",
                m.team_a_score AS "actualA",
                m.team_b_score AS "actualB",
                m.is_finished AS "isFinished",
                m.scheduled_time AS "scheduledTime",
                m.sport AS "sport",
                t.name AS "tournamentName"
            FROM predictions p
            JOIN matches m ON p.match_id = m.id
            JOIN tournaments t ON m.tournament_id = t.id
            WHERE p.user_id = $1
            ORDER BY m.scheduled_time DESC
            LIMIT 50
        `, [userId]);

        const formattedHistory = history.map(item => {
            const points = item.isFinished
                ? calculatePoints(
                    { teamAScore: Number(item.predA || 0), teamBScore: Number(item.predB || 0) },
                    { teamAScore: Number(item.actualA || 0), teamBScore: Number(item.actualB || 0) }
                )
                : null;

            return {
                ...item,
                points
            };
        });

        return NextResponse.json(formattedHistory || []);
    } catch (error) {
        console.error('Profile history error:', error);
        return NextResponse.json([], { status: 200 }); // Return empty array instead of erroring
    }
}
