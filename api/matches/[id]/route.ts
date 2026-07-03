import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureMigrations } from '@/lib/migrations';
import { calculateRacePoints } from '@/lib/scoring';

// PATCH - Update match (tournament creator only)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureMigrations();

        const { id: matchId } = await params;
        const updates = await request.json();

        const { rows: matchRows } = await db.query(`
            SELECT m.*, t.created_by
            FROM matches m
            INNER JOIN tournaments t ON m.tournament_id = t.id
            WHERE m.id = $1
        `, [matchId]);
        const match = matchRows[0] as any;

        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        if (match.created_by !== (session.user as any).id) {
            return NextResponse.json({ error: 'Only the league creator can edit matches' }, { status: 403 });
        }

        const allowedFields = [
            'team_a', 'team_b', 'scheduled_time', 'team_a_score', 'team_b_score',
            'is_finished', 'sport', 'is_playoff',
            'match_type', 'series_format', 'race_session',
            'p1_driver', 'p2_driver', 'p3_driver',
        ];

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex++}`);
                values.push(value);
            }
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        values.push(matchId);
        await db.query(`UPDATE matches SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`, values);

        const { rows: updatedRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const updated = updatedRows[0] as any;

        // Fire notifications when result is entered
        const scoringNow = updates.is_finished === true;
        if (scoringNow) {
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS notifications (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL,
                        tournament_id UUID,
                        match_id UUID,
                        message TEXT NOT NULL,
                        points_earned INTEGER,
                        is_read BOOLEAN DEFAULT false,
                        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
                    );
                    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
                `);

                if (updated.match_type === 'race') {
                    // Notify based on race predictions
                    const { rows: raceParticipants } = await db.query(`
                        SELECT tp.user_id, rp.p1_driver, rp.p2_driver, rp.p3_driver
                        FROM tournament_participants tp
                        LEFT JOIN race_predictions rp ON rp.match_id = $1 AND rp.user_id = tp.user_id
                        WHERE tp.tournament_id = $2
                    `, [matchId, updated.tournament_id]);

                    for (const p of raceParticipants) {
                        if (!p.p1_driver || !updated.p1_driver) continue;
                        const { total, breakdown } = calculateRacePoints(
                            { p1Driver: p.p1_driver, p2Driver: p.p2_driver, p3Driver: p.p3_driver },
                            { p1Driver: updated.p1_driver, p2Driver: updated.p2_driver, p3Driver: updated.p3_driver }
                        );
                        const sessionLabel = updated.race_session ? ` (${updated.race_session})` : '';
                        const message = `🏎️ ${updated.team_a}${sessionLabel} — ${breakdown} → +${total} pts`;
                        await db.query(
                            'INSERT INTO notifications (user_id, tournament_id, match_id, message, points_earned) VALUES ($1, $2, $3, $4, $5)',
                            [p.user_id, updated.tournament_id, matchId, message, total]
                        );
                    }
                } else {
                    // Score/series notifications
                    const { rows: participants } = await db.query(`
                        SELECT tp.user_id, p.team_a_score AS pred_a, p.team_b_score AS pred_b
                        FROM tournament_participants tp
                        LEFT JOIN predictions p ON p.match_id = $1 AND p.user_id = tp.user_id
                        WHERE tp.tournament_id = $2
                    `, [matchId, updated.tournament_id]);

                    const actualA = updated.team_a_score;
                    const actualB = updated.team_b_score;
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

                        const message = `${emoji} ${updated.team_a} ${scoreStr} ${updated.team_b} — ${detail}`;
                        await db.query(
                            'INSERT INTO notifications (user_id, tournament_id, match_id, message, points_earned) VALUES ($1, $2, $3, $4, $5)',
                            [p.user_id, updated.tournament_id, matchId, message, pts]
                        );
                    }
                }
            } catch (notifErr) {
                console.error('Notification creation error:', notifErr);
            }
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update match API error:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}

// DELETE - Delete match (tournament creator only)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: matchId } = await params;

        const { rows: matchRows } = await db.query(`
            SELECT m.*, t.created_by
            FROM matches m
            INNER JOIN tournaments t ON m.tournament_id = t.id
            WHERE m.id = $1
        `, [matchId]);
        const match = matchRows[0] as any;

        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        if (match.created_by !== (session.user as any).id) {
            return NextResponse.json({ error: 'Only the league creator can delete matches' }, { status: 403 });
        }

        await db.query('DELETE FROM matches WHERE id = $1', [matchId]);
        return NextResponse.json({ message: 'Match deleted successfully' });
    } catch (error) {
        console.error('Delete match error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
