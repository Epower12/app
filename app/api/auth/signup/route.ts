import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../../../lib/db';
import { sendWelcomeEmail } from '../../../../lib/email';
import { rateLimit, getClientIp } from '../../../../lib/rateLimit';

export async function POST(request: Request) {
    // Rate limit: 5 signups per hour per IP
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many signup attempts. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
        );
    }

    try {
        const { username, email, password } = await request.json();

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Enforce minimum password length
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Enforce max lengths
        if (username.length > 50) {
            return NextResponse.json({ error: 'Username must be 50 characters or fewer' }, { status: 400 });
        }
        if (email.length > 255) {
            return NextResponse.json({ error: 'Email address is too long' }, { status: 400 });
        }

        // Check if username or email already exists
        const { rows } = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email.toLowerCase().trim()]
        );

        if (rows.length > 0) {
            return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userId = uuidv4();
        await db.query(
            'INSERT INTO users (id, username, email, password, role) VALUES ($1, $2, $3, $4, $5)',
            [userId, username, email.toLowerCase().trim(), hashedPassword, 'user']
        );

        // Send welcome email (non-fatal)
        sendWelcomeEmail(email, username).catch(err =>
            console.error('Welcome email failed:', err)
        );

        // Do NOT return userId — no need to expose internal IDs to unauthenticated callers
        return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
