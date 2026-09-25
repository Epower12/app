import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * POST /api/user/profile/delete
 * Body: { confirmation: string }   // user must send their own username to confirm
 *
 * Permanently deletes the user's account:
 *   1. Cancels any active Stripe subscription immediately
 *   2. Hard-deletes related rows (predictions, memberships, owned leagues, notifications, etc.)
 *   3. Deletes the user row itself
 *
 * The Stripe customer record is preserved in Stripe (accounting), but with no
 * active subscription and the customer effectively unable to log back in.
 *
 * After success, the client must call signOut() to clear the local session cookie.
 */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit — defend against accidental double-clicks AND any attempt to brute force
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`delete:${ip}`, 3, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const sessionUser = session.user as any;
    const userId = sessionUser.id;

    try {
        const body = await request.json();
        const confirmation = (body.confirmation as string | undefined)?.trim();

        // Fetch the user — we need username for confirmation and stripe_subscription_id to cancel
        const { rows } = await db.query(
            `SELECT username, stripe_customer_id, stripe_subscription_id, subscription_status, role
             FROM users WHERE id = $1`,
            [userId]
        );
        const user = rows[0] as {
            username: string;
            stripe_customer_id: string | null;
            stripe_subscription_id: string | null;
            subscription_status: string | null;
            role: string;
        } | undefined;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Confirmation must match username exactly (case-sensitive)
        if (confirmation !== user.username) {
            return NextResponse.json(
                { error: `To confirm, type your username exactly: ${user.username}` },
                { status: 400 }
            );
        }

        // Don't allow admin self-deletion (could lock you out of the app)
        if (user.role === 'admin') {
            return NextResponse.json(
                { error: 'Admin accounts cannot be deleted via this endpoint. Contact support.' },
                { status: 403 }
            );
        }

        // 1. Cancel active Stripe subscription (best effort — log but don't block deletion)
        if (
            user.stripe_subscription_id &&
            (user.subscription_status === 'active' || user.subscription_status === 'trialing' || user.subscription_status === 'past_due')
        ) {
            try {
                await stripe().subscriptions.cancel(user.stripe_subscription_id, {
                    invoice_now: false,
                    prorate: false,
                });
            } catch (err) {
                console.error('Stripe subscription cancel failed during account deletion:', err);
                // Continue with deletion — Stripe will eventually mark sub as canceled
                // even if this immediate call fails (and the webhook will sync state if user still existed)
            }
        }

        // 2. Hard-delete the user's data. Order matters: children first.
        //    Wrap in a transaction so a partial failure doesn't leave us in a half-state.
        await db.query('BEGIN');
        try {
            // 2a. User's own predictions
            await db.query('DELETE FROM predictions WHERE user_id = $1', [userId]);

            // 2b. Tournaments the user CREATED — destructively delete:
            //     predictions on matches in those tournaments → matches → participants → tournament
            const { rows: ownedTournaments } = await db.query(
                'SELECT id FROM tournaments WHERE created_by = $1',
                [userId]
            );
            const ownedIds = ownedTournaments.map(r => (r as any).id);
            if (ownedIds.length > 0) {
                // Predictions on matches in those tournaments
                await db.query(
                    `DELETE FROM predictions
                     WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = ANY($1::uuid[]))`,
                    [ownedIds]
                );
                // Notifications scoped to those tournaments
                await db.query(
                    'DELETE FROM notifications WHERE tournament_id = ANY($1::uuid[])',
                    [ownedIds]
                ).catch(() => {}); // notifications table may not exist yet
                // Matches in those tournaments
                await db.query('DELETE FROM matches WHERE tournament_id = ANY($1::uuid[])', [ownedIds]);
                // Other users' memberships in those tournaments
                await db.query('DELETE FROM tournament_participants WHERE tournament_id = ANY($1::uuid[])', [ownedIds]);
                // The tournaments themselves
                await db.query('DELETE FROM tournaments WHERE id = ANY($1::uuid[])', [ownedIds]);
            }

            // 2c. User's other data
            await db.query('DELETE FROM tournament_participants WHERE user_id = $1', [userId]);
            await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]).catch(() => {});
            await db.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]).catch(() => {});
            await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

            // 2d. The user row itself
            await db.query('DELETE FROM users WHERE id = $1', [userId]);

            await db.query('COMMIT');
        } catch (err) {
            await db.query('ROLLBACK').catch(() => {});
            console.error('Account deletion transaction failed:', err);
            return NextResponse.json(
                { error: 'Account deletion failed. Please try again or contact support.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
