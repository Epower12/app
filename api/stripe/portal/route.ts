import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/lib/db';
import { stripe, APP_URL } from '@/lib/stripe';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * POST /api/stripe/portal
 * Opens a Stripe Customer Portal session for the signed-in user.
 * Returns: { url: string }
 */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const { allowed } = rateLimit(`portal:${ip}`, 10, 5 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const user = session.user as any;
    try {
        const { rows } = await db.query(
            'SELECT stripe_customer_id FROM users WHERE id = $1',
            [user.id]
        );
        const customerId = rows[0]?.stripe_customer_id as string | undefined;
        if (!customerId) {
            return NextResponse.json(
                { error: 'No subscription found for this account.' },
                { status: 404 }
            );
        }

        const portal = await stripe().billingPortal.sessions.create({
            customer: customerId,
            return_url: `${APP_URL}/profile`,
        });

        return NextResponse.json({ url: portal.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
