'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const intent = searchParams.get('intent'); // 'premium' if coming from landing pricing CTA
    const plan = searchParams.get('plan');     // 'monthly' | 'yearly'
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getStrength = (pw: string) => {
        if (!pw) return 0;
        let s = 0;
        if (pw.length >= 8) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return s;
    };

    const strength = getStrength(formData.password);
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
    const strengthColors = ['', '#f5576c', '#fa709a', '#4facfe', '#00f2fe'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: 'user',
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Failed to create account');
            } else {
                // Preserve upgrade intent through login → profile auto-checkout
                if (intent === 'premium' && (plan === 'monthly' || plan === 'yearly')) {
                    const next = encodeURIComponent(`/profile?startCheckout=${plan}`);
                    router.push(`/login?next=${next}`);
                } else {
                    router.push('/login');
                }
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const perks = [
        '🌍 Multi-sport predictions',
        '📊 Smart points system',
        '🏅 Live leaderboards',
        '🎯 Track your accuracy',
    ];

    return (
        <div className="auth-split auth-split-reverse">
            {/* ---- Right Form Panel ---- */}
            <div className="auth-form-panel">
                <div className="auth-form-inner">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">Create account</h1>
                        <p className="auth-form-subtitle">It&apos;s free — no credit card needed</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                className="input auth-input"
                                placeholder="predictor99"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

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
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input auth-input"
                                placeholder="Min. 6 characters"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                style={{ paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                className="auth-pw-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                            {formData.password && (
                                <div className="pw-strength-bar">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className="pw-strength-segment"
                                            style={{
                                                background: i <= strength ? strengthColors[strength] : 'var(--border-color)',
                                            }}
                                        />
                                    ))}
                                    <span className="pw-strength-label" style={{ color: strengthColors[strength] }}>
                                        {strengthLabel}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="confirm">Confirm Password</label>
                            <input
                                id="confirm"
                                type="password"
                                className="input auth-input"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button
                            type="submit"
                            className="btn btn-primary auth-submit-btn"
                            disabled={loading}
                        >
                            {loading ? '⏳ Creating...' : <>Create Free Account <span className="btn-arrow">→</span></>}
                        </button>

                        <p style={{
                            fontSize: '0.75rem', color: 'var(--text-muted)',
                            textAlign: 'center', lineHeight: 1.6, marginTop: '0.75rem',
                        }}>
                            By creating an account you agree to our{' '}
                            <Link href="/terms" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms</Link>
                            {' '}and{' '}
                            <Link href="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
                        </p>
                    </form>

                    <div className="auth-form-footer">
                        <p>
                            Already have an account?{' '}
                            <Link href="/login" className="auth-link">Sign in</Link>
                        </p>
                        <Link href="/" className="auth-link-muted">← Back to home</Link>
                    </div>
                </div>
            </div>

            {/* ---- Left Visual Panel ---- */}
            <div className="auth-visual">
                <div className="auth-visual-orbs">
                    <div className="av-orb av-orb-1" />
                    <div className="av-orb av-orb-2" />
                    <div className="av-orb av-orb-3" />
                </div>
                <div className="auth-visual-content">
                    <div className="auth-visual-logo">
                        <img src="/logo.png" alt="YourFriendsLeague" style={{ height: '120px', width: 'auto' }} />
                    </div>
                    <h2 className="auth-visual-headline">
                        Join the<br />prediction<br /><span className="gradient-text">arena.</span>
                    </h2>
                    <ul className="auth-perks">
                        {perks.map((p, i) => (
                            <li key={i} className="auth-perk">{p}</li>
                        ))}
                    </ul>
                    <p className="auth-visual-sub" style={{ marginTop: '2rem' }}>
                        Already thousands of fans compete daily. Your predictions start today.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}>
            <SignupPageInner />
        </Suspense>
    );
}
