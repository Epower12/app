'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LandingPage from './landing/page';

/**
 * Client-side root entry. Three branches:
 *   - Loading session  → loading skeleton
 *   - Authenticated   → redirect to /premium (paid/admin) or /tournaments
 *   - Unauthenticated → render the landing page in place
 *
 * Kept as a separate client component so the parent page.tsx can stay a Server
 * Component and emit page-level metadata + canonical URL.
 */
export default function HomeRouter() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;
        if (session) {
            const role = (session.user as any).role;
            if (role === 'premium' || role === 'admin') {
                router.push('/premium');
            } else {
                router.push('/tournaments');
            }
        }
    }, [session, status, router]);

    if (status === 'loading') {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
            </div>
        );
    }

    if (!session) {
        return <LandingPage />;
    }

    return (
        <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
            <div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
        </div>
    );
}
