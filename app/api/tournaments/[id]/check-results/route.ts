import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureMigrations } from '@/lib/migrations';
import { checkResultsForTournament } from '@/lib/fixtureSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/tournaments/:id/check-results
// The organiser's "Check for results now" button: refreshes the fixture sources
// this league imported matches from and fills in any finished results.
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureMigrations();

        const { id } = await params;
        const { rows } = await db.query('SELECT created_by FROM tournaments WHERE id = $1', [id]);
        if (!rows[0]) return NextResponse.json({ error: 'League not found' }, { status: 404 });
        if (rows[0].created_by !== (session.user as any).id) {
            return NextResponse.json({ error: 'Only the league creator can do this' }, { status: 403 });
        }

        const { results, applied } = await checkResultsForTournament(id);
        const failed = results.filter(r => r.error).map(r => r.name);
        return NextResponse.json({ ok: true, sourcesChecked: results.length, failed, ...applied });
    } catch (error: any) {
        console.error('Check results error:', error);
        return NextResponse.json({ error: 'Could not check for results. Please try again in a few minutes.' }, { status: 500 });
    }
}
