import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureMigrations } from '@/lib/migrations';

/**
 * Players report a match's final score; the organiser confirms it on the
 * Manage page (which enters the result as usual). Nothing is scored from a
 * suggestion on its own.
 *
 * POST   { team_a_score, team_b_score }  report or change your suggestion
 * DELETE                                   withdraw it
 */

async function loadMatch(matchId: string, userId: string) {
    const { rows } = await db.query(
        `SELECT m.id, m.tournament_id, m.team_a, m.team_b, m.scheduled_time, m.is_finished, m.match_type,
                t.created_by, t.name AS tournament_name,
                EXISTS (SELECT 1 FROM tournament_participants tp WHERE tp.tournament_id = m.tournament_id AND tp.user_id = $2) AS is_member
         FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = $1`,
        [matchId, userId]
    );
    return rows[0];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    await ensureMigrations();

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const match = await loadMatch(id, userId);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (!match.is_member) return NextResponse.json({ error: 'Join this league to report a score.' }, { status: 403 });
    if (match.match_type === 'race') return NextResponse.json({ error: 'Race results are entered by the organiser.' }, { status: 400 });
    if (match.is_finished) return NextResponse.json({ error: 'This match already has a result.' }, { status: 409 });
    if (Number(match.scheduled_time) > Date.now() / 1000) {
        return NextResponse.json({ error: "This match hasn't started yet." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const a = Number(body.team_a_score), b = Number(body.team_b_score);
    const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 99;
    if (!valid(a) || !valid(b)) return NextResponse.json({ error: 'Enter both scores as whole numbers.' }, { status: 400 });

    const { rows: before } = await db.query('SELECT COUNT(*)::int AS n FROM result_suggestions WHERE match_id = $1', [id]);
    await db.query(
        `INSERT INTO result_suggestions (match_id, user_id, team_a_score, team_b_score) VALUES ($1, $2, $3, $4)
         ON CONFLICT (match_id, user_id)
         DO UPDATE SET team_a_score = EXCLUDED.team_a_score, team_b_score = EXCLUDED.team_b_score,
                       created_at = EXTRACT(EPOCH FROM NOW())::BIGINT`,
        [id, userId, a, b]
    );

    // Tell the organiser once per match (the first report), not on every one.
    if (before[0].n === 0 && match.created_by !== userId) {
        await db.query(
            'INSERT INTO notifications (user_id, tournament_id, match_id, message) VALUES ($1, $2, $3, $4)',
            [match.created_by, match.tournament_id, id,
             `📝 ${session.user.name ?? 'A player'} says ${match.team_a} ${a}–${b} ${match.team_b} has finished. Confirm the result on the Manage page of ${match.tournament_name}.`]
        ).catch(err => console.error('Suggestion notification failed:', err));
    }

    return NextResponse.json({ ok: true, my_suggestion: { a, b } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    await ensureMigrations();
    const { id } = await params;
    await db.query('DELETE FROM result_suggestions WHERE match_id = $1 AND user_id = $2', [id, (session.user as { id: string }).id]);
    return NextResponse.json({ ok: true });
}
