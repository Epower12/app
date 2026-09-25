import * as Sentry from '@sentry/nextjs';

// Not a secret — see instrumentation-client.ts for why this is hardcoded rather
// than read from an env var (gcloudignore excludes .env from the Cloud Build upload).
const SENTRY_DSN = 'https://940351017d6630bc12260dbb1c33beca@o4511763401670656.ingest.de.sentry.io/4511763422838864';

Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    debug: false,
});
