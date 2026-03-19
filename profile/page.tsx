'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
                setEditForm({
                    username: data.username,
                    bio: data.bio || '',
                    avatarUrl: data.avatarUrl || ''
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'The profile API failed to return data' });
            }
        } catch (error: any) {
            console.error('Fetch profile error:', error);
            setMessage({ type: 'error', text: 'Connection to profile API failed: ' + (error.message || 'Unknown error') });
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/user/profile/history');
            const data = await res.json();
            if (res.ok) {
                setHistory(data);
            }
        } catch (error) {
            console.error('Fetch history error:', error);
        }
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
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setShowEdit(false);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setUpdating(false);
        }
    };

    const handleUpgrade = async (action: 'simulate_payment' | 'upgrade_premium') => {
        setUpdating(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch('/api/user/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (res.ok) {
                if (action === 'simulate_payment') {
                    await update({ isPaid: true });
                    setProfile(prev => prev ? { ...prev, isPaid: true } : null);
                    setMessage({ type: 'success', text: 'Payment simulated! You can now upgrade.' });
                } else {
                    await update({ role: 'premium' });
                    setProfile(prev => prev ? { ...prev, role: 'premium' } : null);
                    setMessage({ type: 'success', text: 'Welcome to Premium!' });
                }
            } else {
                setMessage({ type: 'error', text: data.error || 'Action failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setUpdating(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className="container" style={{ paddingTop: '4rem' }}><div className="loading" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }}></div></div>;
    }

    if (!profile) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <div className="card">
                    <h2 style={{ color: '#f5576c' }}>Oops! Error Loading Profile</h2>
                    <p className="text-muted mb-2">{message.text || 'Could not retrieve your profile data.'}</p>
                    {message.text && (
                        <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', color: '#666' }}>
                            Error: {message.text}
                        </div>
                    )}
                    <div className="flex justify-center gap-1">
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
                        <Link href="/tournaments" className="btn btn-secondary">Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            {/* Header Section */}
            <div className="card mb-3" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
                <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                border: '4px solid rgba(255, 255, 255, 0.3)',
                                overflow: 'hidden'
                            }}>
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    profile.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            {profile.currentStreak > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-5px',
                                    right: '-5px',
                                    background: '#ff4757',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                }}>
                                    🔥 {profile.currentStreak}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{profile.username}</h1>
                                {(profile.role === 'premium' || profile.role === 'admin') && (
                                    <span className="badge badge-success" style={{ background: '#ffa502', border: 'none' }}>PREMIUM</span>
                                )}
                            </div>
                            <p style={{ opacity: 0.8, maxWidth: '400px', margin: '0.5rem 0' }}>{profile.bio || 'Guessing goals and winning souls.'}</p>
                            <div className="flex gap-1">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>Edit Profile</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => signOut()} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>Sign Out</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                        <Link href="/tournaments" className="btn btn-secondary btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>Tournaments</Link>
                        {(profile.role === 'premium' || profile.role === 'admin') && (
                            <Link href="/premium" className="btn btn-success btn-sm" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                🚀 Manage Matches
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`badge badge-${message.type === 'success' ? 'success' : 'error'} mb-2`} style={{ width: '100%', padding: '1rem', textAlign: 'center' }}>
                    {message.text}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-4 mb-3" style={{ gap: 'var(--spacing-md)' }}>
                <div className="card text-center" style={{ padding: 'var(--spacing-md)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Streak</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff4757' }}>{profile.currentStreak} 🔥</div>
                </div>
                <div className="card text-center" style={{ padding: 'var(--spacing-md)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Best Streak</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffa502' }}>{profile.bestStreak} ⭐</div>
                </div>
                <div className="card text-center" style={{ padding: 'var(--spacing-md)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Accuracy</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2ed573' }}>{profile.accuracy}% 🎯</div>
                </div>
                <div className="card text-center" style={{ padding: 'var(--spacing-md)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Points</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{(profile.leagues || []).reduce((sum, l) => sum + (Number(l.totalPoints) || 0), 0)} 🏆</div>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: 'var(--spacing-lg)', alignItems: 'start' }}>
                <div className="flex flex-col gap-3">
                    {/* My Leagues */}
                    <div className="card">
                        <h2 className="section-title">My Leagues</h2>
                        <div className="flex flex-col gap-2">
                            {profile.leagues.length === 0 ? (
                                <p className="text-muted">You haven't joined any leagues yet.</p>
                            ) : (
                                profile.leagues.map(league => (
                                    <div key={league.id} className="flex justify-between items-center p-2" style={{ background: 'var(--card-bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{league.name}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{league.participantCount} friends • Rank #{league.rank}</div>
                                        </div>
                                        <div className="text-right">
                                            <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{league.totalPoints} pts</div>
                                            <Link href={`/tournaments?id=${league.id}`} style={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}>View</Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="card">
                        <h2 className="section-title">Achievements</h2>
                        <div className="grid grid-4" style={{ gap: 'var(--spacing-sm)' }}>
                            {profile.achievements.map(ach => (
                                <div key={ach.id} className="text-center" title={ach.description}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{ach.iconUrl}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600 }}>{ach.name}</div>
                                </div>
                            ))}
                            {profile.achievements.length === 0 && (
                                <div className="text-muted" style={{ gridColumn: 'span 4' }}>Keep playing to unlock achievements!</div>
                            )}
                        </div>
                    </div>

                    {/* Premium Section */}
                    {profile.role === 'user' && (
                        <div className="card" style={{ background: 'rgba(255, 165, 2, 0.1)', border: '1px dashed #ffa502' }}>
                            <h2 className="section-title" style={{ color: '#ffa502' }}>Upgrade to Premium</h2>
                            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Get visual badges, create unlimited leagues, and track detailed stats!</p>
                            {!profile.isPaid ? (
                                <button className="btn btn-primary" onClick={() => handleUpgrade('simulate_payment')} disabled={updating}>
                                    {updating ? 'Processing...' : 'Simulate Payment ($9.99)'}
                                </button>
                            ) : (
                                <button className="btn btn-success" onClick={() => handleUpgrade('upgrade_premium')} disabled={updating}>
                                    {updating ? 'Upgrading...' : 'Activate Premium'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Prediction History */}
                <div className="card">
                    <h2 className="section-title">Recent Activity</h2>
                    <div className="flex flex-col gap-2">
                        {history.length === 0 ? (
                            <p className="text-muted">No predictions yet.</p>
                        ) : (
                            history.map(item => (
                                <div key={item.id} className="flex flex-col p-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)' }}>{item.tournamentName} • {item.sport}</span>
                                        <span className={`badge ${item.points !== null && item.points > 0 ? 'badge-success' : item.points === 0 ? 'badge-error' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                                            {item.points !== null ? `+${item.points} pts` : 'Pending'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <div style={{ fontSize: '0.875rem' }}>{item.teamA} vs {item.teamB}</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                            {item.predA}-{item.predB}
                                            <span style={{ marginLeft: '4px', opacity: 0.5 }}>
                                                ({item.isFinished ? `${item.actualA}-${item.actualB}` : '?-?'})
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal (Simplified overlay) */}
            {showEdit && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        <h2 className="section-title">Edit Profile</h2>
                        <form onSubmit={handleUpdateProfile}>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input
                                    className="input"
                                    value={editForm.username}
                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Avatar URL</label>
                                <input
                                    className="input"
                                    placeholder="https://..."
                                    value={editForm.avatarUrl}
                                    onChange={e => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bio</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={editForm.bio}
                                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-1 mt-2">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={updating}>Save Changes</button>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEdit(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
