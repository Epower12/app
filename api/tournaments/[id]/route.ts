import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../../../lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, sport } = await request.json();
        const { id: tournamentId } = await params;

        // Check ownership
        const tournament = db.prepare('SELECT created_by FROM tournaments WHERE id = ?').get(tournamentId) as { created_by: string } | undefined;

        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        if (tournament.created_by !== (session.user as any).id && (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (sport) {
            updates.push('sport = ?');
            values.push(sport);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        values.push(tournamentId);

        const updateTournament = db.transaction((updatesStr: string, vals: any[], sportName: string | undefined, tId: string) => {
            db.prepare(`UPDATE tournaments SET ${updatesStr} WHERE id = ?`).run(...vals);
            if (sportName) {
                db.prepare('UPDATE matches SET sport = ? WHERE tournament_id = ?').run(sportName, tId);
            }
        });

        updateTournament(updates.join(', '), values, sport, tournamentId);

        const updatedTournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
        return NextResponse.json(updatedTournament);
    } catch (error) {
        console.error('Update tournament error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
