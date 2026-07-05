'use client';

import { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';

type ProviderInfo = { id: string; name: string };

const ICONS: Record<string, React.ReactNode> = {
    google: (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.55-5.17 3.55-8.81z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 010-4.54V6.62H1.27a12 12 0 000 10.76l4-3.11z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
        </svg>
    ),
    facebook: (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z" />
        </svg>
    ),
    apple: (
        <svg width="16" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.02.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
    ),
    discord: (
        <svg width="19" height="15" viewBox="0 0 24 18" aria-hidden="true">
            <path fill="#5865F2" d="M20.32 1.53A19.9 19.9 0 0015.29 0a13.6 13.6 0 00-.64 1.32 18.4 18.4 0 00-5.3 0A13.6 13.6 0 008.7 0 19.9 19.9 0 003.67 1.53C.5 6.34-.32 11.02.09 15.63a20 20 0 006.1 3.1 15 15 0 001.32-2.15 13 13 0 01-2.07-1 8 8 0 00.5-.4 14.2 14.2 0 0012.1 0q.25.2.5.4a13 13 0 01-2.07 1 15 15 0 001.32 2.15 20 20 0 006.1-3.1c.5-5.32-.84-9.96-3.68-14.1zM8.02 12.8c-1.22 0-2.22-1.13-2.22-2.51 0-1.39 1-2.52 2.22-2.52s2.24 1.14 2.22 2.52c0 1.38-1 2.51-2.22 2.51zm7.96 0c-1.22 0-2.22-1.13-2.22-2.51 0-1.39 1-2.52 2.22-2.52s2.24 1.14 2.22 2.52c0 1.38-1 2.51-2.22 2.51z" />
        </svg>
    ),
};

const LABELS: Record<string, string> = {
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
    discord: 'Discord',
};

/** Order to render provider buttons in, regardless of NextAuth's internal registration order. */
const ORDER = ['google', 'facebook', 'apple', 'discord'];

export default function OAuthButtons({ callbackUrl = '/' }: { callbackUrl?: string }) {
    const [providers, setProviders] = useState<ProviderInfo[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        getProviders().then(res => {
            if (cancelled || !res) return;
            const list = Object.values(res)
                .filter(p => p.id !== 'credentials')
                .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
            setProviders(list);
        });
        return () => { cancelled = true; };
    }, []);

    if (!providers || providers.length === 0) return null;

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {providers.map(p => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => signIn(p.id, { callbackUrl })}
                        className="oauth-btn"
                    >
                        {ICONS[p.id]}
                        Continue with {LABELS[p.id] ?? p.name}
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            </div>
        </div>
    );
}
