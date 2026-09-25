/**
 * Stripe client + helpers.
 *
 * Env vars (set on Cloud Run, never committed):
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   STRIPE_PUBLISHABLE_KEY   — pk_live_... or pk_test_... (exposed to client)
 *   STRIPE_PRICE_MONTHLY     — price_... for €4.99/mo plan
 *   STRIPE_PRICE_YEARLY      — price_... for €49.99/yr plan
 *   STRIPE_WEBHOOK_SECRET    — whsec_... (set after webhook endpoint is created)
 */

import Stripe from 'stripe';
import db from './db';
import { sendPremiumWelcomeEmail, sendSubscriptionCanceledEmail } from './email';

let _stripe: Stripe | null = null;

/** Lazy-init Stripe client so missing env at build time doesn't throw. */
export function stripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error('STRIPE_SECRET_KEY is not set');
        }
        _stripe = new Stripe(key, {
            apiVersion: '2026-04-22.dahlia',
            typescript: true,
        });
    }
    return _stripe;
}

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY ?? '';
export const STRIPE_PRICE_YEARLY  = process.env.STRIPE_PRICE_YEARLY  ?? '';
export const APP_URL              = process.env.NEXTAUTH_URL ?? 'https://app.yourfriendleague.com';

/** Plan identifier we use in DB / UI */
export type Plan = 'monthly' | 'yearly';

export function priceIdFor(plan: Plan): string {
    return plan === 'yearly' ? STRIPE_PRICE_YEARLY : STRIPE_PRICE_MONTHLY;
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
    if (!priceId) return null;
    if (priceId === STRIPE_PRICE_YEARLY) return 'yearly';
    if (priceId === STRIPE_PRICE_MONTHLY) return 'monthly';
    return null;
}

/** Ensure the users table has the columns Stripe needs. Idempotent. */
let migrationDone = false;
export async function ensureStripeColumns() {
    if (migrationDone) return;
    await db.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end BIGINT;
        CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
        CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
    `).catch(err => {
        console.error('ensureStripeColumns failed:', err);
    });
    migrationDone = true;
}

/**
 * Get or create a Stripe customer for a user.
 * Idempotent: caches the customer ID on the user row.
 */
export async function getOrCreateCustomer(args: {
    userId: string;
    email: string;
    username: string;
}): Promise<string> {
    await ensureStripeColumns();

    const { rows } = await db.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [args.userId]
    );
    const existing = rows[0]?.stripe_customer_id as string | undefined;
    if (existing) return existing;

    const customer = await stripe().customers.create({
        email: args.email,
        name: args.username,
        metadata: { userId: args.userId },
    });

    await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, args.userId]
    );
    return customer.id;
}

/**
 * Apply subscription state from a Stripe Subscription object to our DB.
 * Safe to call from any webhook event — idempotent.
 *
 * Sends a welcome email on the FIRST time the user becomes premium (state transition).
 */
export async function syncSubscriptionToDb(sub: Stripe.Subscription) {
    await ensureStripeColumns();

    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    // Resolve user via stripe_customer_id, also pulling current state for transition detection
    const { rows } = await db.query(
        'SELECT id, email, username, subscription_status FROM users WHERE stripe_customer_id = $1',
        [customerId]
    );
    const user = rows[0] as
        | { id: string; email: string; username: string; subscription_status: string | null }
        | undefined;
    if (!user) {
        console.warn(`syncSubscriptionToDb: no user found for customer ${customerId}`);
        return;
    }

    const item = sub.items.data[0];
    const priceId = item?.price?.id ?? null;
    const plan = planFromPriceId(priceId);
    const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end ?? null;

    // 'active' or 'trialing' = paid customer. Other statuses = downgrade to free.
    const isPaid = sub.status === 'active' || sub.status === 'trialing';
    const role = isPaid ? 'premium' : 'user';

    await db.query(
        `UPDATE users SET
            stripe_subscription_id = $1,
            subscription_status    = $2,
            subscription_plan      = $3,
            current_period_end     = $4,
            is_paid                = $5,
            role                   = CASE
                WHEN role = 'admin' THEN role
                ELSE $6
            END
         WHERE id = $7`,
        [sub.id, sub.status, plan, periodEnd, isPaid, role, user.id]
    );

    // Welcome email — only fire on the transition from non-active → active
    const wasActive = user.subscription_status === 'active' || user.subscription_status === 'trialing';
    if (isPaid && !wasActive && plan) {
        sendPremiumWelcomeEmail(user.email, user.username, plan, periodEnd).catch(err =>
            console.error('Premium welcome email failed:', err)
        );
    }
}

/** Handle subscription deletion — downgrade user back to free + send cancel email. */
export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
    await ensureStripeColumns();
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const { rows } = await db.query(
        'SELECT id, email, username, subscription_status FROM users WHERE stripe_customer_id = $1',
        [customerId]
    );
    const user = rows[0] as
        | { id: string; email: string; username: string; subscription_status: string | null }
        | undefined;
    if (!user) return;

    // Determine end date — if Stripe set ended_at use that, else use current_period_end
    const endDate = (sub as any).ended_at ?? (sub as any).current_period_end ?? null;

    await db.query(
        `UPDATE users SET
            stripe_subscription_id = NULL,
            subscription_status    = 'canceled',
            subscription_plan      = NULL,
            current_period_end     = NULL,
            is_paid                = FALSE,
            role                   = CASE
                WHEN role = 'admin' THEN role
                ELSE 'user'
            END
         WHERE id = $1`,
        [user.id]
    );

    // Cancel email — only fire if user was previously a paid subscriber
    // (avoids double-emailing on idempotent webhook retries)
    const wasActive = user.subscription_status === 'active' || user.subscription_status === 'trialing' || user.subscription_status === 'past_due';
    if (wasActive) {
        sendSubscriptionCanceledEmail(user.email, user.username, endDate).catch(err =>
            console.error('Subscription canceled email failed:', err)
        );
    }
}
