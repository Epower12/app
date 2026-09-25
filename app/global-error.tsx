'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body style={{
                margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem',
                background: '#050a14', color: '#f1f5f9',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                textAlign: 'center', padding: '2rem',
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h1>
                <p style={{ color: '#94a3b8', maxWidth: 420 }}>
                    We've been notified and are looking into it. Try reloading the page.
                </p>
                <button
                    onClick={() => reset()}
                    style={{
                        padding: '0.75rem 2rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(123deg, #041322 5%, #0ea5e9 38%, #6366f1 70%, #f97316 100%)',
                        color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.85rem',
                    }}
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
