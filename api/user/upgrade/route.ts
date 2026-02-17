import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '@/lib/db';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { action } = await req.json();

        if (action === 'simulate_payment') {
            db.prepare('UPDATE users SET is_paid = 1 WHERE id = ?').run(session.user.id);
            return NextResponse.json({ success: true, isPaid: true });
        }

        if (action === 'upgrade_premium') {
            const user = db.prepare('SELECT is_paid FROM users WHERE id = ?').get(session.user.id) as { is_paid: number };

            if (!user || !user.is_paid) {
                return NextResponse.json({ error: 'Payment required' }, { status: 400 });
            }

            db.prepare("UPDATE users SET role = 'premium' WHERE id = ?").run(session.user.id);
            return NextResponse.json({ success: true, role: 'premium' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Upgrade error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
