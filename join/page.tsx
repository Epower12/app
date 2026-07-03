'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Navbar from '../components/Navbar';

function JoinPageContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code')?.toUpperCase() ?? '';

    const [phase, setPhase] = useState<'joining' | 'success' | 'error' | 'login'>('joining');
    const [message, setMessage] = useState('');
    const [tournamentId, setTournamentId] = useState('');

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            // Store the code in sessionStorage so we can redirect back after login
            if (code) sessionStorage.setItem('pendingJoinCode', code);
            // Properly encode the `next` query so the ? in /join?code= doesn't terminate it
            const next = encodeURIComponent(`/join?code=${code}`);
            router.push(`/login?next=${next}`);
            return;
        }
        if (!code) { setPhase('error'); setMessage('No invite code provided.'); return; }
        attemptJoin(code);
    }, [status, code]);

    const attemptJoin = async (joinCode: string) => {
        setPhase('joining');
        try {
            const res = await fetch('/api/tournaments/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode }),
            });
            const data = await res.json();
            if (res.ok) {
                setTournamentId(data.tournamentId || '');
                setPhase('success');
                setMessage(data.tournamentName || 'League joined!');
                // Auto-redirect after 2 seconds
                setTimeout(() => {
                    router.push(data.tournamentId ? `/predictions/${data.tournamentId}` : '/tournaments');
                }, 2000);
            } else if (res.status === 409) {
                // Already a member — just redirect
                setTournamentId(data.tournamentId || '');
                setPhase('success');
                setMessage(data.tournamentName ? `Already in "${data.tournamentName}"` : 'Already joined!');
                setTimeout(() => {
                    router.push(data.tournamentId ? `/predictions/${data.tournamentId}` : '/tournaments');
                }, 2000);
            } else {
                setPhase('error');
                setMessage(data.error || 'Invalid or expired invite code.');
            }
        } catch {
            setPhase('error');
            setMessage('Connection error. Please try again.');
        }
    };

    return (
        <div className="app-page">
            <Navbar />
            <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem' }}>
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2.5rem 2rem',
                    maxWidth: 420,
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}>
                    {phase === 'joining' && (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Joining league…</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Code: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.15em', color: 'var(--color-primary)' }}>{code}</strong>
                            </p>
                            <div className="loading" style={{ height: 4, borderRadius: 99, marginTop: '1.5rem' }} />
                        </>
                    )}

                    {phase === 'success' && (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>You're in!</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                {message}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Redirecting to predictions…</p>
                        </>
                    )}

                    {phase === 'error' && (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Couldn't join</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{message}</p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                <button className="btn btn-primary" onClick={() => code && attemptJoin(code)}>Retry</button>
                                <button className="btn btn-secondary" onClick={() => router.push('/tournaments')}>← Leagues</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense>
            <JoinPageContent />
        </Suspense>
    );
}
