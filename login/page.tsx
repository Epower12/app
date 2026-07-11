'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import OAuthButtons from '../components/OAuthButtons';

function LoginPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/';
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await signIn('credentials', {
                username: formData.email,
                password: formData.password,
                redirect: false,
            });
            if (result?.error) {
                setError('Invalid email or password');
            } else {
                router.push(next);
                router.refresh();
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">
            {/* ---- Left Visual Panel ---- */}
            <div className="auth-visual">
                <div className="auth-visual-media" aria-hidden="true">
                    <video src="/video/hockey.mp4" poster="/img/sport-hockey.png" autoPlay muted loop playsInline />
                </div>
                <div className="auth-visual-content">
                    <div className="auth-visual-logo">
                        <img src="/logo.png" alt="YourFriendsLeague" style={{ height: '120px', width: 'auto' }} />
                    </div>
                    <h2 className="auth-visual-headline">
                        Predict.<br />Compete.<br />Win.
                    </h2>
                    <p className="auth-visual-sub">
                        Pick exact scores before kick-off, earn points for precision, and climb
                        a table only your friends can see.
                    </p>
                </div>
            </div>

            {/* ---- Right Form Panel ---- */}
            <div className="auth-form-panel">
                <div className="auth-form-inner">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">Welcome back</h1>
                        <p className="auth-form-subtitle">Sign in to your YourFriendsLeague account</p>
                    </div>

                    <OAuthButtons callbackUrl={next} />

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email address</label>
                            <input
                                id="email"
                                type="email"
                                className="input auth-input"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                                <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                                <Link href="/forgot-password" className="auth-link" style={{ fontSize: '0.8rem' }}>Forgot password?</Link>
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input auth-input"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                style={{ paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                className="auth-pw-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button
                            type="submit"
                            className="btn btn-primary auth-submit-btn"
                            disabled={loading}
                        >
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <div className="auth-form-footer">
                        <p>
                            Don&apos;t have an account?{' '}
                            <Link href={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="auth-link">Create one free</Link>
                        </p>
                        <Link href="/" className="auth-link-muted">← Back to home</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}>
            <LoginPageInner />
        </Suspense>
    );
}
