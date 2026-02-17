import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../../../lib/db';

export async function POST(request: Request) {
    try {
        const { username, email, password } = await request.json();
        const role = 'user';

        if (!username || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if username or email already exists
        const existingUser = db
            .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
            .get(username, email);

        if (existingUser) {
            return NextResponse.json(
                { error: 'Username or email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userId = uuidv4();
        db.prepare(
            'INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, username, email, hashedPassword, role);

        return NextResponse.json(
            { message: 'User created successfully', userId },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
