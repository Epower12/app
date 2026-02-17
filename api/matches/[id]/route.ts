import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// PATCH - Update match (admin only)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'admin' && session.user.role !== 'premium') {
            return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
        }

        const { id: matchId } = await params;
        const updates = await request.json();

        // Get match and verify ownership
        const match = db.prepare(`
      SELECT m.*, t.created_by 
      FROM matches m
      INNER JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `).get(matchId) as any;

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Relaxed authorization: any admin can update any match
        /* 
        if (match.created_by !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to update this match' }, { status: 403 });
        }
        */

        // Build update query
        const allowedFields = ['team_a', 'team_b', 'scheduled_time', 'team_a_score', 'team_b_score', 'is_finished', 'sport'];
        const updateFields: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                // SQLite (better-sqlite3) doesn't handle booleans well, convert to 0/1
                if (typeof value === 'boolean') {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value);
                }
            }
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        values.push(matchId);
        try {
            db.prepare(`UPDATE matches SET ${updateFields.join(', ')} WHERE id = ?`).run(...values);
        } catch (dbError: any) {
            console.error('Database update error detail:', dbError);
            return NextResponse.json({ error: `Database update failed: ${dbError.message}` }, { status: 500 });
        }

        const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);

        return NextResponse.json(updatedMatch);
    } catch (error: any) {
        console.error('Update match API error:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}

// DELETE - Delete match (admin only)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'admin' && session.user.role !== 'premium') {
            return NextResponse.json({ error: 'Forbidden: Premium or Admin only' }, { status: 403 });
        }

        const { id: matchId } = await params;

        // Get match and verify ownership
        const match = db.prepare(`
      SELECT m.*, t.created_by 
      FROM matches m
      INNER JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `).get(matchId) as any;

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        if (match.created_by !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to delete this match' }, { status: 403 });
        }

        db.prepare('DELETE FROM matches WHERE id = ?').run(matchId);

        return NextResponse.json({ message: 'Match deleted successfully' });
    } catch (error) {
        console.error('Delete match error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
