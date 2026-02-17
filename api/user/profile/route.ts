import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserStats, getUserLeagues } from '@/lib/profile';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Fetch user basic data
        const user = db.prepare(`
            SELECT 
                id, username, email, role, is_paid as isPaid, 
                avatar_url as avatarUrl, bio, best_streak as bestStreak, created_at as createdAt
            FROM users 
            WHERE id = ?
        `).get(userId) as any;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get stats (streak, accuracy)
        const stats = getUserStats(userId);

        // Update best streak if current is higher
        if (stats.currentStreak > user.bestStreak) {
            db.prepare('UPDATE users SET best_streak = ? WHERE id = ?').run(stats.currentStreak, userId);
            user.bestStreak = stats.currentStreak;
        }

        // Get leagues
        const leagues = getUserLeagues(userId);

        // Get achievements
        const achievementData = db.prepare(`
            SELECT 
                a.id, a.name, a.description, a.icon_url as iconUrl,
                ua.unlocked_at as unlockedAt
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ?
        `).all(userId) as any[];

        return NextResponse.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isPaid: Boolean(user.isPaid),
            avatarUrl: user.avatarUrl || null,
            bio: user.bio || '',
            bestStreak: user.bestStreak || 0,
            currentStreak: stats.currentStreak || 0,
            accuracy: stats.accuracy || 0,
            totalPredictions: stats.totalPredictions || 0,
            leagues: leagues || [],
            achievements: achievementData || []
        });
    } catch (error) {
        console.error('Profile GET error details:', error);
        return NextResponse.json({
            error: 'Failed to load profile data',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { username, avatarUrl, bio } = await request.json();

        // Basic validation
        if (username && username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        }

        // Check if username is taken (if changed)
        if (username) {
            const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
            if (existing) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }
        }

        // Update database
        const updates = [];
        const params = [];

        if (username !== undefined) {
            updates.push('username = ?');
            params.push(username);
        }
        if (avatarUrl !== undefined) {
            updates.push('avatar_url = ?');
            params.push(avatarUrl);
        }
        if (bio !== undefined) {
            updates.push('bio = ?');
            params.push(bio);
        }

        if (updates.length > 0) {
            params.push(userId);
            db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        // Fetch updated user
        const updatedUser = db.prepare(`
            SELECT id, username, email, role, is_paid as isPaid, avatar_url as avatarUrl, bio, best_streak as bestStreak
            FROM users WHERE id = ?
        `).get(userId);

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Profile PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
