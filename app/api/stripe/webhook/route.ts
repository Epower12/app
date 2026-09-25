import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
    stripe,
    syncSubscriptionToDb,
    handleSubscriptionDeleted,
    ensureStripeColumns,
} from '@/lib/stripe';

/**
 * POST /api/stripe/webhook
 *
 * Receives subscription lifecycle events from Stripe. The endpoint MUST:
 *   1. Read the raw body (not parsed JSON) to verify signature
 *   2. Reject events it can't cryptographically verify
 *   3. Be idempotent — same event ID processed twice should produce same result
 *
 * Stripe Dashboard → Webhooks → Add endpoint:
 *   URL:     https://app.yourfriendleague.com/api/stripe/webhook
 *   Events:  checkout.session.completed
 *            customer.subscription.created
 *            customer.subscription.updated
 *            customer.subscription.deleted
 *            invoice.payment_succeeded
 *            invoice.payment_failed
 *   Then copy the signing secret (whsec_...) into STRIPE_WEBHOOK_SECRET env var.
 */

// Force Node.js runtime (Stripe SDK needs Node, not Edge)
export const runtime = 'nodejs';
// Disable Next.js body parser — we need the raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        console.error('STRIPE_WEBHOOK_SECRET is not set');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Read raw body as text — Stripe signs the exact bytes
    const rawBody = await request.text();

    let event: Stripe.Event;
    try {
        event = stripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    await ensureStripeColumns();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                // After successful checkout, Stripe attaches the subscription to the customer.
                // We can pull the subscription and sync it.
                const cs = event.data.object as Stripe.Checkout.Session;
                if (cs.subscription) {
                    const subId = typeof cs.subscription === 'string' ? cs.subscription : cs.subscription.id;
                    const sub = await stripe().subscriptions.retrieve(subId);
                    await syncSubscriptionToDb(sub);
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object as Stripe.Subscription;
                await syncSubscriptionToDb(sub);
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(sub);
                break;
            }

            case 'invoice.payment_succeeded': {
                // Renewal payment — re-sync the subscription to refresh current_period_end
                const inv = event.data.object as Stripe.Invoice;
                const subId = (inv as any).subscription;
                if (typeof subId === 'string') {
                    const sub = await stripe().subscriptions.retrieve(subId);
                    await syncSubscriptionToDb(sub);
                }
                break;
            }

            case 'invoice.payment_failed': {
                // Card declined on renewal. Stripe will retry; subscription status will become
                // 'past_due' → 'unpaid' → 'canceled' depending on retry settings.
                // We just sync the current state.
                const inv = event.data.object as Stripe.Invoice;
                const subId = (inv as any).subscription;
                if (typeof subId === 'string') {
                    const sub = await stripe().subscriptions.retrieve(subId);
                    await syncSubscriptionToDb(sub);
                }
                break;
            }

            default:
                // Other event types we don't care about — acknowledge so Stripe doesn't retry
                break;
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error(`Webhook handler error for ${event.type}:`, err);
        // Return 500 so Stripe retries — but be careful: handler must be idempotent.
        return NextResponse.json({ error: 'Handler error' }, { status: 500 });
    }
}
