import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureMigrations } from '@/lib/migrations';
import { removeDemoLeague, seedDemoLeague } from '@/lib/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // first run tracks two NHL seasons

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

async function ownerOnly() {
    const session = await getServerSession(authOptions);
    return !!session?.user?.email && session.user.email === OWNER_EMAIL;
}

// GET /api/owner/demo - is there a demo league, and how busy is it
export async function GET() {
    if (!(await ownerOnly())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await ensureMigrations();
    const { rows } = await db.query(`
        SELECT t.id, t.name,
               (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id)::int AS members,
               (SELECT COUNT(*) FROM tournament_participants tp JOIN users u ON u.id = tp.user_id
                 WHERE tp.tournament_id = t.id AND NOT u.is_demo)::int AS real_members,
               (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id)::int AS matches,
               (SELECT COUNT(*) FROM predictions p JOIN matches m ON m.id = p.match_id WHERE m.tournament_id = t.id)::int AS picks
        FROM tournaments t WHERE t.is_demo = true`);
    return NextResponse.json({ demo: rows[0] ?? null });
}

// POST /api/owner/demo  { action: 'seed' | 'remove' }
export async function POST(request: Request) {
    if (!(await ownerOnly())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await ensureMigrations();
    const { action } = await request.json().catch(() => ({}));
    try {
        if (action === 'seed') return NextResponse.json({ ok: true, ...(await seedDemoLeague()) });
        if (action === 'remove') return NextResponse.json({ ok: true, ...(await removeDemoLeague()) });
        return NextResponse.json({ error: 'action must be seed or remove' }, { status: 400 });
    } catch (err: unknown) {
        console.error('Demo league error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
