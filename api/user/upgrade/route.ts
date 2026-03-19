import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../../lib/db';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cast session user to include our custom types
    const userId = (session.user as any).id;

    try {
        const { action } = await req.json();

        if (action === 'simulate_payment') {
            await db.query('UPDATE users SET is_paid = true WHERE id = $1', [userId]);
            return NextResponse.json({ success: true, isPaid: true });
        }

        if (action === 'upgrade_premium') {
            const { rows } = await db.query('SELECT is_paid FROM users WHERE id = $1', [userId]);
            const user = rows[0] as { is_paid: boolean };

            if (!user || !user.is_paid) {
                return NextResponse.json({ error: 'Payment required' }, { status: 400 });
            }

            await db.query("UPDATE users SET role = 'premium' WHERE id = $1", [userId]);
            return NextResponse.json({ success: true, role: 'premium' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Upgrade error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
