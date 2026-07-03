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

        // Ensure subscription columns exist (auto-migrate on first request)
        await db.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end BIGINT;
        `).catch(() => {});

        // Fetch user basic data
        const { rows: userRows } = await db.query(`
            SELECT
                id, username, email, role, is_paid as isPaid,
                avatar_url as avatarUrl, bio, best_streak as bestStreak, created_at as createdAt,
                subscription_status, subscription_plan, current_period_end
            FROM users
            WHERE id = $1
        `, [userId]);

        const user = userRows[0] as any;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get stats (streak, accuracy)
        const stats = await getUserStats(userId);

        // Update best streak if current is higher
        if (stats.currentStreak > user.beststreak) {
            await db.query('UPDATE users SET best_streak = $1 WHERE id = $2', [stats.currentStreak, userId]);
            user.beststreak = stats.currentStreak;
        }

        // Get leagues
        const leagues = await getUserLeagues(userId);

        // Get achievements
        const { rows: achievementData } = await db.query(`
            SELECT 
                a.id, a.name, a.description, a.icon_url as iconUrl,
                ua.unlocked_at as unlockedAt
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = $1
        `, [userId]);

        return NextResponse.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isPaid: Boolean(user.ispaid),
            avatarUrl: user.avatarurl || null,
            bio: user.bio || '',
            bestStreak: user.beststreak || 0,
            currentStreak: stats.currentStreak || 0,
            accuracy: stats.accuracy || 0,
            totalPredictions: stats.totalPredictions || 0,
            leagues: leagues || [],
            achievements: achievementData || [],
            subscriptionStatus: user.subscription_status || null,
            subscriptionPlan: user.subscription_plan || null,
            currentPeriodEnd: user.current_period_end ? Number(user.current_period_end) : null,
        });
    } catch (error) {
        console.error('Profile GET error:', error);
        return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 });
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
        if (username && username.length > 50) {
            return NextResponse.json({ error: 'Username must be 50 characters or fewer' }, { status: 400 });
        }
        if (bio && bio.length > 500) {
            return NextResponse.json({ error: 'Bio must be 500 characters or fewer' }, { status: 400 });
        }
        // Only allow relative paths or trusted CDN origins for avatarUrl
        if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
            const isRelative = avatarUrl.startsWith('/');
            const isTrusted = /^https:\/\/(lh3\.googleusercontent\.com|avatars\.githubusercontent\.com|cdn\.yourfriendleague\.com|flagcdn\.com)\//i.test(avatarUrl);
            if (!isRelative && !isTrusted) {
                return NextResponse.json({ error: 'Avatar URL must be a relative path or from a trusted source' }, { status: 400 });
            }
            if (avatarUrl.length > 500) {
                return NextResponse.json({ error: 'Avatar URL is too long' }, { status: 400 });
            }
        }

        // Check if username is taken (if changed)
        if (username) {
            const { rows: existing } = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
            if (existing.length > 0) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }
        }

        // Update database
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (username !== undefined) {
            updates.push(`username = $${paramIndex++}`);
            params.push(username);
        }
        if (avatarUrl !== undefined) {
            updates.push(`avatar_url = $${paramIndex++}`);
            params.push(avatarUrl);
        }
        if (bio !== undefined) {
            updates.push(`bio = $${paramIndex++}`);
            params.push(bio);
        }

        if (updates.length > 0) {
            params.push(userId);
            await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
        }

        // Fetch updated user
        const { rows: updatedUser } = await db.query(`
            SELECT id, username, email, role, is_paid as isPaid, avatar_url as avatarUrl, bio, best_streak as bestStreak
            FROM users WHERE id = $1
        `, [userId]);

        const user = updatedUser[0] as any;

        // Maintain consistency with GET response structure (camelCase)
        return NextResponse.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isPaid: Boolean(user.ispaid),
            avatarUrl: user.avatarurl || null,
            bio: user.bio || '',
            bestStreak: user.beststreak || 0
        });
    } catch (error) {
        console.error('Profile PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
