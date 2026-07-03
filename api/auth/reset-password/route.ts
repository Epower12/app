import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// GET — validate token (used by the reset page on load)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawToken = searchParams.get('token');
        if (!rawToken) return NextResponse.json({ valid: false });

        // Hash the incoming token before comparing against stored hash
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const now = Math.floor(Date.now() / 1000);

        const { rows } = await db.query(
            'SELECT id FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > $2',
            [tokenHash, now]
        );

        return NextResponse.json({ valid: rows.length > 0 });
    } catch {
        return NextResponse.json({ valid: false });
    }
}

// POST — apply the new password
export async function POST(request: Request) {
    // Rate limit: 10 attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = rateLimit(`reset-pw:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many attempts. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
        );
    }

    try {
        const { token: rawToken, password } = await request.json();

        if (!rawToken || !password) {
            return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Hash the incoming raw token before DB lookup
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const now = Math.floor(Date.now() / 1000);

        const { rows } = await db.query(
            'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > $2',
            [tokenHash, now]
        );

        if (!rows.length) {
            return NextResponse.json(
                { error: 'Invalid or expired reset link. Please request a new one.' },
                { status: 400 }
            );
        }

        const { id: tokenId, user_id: userId } = rows[0] as any;

        // Hash new password and update user
        const hashed = await bcrypt.hash(password, 12);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);

        // Mark token as used
        await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
