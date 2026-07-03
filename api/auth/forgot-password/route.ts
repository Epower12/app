import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

async function ensureTable() {
    // Create table with new schema (token_hash instead of token)
    await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at BIGINT NOT NULL,
            used BOOLEAN DEFAULT false,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        );
        CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
    `);
    // Migrate: rename old 'token' column to 'token_hash' if it exists
    await db.query(`
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'password_reset_tokens' AND column_name = 'token'
            ) THEN
                ALTER TABLE password_reset_tokens RENAME COLUMN token TO token_hash;
                DROP INDEX IF EXISTS idx_prt_token;
                CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
                -- Existing plain-text tokens are now invalid — clear them out
                DELETE FROM password_reset_tokens;
            END IF;
        END $$;
    `).catch(() => {}); // ignore if already migrated
}

export async function POST(request: Request) {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = rateLimit(`forgot-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
        );
    }

    try {
        const { email } = await request.json();
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        await ensureTable();

        // Look up user — always return success to avoid email enumeration
        const { rows } = await db.query(
            'SELECT id, username FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
        const user = rows[0] as any;

        if (user) {
            // Delete any existing tokens for this user
            await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

            // Generate raw token (sent in email), store only its SHA-256 hash
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiresAt = Math.floor(Date.now() / 1000) + 3600;

            await db.query(
                'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
                [user.id, tokenHash, expiresAt]
            );

            // Send the raw token in the email link
            sendPasswordResetEmail(email, user.username, rawToken).catch(err =>
                console.error('Reset email failed:', err)
            );
        }

        // Always return OK — never reveal whether the email exists
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
