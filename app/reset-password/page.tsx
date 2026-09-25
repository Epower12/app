'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') ?? '';

    const [phase, setPhase] = useState<'checking' | 'form' | 'done' | 'invalid'>('checking');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Validate token on load
    useEffect(() => {
        if (!token) { setPhase('invalid'); return; }
        fetch(`/api/auth/reset-password?token=${token}`)
            .then(r => r.json())
            .then(d => setPhase(d.valid ? 'form' : 'invalid'))
            .catch(() => setPhase('invalid'));
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const d = await res.json();
            if (res.ok) {
                setPhase('done');
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setError(d.error || 'Something went wrong');
            }
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">
            <div className="auth-visual">
                <div className="auth-visual-media" aria-hidden="true">
                    <video src="/video/racing.mp4" poster="/img/sport-racing.png" autoPlay muted loop playsInline />
                </div>
                <div className="auth-visual-content">
                    <div className="auth-visual-logo">
                        <img src="/logo.png" alt="YourFriendsLeague" style={{ height: '120px', width: 'auto' }} />
                    </div>
                    <h2 className="auth-visual-headline">
                        Predict.<br />Compete.<br />Win.
                    </h2>
                </div>
            </div>

            <div className="auth-form-panel">
                <div className="auth-form-inner">

                    {phase === 'checking' && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Verifying your link…</p>
                        </div>
                    )}

                    {phase === 'invalid' && (
                        <div style={{ textAlign: 'center' }}>
                            <h1 className="auth-form-title">Link expired</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                                This reset link is invalid or has expired. Links are valid for 1 hour.
                            </p>
                            <Link href="/forgot-password" className="btn btn-primary">Request a new link</Link>
                        </div>
                    )}

                    {phase === 'form' && (
                        <>
                            <div className="auth-form-header">
                                <h1 className="auth-form-title">Set new password</h1>
                                <p className="auth-form-subtitle">Choose a strong password you'll remember.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label className="form-label">New password</label>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        className="input auth-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoFocus
                                        style={{ paddingRight: '3rem' }}
                                    />
                                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(p => !p)} aria-label="Toggle password visibility">
                                        {showPw ? 'Hide' : 'Show'}
                                    </button>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirm password</label>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        className="input auth-input"
                                        placeholder="••••••••"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        required
                                    />
                                </div>

                                {error && <div className="auth-error">{error}</div>}

                                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                                    {loading ? 'Saving…' : 'Set new password'}
                                </button>
                            </form>
                        </>
                    )}

                    {phase === 'done' && (
                        <div style={{ textAlign: 'center' }}>
                            <h1 className="auth-form-title">Password updated</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                                Your password has been changed. Redirecting to sign in…
                            </p>
                            <Link href="/login" className="btn btn-primary">Sign in now →</Link>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordContent />
        </Suspense>
    );
}
