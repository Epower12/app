'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

/**
 * Client-side provider wrapper.
 * Kept as a separate file so the root layout can stay a Server Component
 * — which is required for Next.js's metadata system (titles, OpenGraph, etc.) to work.
 */
export default function Providers({ children }: { children: ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
