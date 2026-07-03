'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface ProfileData {
    id: string;
    username: string;
    email: string;
    role: string;
    isPaid: boolean;
    avatarUrl?: string;
    bio?: string;
    bestStreak: number;
    currentStreak: number;
    accuracy: number;
    totalPredictions: number;
    leagues: League[];
    achievements: Achievement[];
    subscriptionStatus?: string | null;
    subscriptionPlan?: 'monthly' | 'yearly' | null;
    currentPeriodEnd?: number | null;
}

interface League {
    id: string;
    name: string;
    participantCount: number;
    rank: number;
    totalPoints: number | string;
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    unlockedAt: string;
}

interface PredictionHistory {
    id: string;
    predA: number;
    predB: number;
    actualA: number;
    actualB: number;
    isFinished: boolean;
    teamA: string;
    teamB: string;
    points: number | null;
    tournamentName: string;
    scheduledTime: number;
    sport: string;
}

// Sport emoji avatars for the picker
const SPORT_AVATARS = [
    '⚽', '🏒', '🎾', '🏀', '🏐', '⚾',
    '🏎️', '🏍️', '🏆', '🎯', '🥅', '🏅',
    '🦅', '🦁', '🐺', '🦊', '⚡', '🔥',
];

// Render avatar — if it's an emoji (short, no http), show as emoji; else as img
function AvatarDisplay({ avatarUrl, username, size = 80, fontSize = '2rem' }: { avatarUrl?: string | null; username: string; size?: number; fontSize?: string }) {
    const isEmoji = avatarUrl && !avatarUrl.startsWith('http') && avatarUrl.length <= 8;
    const isUrl = avatarUrl && avatarUrl.startsWith('http');

    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: isEmoji || !avatarUrl ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize, fontWeight: 700, color: 'white',
            border: '3px solid rgba(255,255,255,0.2)',
            overflow: 'hidden', flexShrink: 0,
        }}>
            {isUrl ? (
                <img src={avatarUrl!} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : isEmoji ? (
                <span style={{ lineHeight: 1 }}>{avatarUrl}</span>
            ) : (
                username.charAt(0).toUpperCase()
            )}
        </div>
    );
}

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [history, setHistory] = useState<PredictionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', bio: '', avatarUrl: '' });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchProfile();
            fetchHistory();
        }
    }, [status, router]);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            const data = await res.json();
            if (res.ok) {
                setProfile(data);
                setEditForm({ username: data.username, bio: data.bio || '', avatarUrl: data.avatarUrl || '' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to load profile' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Connection error: ' + (error.message || 'Unknown') });
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/user/profile/history');
            if (res.ok) setHistory(await res.json());
        } catch { /* ignore */ }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(prev => prev ? { ...prev, ...data } : null);
                await update({ name: data.username });
                setMessage({ type: 'success', text: '✅ Profile updated!' });
                setShowEdit(false);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update' });
            }
        } catch {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setUpdating(false);
        }
    };

    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [upgrading, setUpgrading] = useState<'monthly' | 'yearly' | null>(null);
    const [managing, setManaging] = useState(false);

    // Account deletion state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Handle return from Stripe Checkout + auto-start flow from signup intent
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('upgrade') === 'success') {
            setMessage({ type: 'success', text: '🎉 Welcome to Premium! Your subscription is being activated.' });
            // Refetch profile after a short delay to pick up webhook-driven state changes
            setTimeout(() => fetchProfile(), 1500);
            window.history.replaceState({}, '', '/profile');
        } else if (params.get('upgrade') === 'cancelled') {
            setMessage({ type: 'error', text: 'Upgrade cancelled — no charges were made.' });
            window.history.replaceState({}, '', '/profile');
        } else {
            // Auto-start checkout if user just signed up with a plan intent
            const startCheckoutParam = params.get('startCheckout');
            if (startCheckoutParam === 'monthly' || startCheckoutParam === 'yearly') {
                window.history.replaceState({}, '', '/profile');
                // Wait until profile data has loaded before firing
                const timer = setInterval(() => {
                    if (profile) {
                        clearInterval(timer);
                        // Only auto-start if user isn't already premium
                        if (profile.role === 'user') {
                            startCheckout(startCheckoutParam as 'monthly' | 'yearly');
                        }
                    }
                }, 200);
                // Safety: give up after 8s
                setTimeout(() => clearInterval(timer), 8000);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const startCheckout = async (plan: 'monthly' | 'yearly') => {
        setUpgrading(plan);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url; // hand off to Stripe
                return;
            }
            setMessage({ type: 'error', text: data.error || 'Could not start checkout' });
        } catch {
            setMessage({ type: 'error', text: 'Network error — please try again' });
        } finally {
            setUpgrading(null);
        }
    };

    const openBillingPortal = async () => {
        setManaging(true);
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
                return;
            }
            setMessage({ type: 'error', text: data.error || 'Could not open billing portal' });
        } catch {
            setMessage({ type: 'error', text: 'Network error — please try again' });
        } finally {
            setManaging(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!profile) return;
        setDeleting(true);
        setDeleteError('');
        try {
            const res = await fetch('/api/user/profile/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmation: deleteConfirmation }),
            });
            const data = await res.json();
            if (res.ok) {
                // Sign out + redirect to landing
                await signOut({ callbackUrl: '/' });
            } else {
                setDeleteError(data.error || 'Could not delete account');
                setDeleting(false);
            }
        } catch {
            setDeleteError('Network error — please try again');
            setDeleting(false);
        }
    };

    const closeDeleteModal = () => {
        if (deleting) return;
        setShowDeleteModal(false);
        setDeleteConfirmation('');
        setDeleteError('');
    };

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    <div className="loading" style={{ height: '220px', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem' }}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="loading" style={{ height: '80px', borderRadius: 'var(--radius-md)' }} />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 400, margin: '0 auto' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
                        <h2 style={{ color: '#f5576c', marginBottom: '0.5rem' }}>Error Loading Profile</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{message.text || 'Could not retrieve your profile data.'}</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
                            <Link href="/tournaments" className="btn btn-secondary">← Leagues</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const roleLabel = profile.role === 'admin' ? 'Admin' : profile.role === 'premium' ? 'Premium' : null;
    const totalPoints = (profile.leagues || []).reduce((sum, l) => sum + (Number(l.totalPoints) || 0), 0);

    return (
        <div className="app-page">
            <Navbar />
            <div className="container" style={{ paddingBottom: '4rem' }}>

                {/* ── Profile Hero ── */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e2a4a 0%, #0f172a 100%)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative glow */}
                    <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(102,126,234,0.15)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative' }}>
                            <AvatarDisplay avatarUrl={profile.avatarUrl} username={profile.username} size={88} fontSize='2.2rem' />
                            {profile.currentStreak > 0 && (
                                <div style={{
                                    position: 'absolute', bottom: -4, right: -4,
                                    background: '#ff4757', color: 'white',
                                    padding: '2px 7px', borderRadius: '12px',
                                    fontSize: '0.72rem', fontWeight: 700,
                                    boxShadow: '0 2px 8px rgba(255,71,87,0.4)',
                                }}>🔥 {profile.currentStreak}</div>
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                                <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{profile.username}</h1>
                                {roleLabel && (
                                    <span style={{
                                        background: profile.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)',
                                        color: profile.role === 'admin' ? '#ef4444' : '#f97316',
                                        border: `1px solid ${profile.role === 'admin' ? 'rgba(239,68,68,0.4)' : 'rgba(249,115,22,0.4)'}`,
                                        padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                                    }}>{profile.role === 'admin' ? '🛡️' : '💎'} {roleLabel}</span>
                                )}
                            </div>
                            {profile.bio ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>{profile.bio}</p>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem', fontStyle: 'italic', opacity: 0.7 }}>
                                    No bio yet — <button
                                        type="button"
                                        onClick={() => setShowEdit(true)}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, font: 'inherit', fontStyle: 'italic', textDecoration: 'underline' }}
                                    >add one</button>
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit Profile</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => signOut({ callbackUrl: '/' })}>Sign Out</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success / Error message */}
                {message.text && (
                    <div style={{
                        padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
                        background: message.type === 'success' ? 'rgba(72,187,120,0.1)' : 'rgba(245,101,101,0.1)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(72,187,120,0.3)' : 'rgba(245,101,101,0.3)'}`,
                        color: message.type === 'success' ? '#48bb78' : '#f56565',
                        fontSize: '0.88rem', fontWeight: 600,
                    }}>
                        {message.text}
                    </div>
                )}

                {/* ── Stats row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Current Streak', value: `${profile.currentStreak} 🔥`, color: '#ff4757' },
                        { label: 'Best Streak', value: `${profile.bestStreak} ⭐`, color: '#ffa502' },
                        { label: 'Accuracy', value: `${profile.accuracy}% 🎯`, color: '#2ed573' },
                        { label: 'Total Points', value: `${totalPoints} 🏆`, color: 'var(--color-primary)' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)', padding: '1rem',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>{s.label}</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Two-col grid ── */}
                <div className="profile-two-col">

                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* My Leagues */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>🏆 My Leagues</h2>
                            {profile.leagues.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No leagues joined yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {profile.leagues.map(league => (
                                        <div key={league.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{league.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{league.participantCount} players · Rank #{league.rank}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>{league.totalPoints} pts</div>
                                                <Link href={`/predictions/${league.id}`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>View →</Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Achievements */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>🏅 Achievements</h2>
                            {profile.achievements.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Keep playing to unlock achievements!</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {profile.achievements.map(ach => (
                                        <div key={ach.id} style={{ textAlign: 'center' }} title={ach.description}>
                                            <div style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>{ach.iconUrl}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>{ach.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Premium subscription panel — shows upgrade OR manage state */}
                        {profile.role === 'user' && (
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(56,189,248,0.06), rgba(129,140,248,0.04))',
                                border: '1px solid rgba(56,189,248,0.3)',
                                borderRadius: 'var(--radius-lg)', padding: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                    <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                                        💎 Upgrade to Premium
                                    </h2>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                                    Create leagues, import tournament presets, see community stats, and manage matches.
                                </p>

                                {/* Pricing options */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <button
                                        onClick={() => startCheckout('monthly')}
                                        disabled={!!upgrading}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: 'var(--radius-md)', padding: '0.85rem',
                                            cursor: upgrading ? 'wait' : 'pointer', textAlign: 'left',
                                            transition: 'all 0.15s', color: 'var(--text-primary)',
                                            opacity: upgrading && upgrading !== 'monthly' ? 0.5 : 1,
                                        }}
                                    >
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>MONTHLY</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>€4.99<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span></div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{upgrading === 'monthly' ? 'Redirecting…' : 'Cancel anytime'}</div>
                                    </button>
                                    <button
                                        onClick={() => startCheckout('yearly')}
                                        disabled={!!upgrading}
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(129,140,248,0.08))',
                                            border: '1px solid rgba(56,189,248,0.4)',
                                            borderRadius: 'var(--radius-md)', padding: '0.85rem',
                                            cursor: upgrading ? 'wait' : 'pointer', textAlign: 'left', position: 'relative',
                                            transition: 'all 0.15s', color: 'var(--text-primary)',
                                            boxShadow: '0 0 25px rgba(56,189,248,0.12)',
                                            opacity: upgrading && upgrading !== 'yearly' ? 0.5 : 1,
                                        }}
                                    >
                                        <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.08em', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(72,187,120,0.18)', color: '#7eebac', border: '1px solid rgba(72,187,120,0.35)' }}>2 MO FREE</span>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>YEARLY</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>€49.99<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/yr</span></div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{upgrading === 'yearly' ? 'Redirecting…' : 'Save €9.89'}</div>
                                    </button>
                                </div>

                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>
                                    Secure checkout by Stripe · By subscribing you agree to our{' '}
                                    <Link href="/terms" style={{ color: 'var(--color-primary)' }}>Terms</Link>
                                </p>
                            </div>
                        )}

                        {/* Manage subscription panel — shown to active subscribers */}
                        {profile.role === 'premium' && profile.subscriptionStatus && (
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(56,189,248,0.07), rgba(129,140,248,0.04))',
                                border: '1px solid rgba(56,189,248,0.3)',
                                borderRadius: 'var(--radius-lg)', padding: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <h2 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>💎 Premium Active</h2>
                                    <span style={{
                                        fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em',
                                        padding: '0.15rem 0.5rem', borderRadius: 6,
                                        background: profile.subscriptionStatus === 'active' ? 'rgba(72,187,120,0.18)' : 'rgba(249,115,22,0.18)',
                                        color: profile.subscriptionStatus === 'active' ? '#7eebac' : '#fdba74',
                                        border: `1px solid ${profile.subscriptionStatus === 'active' ? 'rgba(72,187,120,0.35)' : 'rgba(249,115,22,0.35)'}`,
                                        textTransform: 'uppercase',
                                    }}>{profile.subscriptionStatus}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                                    <div>Plan: <strong style={{ color: 'var(--text-primary)' }}>{profile.subscriptionPlan === 'yearly' ? 'Yearly (€49.99/year)' : 'Monthly (€4.99/month)'}</strong></div>
                                    {profile.currentPeriodEnd && (
                                        <div>{profile.subscriptionStatus === 'active' ? 'Renews' : 'Ends'}: <strong style={{ color: 'var(--text-primary)' }}>{new Date(profile.currentPeriodEnd * 1000).toLocaleDateString()}</strong></div>
                                    )}
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={openBillingPortal}
                                    disabled={managing}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    {managing ? 'Opening portal…' : '⚙️ Manage Subscription'}
                                </button>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center', marginTop: '0.75rem' }}>
                                    Update card, change plan, view invoices, or cancel — all via Stripe.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right column — Prediction History */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>📋 Recent Activity</h2>
                        {history.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No predictions yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {history.map((item, i) => (
                                    <div key={item.id} style={{ padding: '0.7rem 0', borderBottom: i < history.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>{item.tournamentName}</span>
                                            <span style={{
                                                fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px',
                                                background: item.points !== null && item.points > 0 ? 'rgba(72,187,120,0.15)' : item.points === 0 ? 'rgba(245,101,101,0.12)' : 'rgba(56,189,248,0.12)',
                                                color: item.points !== null && item.points > 0 ? '#48bb78' : item.points === 0 ? '#f56565' : 'var(--color-primary)',
                                            }}>
                                                {item.points !== null ? `+${item.points} pts` : 'Pending'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.teamA} vs {item.teamB}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {item.predA}–{item.predB}
                                                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                                                    ({item.isFinished ? `${item.actualA}–${item.actualB}` : '?–?'})
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Danger Zone — Account Deletion ── */}
                <div style={{
                    marginTop: '3rem',
                    background: 'rgba(245,87,108,0.05)',
                    border: '1px solid rgba(245,87,108,0.25)',
                    borderRadius: 'var(--radius-lg)', padding: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: 0, color: '#f5576c' }}>
                            ⚠️ Danger Zone
                        </h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                        Permanently delete your account, predictions, and league memberships. Any active Premium subscription will be cancelled immediately.
                        <strong style={{ color: 'var(--text-primary)' }}> This action cannot be undone.</strong>
                    </p>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        style={{
                            background: 'rgba(245,87,108,0.1)',
                            border: '1px solid rgba(245,87,108,0.4)',
                            color: '#f5576c',
                            fontWeight: 700, fontSize: '0.85rem',
                            padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,87,108,0.18)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,87,108,0.1)'; }}
                    >
                        🗑 Delete my account
                    </button>
                </div>
            </div>

            {/* ── Delete Account Confirmation Modal ── */}
            {showDeleteModal && profile && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1100, padding: '1rem',
                }} onClick={closeDeleteModal}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                        border: '1px solid rgba(245,87,108,0.35)',
                        borderRadius: 'var(--radius-lg)', padding: '2rem',
                        width: '100%', maxWidth: 480,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(245,87,108,0.12)',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: 'rgba(245,87,108,0.15)',
                            border: '1px solid rgba(245,87,108,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.75rem', marginBottom: '1rem',
                        }}>⚠️</div>

                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                            Delete your account?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                            This permanently removes:
                        </p>
                        <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1.25rem', paddingLeft: '1.25rem' }}>
                            <li>Your profile, predictions, and history</li>
                            <li>Your memberships in all leagues</li>
                            <li>All leagues you've created (and their members&apos; data within them)</li>
                            <li>Any active Premium subscription — billing stops immediately</li>
                        </ul>

                        <div style={{
                            background: 'rgba(245,87,108,0.08)', border: '1px solid rgba(245,87,108,0.25)',
                            borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem',
                            fontSize: '0.82rem', color: '#f5576c', lineHeight: 1.55,
                        }}>
                            <strong>Type your username</strong> (<code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: 4, color: 'var(--text-primary)' }}>{profile.username}</code>) <strong>to confirm:</strong>
                        </div>

                        <label htmlFor="delete-confirmation" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                            Confirm deletion by typing your username
                        </label>
                        <input
                            id="delete-confirmation"
                            type="text"
                            className="input"
                            placeholder={profile.username}
                            value={deleteConfirmation}
                            onChange={e => setDeleteConfirmation(e.target.value)}
                            disabled={deleting}
                            autoComplete="off"
                            autoFocus
                            style={{ marginBottom: '1rem', fontFamily: 'ui-monospace, monospace' }}
                            aria-label={`Type your username (${profile.username}) to confirm deletion`}
                        />

                        {deleteError && (
                            <div style={{
                                padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
                                background: 'rgba(245,87,108,0.12)', border: '1px solid rgba(245,87,108,0.3)',
                                color: '#f5576c', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem',
                            }}>{deleteError}</div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleting || deleteConfirmation !== profile.username}
                                style={{
                                    flex: 1, padding: '0.7rem',
                                    background: deleteConfirmation === profile.username && !deleting ? '#f5576c' : 'rgba(245,87,108,0.3)',
                                    color: '#ffffff', fontWeight: 700, fontSize: '0.88rem',
                                    border: 'none', borderRadius: 'var(--radius-md)',
                                    cursor: deleteConfirmation === profile.username && !deleting ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s', opacity: deleting ? 0.7 : 1,
                                }}
                            >
                                {deleting ? 'Deleting…' : 'Permanently delete account'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Premium Coming-Soon Modal ── */}
            {showPremiumModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem',
                }} onClick={() => setShowPremiumModal(false)}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                        border: '1px solid rgba(56,189,248,0.3)',
                        borderRadius: 'var(--radius-lg)', padding: '2rem',
                        width: '100%', maxWidth: 460,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(56,189,248,0.12)',
                        textAlign: 'center',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 16,
                            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', marginBottom: '1.25rem',
                            boxShadow: '0 0 40px rgba(56,189,248,0.4)',
                        }}>💎</div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            Premium is on the way
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            We're wiring up secure payments. Once it's live you'll be able to upgrade and unlock:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                            {[
                                'Create private & public leagues',
                                'One-click import of tournament presets (IIHF, FIFA WC, etc.)',
                                'See community prediction breakdowns before kick-off',
                                'Add and manage matches, enter final scores',
                                '💎 Premium badge on your profile',
                            ].map(f => (
                                <div key={f} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.86rem' }}>
                                    <span style={{ color: '#48bb78', fontWeight: 700, flexShrink: 0 }}>✓</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Want early access? Drop us a line and we'll let you know the moment it's live.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a href="mailto:contact@yourfriendleague.com?subject=YourFriendsLeague Premium — early access"
                                className="btn btn-primary">📬 Notify Me</a>
                            <button className="btn btn-secondary" onClick={() => setShowPremiumModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Profile Modal ── */}
            {showEdit && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem',
                }} onClick={() => setShowEdit(false)}>
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)', padding: '1.75rem',
                        width: '100%', maxWidth: 480,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>✏️ Edit Profile</h2>

                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Username */}
                            <div>
                                <label htmlFor="profile-username" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Username</label>
                                <input id="profile-username" className="input" value={editForm.username}
                                    onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} required minLength={3} />
                            </div>

                            {/* Avatar picker */}
                            <div>
                                <label htmlFor="profile-avatar-url" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Avatar</label>
                                {/* Preview */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <AvatarDisplay avatarUrl={editForm.avatarUrl} username={editForm.username} size={52} fontSize='1.4rem' />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose an emoji or paste an image URL</span>
                                </div>
                                {/* Emoji grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '0.3rem', marginBottom: '0.6rem' }} role="radiogroup" aria-label="Choose an avatar emoji">
                                    {SPORT_AVATARS.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            role="radio"
                                            aria-checked={editForm.avatarUrl === emoji}
                                            aria-label={`Avatar emoji ${emoji}`}
                                            onClick={() => setEditForm(f => ({ ...f, avatarUrl: emoji }))}
                                            style={{
                                                fontSize: '1.3rem', padding: '0.3rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: editForm.avatarUrl === emoji ? '2px solid var(--color-primary)' : '2px solid transparent',
                                                background: editForm.avatarUrl === emoji ? 'rgba(56,189,248,0.15)' : 'var(--bg-tertiary)',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                aspectRatio: '1',
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                    {/* Clear avatar option */}
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={!editForm.avatarUrl}
                                        aria-label="No avatar — use initial letter"
                                        onClick={() => setEditForm(f => ({ ...f, avatarUrl: '' }))}
                                        style={{
                                            fontSize: '0.85rem', padding: '0.3rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: !editForm.avatarUrl ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            background: !editForm.avatarUrl ? 'rgba(56,189,248,0.15)' : 'var(--bg-tertiary)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            aspectRatio: '1', color: 'var(--text-muted)', fontWeight: 600,
                                        }}
                                        title="Clear avatar"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {/* URL input */}
                                <input id="profile-avatar-url" className="input" placeholder="…or paste image URL (https://…)"
                                    aria-label="Avatar image URL"
                                    value={editForm.avatarUrl.startsWith('http') ? editForm.avatarUrl : ''}
                                    onChange={e => setEditForm(f => ({ ...f, avatarUrl: e.target.value }))}
                                    style={{ fontSize: '0.82rem' }} />
                            </div>

                            {/* Bio */}
                            <div>
                                <label htmlFor="profile-bio" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Bio</label>
                                <textarea id="profile-bio" className="input" rows={2} placeholder="Tell your rivals who you are…"
                                    value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={updating}>
                                    {updating ? 'Saving…' : '💾 Save Changes'}
                                </button>
                                <button className="btn btn-secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
