// NOTE: This page renders identical content to `/`. The canonical URL is `/`.
// The `/landing` route is suppressed from indexing via app/landing/layout.tsx
// (server-component layout file that exports `metadata.robots = noindex`).
//
// Server Component wrapper: resolves the visitor's region (set by proxy.ts
// via geoip-lite) so LandingContent can pick "Football" vs "Soccer" without
// a client-side geo lookup or a hydration-mismatch flash.

import LandingContent from './LandingContent';
import { getVisitorRegion } from './region';

export default async function LandingPage() {
    const region = await getVisitorRegion();
    return <LandingContent region={region} />;
}
