import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Auto-create notifications table if not exists
async function ensureTable() {
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
}

// GET /api/notifications — fetch unread (+ last 20 read) for current user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    const { rows } = await db.query(`
        SELECT id, tournament_id, match_id, message, points_earned, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 30
    `, [session.user.id]);

    const unreadCount = rows.filter((r: any) => !r.is_read).length;

    return NextResponse.json({ notifications: rows, unreadCount });
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [session.user.id]
    );

    return NextResponse.json({ ok: true });
}
