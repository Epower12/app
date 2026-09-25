import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');

        // Bring the database schema up to date as soon as the server starts,
        // instead of waiting for the first request that happens to need a new
        // table. Idempotent, and never blocks or crashes startup: failures are
        // logged and the per-route ensureMigrations() calls retry later.
        if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
            const { ensureMigrations } = await import('./lib/migrations');
            ensureMigrations().catch(err => console.error('[migrations] startup run failed:', err));
        }
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

export const onRequestError = Sentry.captureRequestError;
