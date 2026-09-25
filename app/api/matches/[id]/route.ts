import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureMigrations } from '@/lib/migrations';
import { notifyResult } from '@/lib/resultNotifications';

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
            'top10_result', 'pole_result', 'fastest_lap_result', 'first_retirement_result', 'safety_car_result',
            'positions_gained_result', 'positions_lost_result', 'winning_margin_result', 'retirements_result',
            'is_season_finale',
        ];
        const jsonbFields = new Set(['top10_result']);

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex++}`);
                values.push(jsonbFields.has(key) && Array.isArray(value) ? JSON.stringify(value) : value);
            }
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        // Anything the organiser enters about the result is theirs: automatic
        // results never overwrite it, and any note about it is now handled.
        const resultFields = allowedFields.filter(f => f.endsWith('_score') || f.endsWith('_result') || f === 'is_finished');
        if (Object.keys(updates).some(k => resultFields.includes(k))) {
            updateFields.push(`result_source = 'manual'`, 'result_note = NULL');
        }

        values.push(matchId);
        await db.query(`UPDATE matches SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`, values);

        const { rows: updatedRows } = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const updated = updatedRows[0] as any;

        // Fire notifications when result is entered
        if (updates.is_finished === true) {
            try {
                await notifyResult(updated);
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
