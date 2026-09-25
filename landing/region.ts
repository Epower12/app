import { headers } from 'next/headers';

export type VisitorRegion = 'us' | 'intl';

/** Reads the region resolved by proxy.ts (geoip-lite) for regional copy, e.g. "Football" vs "Soccer". */
export async function getVisitorRegion(): Promise<VisitorRegion> {
    const hdrs = await headers();
    return hdrs.get('x-visitor-region') === 'us' ? 'us' : 'intl';
}
