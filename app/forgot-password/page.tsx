'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [phase, setPhase] = useState<'form' | 'sent'>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setPhase('sent');
            } else {
                const d = await res.json();
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
            {/* Left visual — same as login */}
            <div className="auth-visual">
                <div className="auth-visual-media" aria-hidden="true">
                    <video src="/video/basketball.mp4" poster="/img/sport-basketball.png" autoPlay muted loop playsInline />
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

            {/* Right form */}
            <div className="auth-form-panel">
                <div className="auth-form-inner">
                    {phase === 'form' ? (
                        <>
                            <div className="auth-form-header">
                                <h1 className="auth-form-title">Forgot password?</h1>
                                <p className="auth-form-subtitle">
                                    Enter your email and we'll send you a reset link.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="email">Email address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="input auth-input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                {error && <div className="auth-error">{error}</div>}

                                <button
                                    type="submit"
                                    className="btn btn-primary auth-submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? 'Sending…' : 'Send reset link'}
                                </button>
                            </form>

                            <div className="auth-form-footer">
                                <p>
                                    Remembered it?{' '}
                                    <Link href="/login" className="auth-link">Sign in</Link>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <h1 className="auth-form-title">Check your inbox</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
                                We sent a reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                                <br />It expires in 1 hour.
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                Didn't get it? Check your spam folder, or{' '}
                                <button
                                    className="auth-link"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                    onClick={() => setPhase('form')}
                                >
                                    try again
                                </button>.
                            </p>
                            <Link href="/login" className="btn btn-secondary">← Back to sign in</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
