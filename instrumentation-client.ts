import * as Sentry from '@sentry/nextjs';

// Not a secret — Sentry DSNs are designed to be public, embedded in every client
// bundle. Hardcoded rather than routed through NEXT_PUBLIC_SENTRY_DSN because
// .gcloudignore excludes .env/.env.local from the Cloud Build upload entirely, and
// Cloud Run's runtime env vars are set too late for a build-time-inlined NEXT_PUBLIC_
// var — see .env for the (now purely informational) local-dev copy of this value.
const SENTRY_DSN = 'https://940351017d6630bc12260dbb1c33beca@o4511763401670656.ingest.de.sentry.io/4511763422838864';

Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
