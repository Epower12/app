import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/lib/db';
import { stripe, priceIdFor, getOrCreateCustomer, APP_URL, Plan } from '@/lib/stripe';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * POST /api/stripe/checkout
 * Body: { plan: 'monthly' | 'yearly' }
 * Returns: { url: string }  — redirect the user to this URL
 */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const { allowed } = rateLimit(`checkout:${ip}`, 10, 5 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const user = session.user as any;
    try {
        const body = await request.json();
        const plan: Plan = body.plan === 'yearly' ? 'yearly' : 'monthly';

        const price = priceIdFor(plan);
        if (!price) {
            return NextResponse.json({ error: 'Plan not configured' }, { status: 500 });
        }

        // If user is already a paid subscriber, redirect them to the portal instead
        const { rows } = await db.query(
            'SELECT email, username, subscription_status FROM users WHERE id = $1',
            [user.id]
        );
        const dbUser = rows[0] as { email: string; username: string; subscription_status: string | null };
        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (dbUser.subscription_status === 'active' || dbUser.subscription_status === 'trialing') {
            return NextResponse.json(
                { error: 'You already have an active subscription. Use the Manage Billing button instead.' },
                { status: 400 }
            );
        }

        const customerId = await getOrCreateCustomer({
            userId: user.id,
            email: dbUser.email,
            username: dbUser.username,
        });

        const checkoutSession = await stripe().checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price, quantity: 1 }],
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            // Surface in Stripe Dashboard which user this is
            client_reference_id: user.id,
            metadata: { userId: user.id, plan },
            subscription_data: {
                metadata: { userId: user.id, plan },
            },
            success_url: `${APP_URL}/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/profile?upgrade=cancelled`,
        });

        if (!checkoutSession.url) {
            return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
