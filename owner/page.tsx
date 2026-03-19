'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface User { id: string; username: string; email: string; role: string; created_at: number; }
interface Tournament { id: string; name: string; sport: string; league_type: string; join_code: string; creator_name: string; created_at: number; is_active: number; }
interface Stats { users: number; tournaments: number; matches: number; predictions: number; }

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? '';

export default function OwnerPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [accessDenied, setAccessDenied] = useState(false);
    const [tab, setTab] = useState<'stats' | 'users' | 'tournaments'>('stats');
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingRole, setSavingRole] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') { router.push('/login'); return; }
        if (status === 'authenticated') {
            const email = (session?.user as any)?.email;
            if (!OWNER_EMAIL || email !== OWNER_EMAIL) {
                setAccessDenied(true);
                return;
            }
            loadStats();
        }
    }, [status, session]);

    const loadStats = async () => {
        setLoading(true);
        const res = await fetch('/api/owner?section=stats');
        if (!res.ok) { setAccessDenied(true); return; }
        setStats(await res.json());
        setLoading(false);
    };

    const loadUsers = async () => {
        const res = await fetch('/api/owner?section=users');
        if (res.ok) setUsers(await res.json());
    };

    const loadTournaments = async () => {
        const res = await fetch('/api/owner?section=tournaments');
        if (res.ok) setTournaments(await res.json());
    };

    const handleTabChange = (t: typeof tab) => {
        setTab(t);
        if (t === 'users') loadUsers();
        if (t === 'tournaments') loadTournaments();
    };

    const updateRole = async (userId: string, role: string) => {
        setSavingRole(userId);
        const res = await fetch('/api/owner', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role }),
        });
        if (res.ok) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        }
        setSavingRole(null);
    };

    const deleteTournament = async (id: string) => {
        if (!confirm('Delete this tournament? This cannot be undone.')) return;
        const res = await fetch(`/api/owner?tournamentId=${id}`, { method: 'DELETE' });
        if (res.ok) setTournaments(prev => prev.filter(t => t.id !== id));
    };

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '3rem' }}>
                    <div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="app-page"><Navbar />
                <div className="container">
                    <div className="empty-state" style={{ paddingTop: '6rem' }}>
                        <div className="empty-state-icon">🚫</div>
                        <h3>Access Denied</h3>
                        <p>This area is restricted to the site owner only.</p>
                        <Link href="/tournaments" className="btn btn-secondary">← Back to Leagues</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                {/* Owner Header */}
                <div className="owner-header" style={{ marginTop: '2rem' }}>
                    <div className="owner-crown">👑</div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Owner Control Panel</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                            Full platform management — only you can see this
                        </p>
                    </div>
                </div>

                {/* Stat Cards */}
                {stats && (
                    <div className="owner-stat-grid">
                        {[
                            { label: 'Total Users', value: stats.users, icon: '👥' },
                            { label: 'Tournaments', value: stats.tournaments, icon: '🏆' },
                            { label: 'Matches', value: stats.matches, icon: '⚽' },
                            { label: 'Predictions', value: stats.predictions, icon: '🎯' },
                        ].map(s => (
                            <div key={s.label} className="owner-stat-card">
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                                <div className="owner-stat-value">{s.value}</div>
                                <div className="owner-stat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div className="tab-bar">
                    <button className={`tab-btn ${tab === 'stats' ? 'tab-btn-active' : ''}`} onClick={() => handleTabChange('stats')}>
                        📊 Overview
                    </button>
                    <button className={`tab-btn ${tab === 'users' ? 'tab-btn-active' : ''}`} onClick={() => handleTabChange('users')}>
                        👥 Users
                    </button>
                    <button className={`tab-btn ${tab === 'tournaments' ? 'tab-btn-active' : ''}`} onClick={() => handleTabChange('tournaments')}>
                        🏆 Tournaments
                    </button>
                </div>

                {/* Users Management */}
                {tab === 'users' && (
                    <div className="owner-section">
                        <div className="owner-section-title">👥 All Users ({users.length})</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td><strong style={{ color: 'var(--text-primary)' }}>{u.username}</strong></td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className={`badge ${u.role === 'admin' ? 'badge-admin' : u.role === 'premium' ? 'badge-premium' : ''}`}
                                                    style={u.role === 'user' ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' } : {}}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>{new Date(u.created_at * 1000).toLocaleDateString()}</td>
                                            <td>
                                                <select
                                                    className="role-select"
                                                    value={u.role}
                                                    onChange={e => updateRole(u.id, e.target.value)}
                                                    disabled={savingRole === u.id}
                                                >
                                                    <option value="user">user</option>
                                                    <option value="premium">premium</option>
                                                    <option value="admin">admin</option>
                                                </select>
                                                {savingRole === u.id && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>saving…</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tournaments Management */}
                {tab === 'tournaments' && (
                    <div className="owner-section">
                        <div className="owner-section-title">🏆 All Tournaments ({tournaments.length})</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Sport</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Code</th>
                                        <th>Creator</th>
                                        <th>Created</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tournaments.map(t => (
                                        <tr key={t.id}>
                                            <td><strong style={{ color: 'var(--text-primary)' }}>{t.name}</strong></td>
                                            <td>{t.sport}</td>
                                            <td>
                                                <span className={t.league_type === 'open' ? 'league-badge-open' : 'league-badge-private'}>
                                                    {t.league_type === 'open' ? '🌍 Open' : '🔒 Private'}
                                                </span>
                                            </td>
                                            <td>
                                                {t.is_active ? (
                                                    <span style={{ color: '#48bb78', fontSize: '0.85rem', fontWeight: 600 }}>🟢 Active</span>
                                                ) : (
                                                    <span style={{ color: '#f56565', fontSize: '0.85rem', fontWeight: 600 }}>🏁 Closed</span>
                                                )}
                                            </td>
                                            <td><code style={{ fontFamily: 'monospace', color: '#667eea' }}>{t.join_code}</code></td>
                                            <td>{t.creator_name}</td>
                                            <td>{new Date(t.created_at * 1000).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                                                    onClick={() => deleteTournament(t.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Overview info */}
                {tab === 'stats' && (
                    <div className="owner-section">
                        <div className="owner-section-title">💡 How the Owner Panel Works</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <p>🔑 <strong>Access is tied to your email address</strong> (<code style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{OWNER_EMAIL || 'OWNER_EMAIL not set in .env.local'}</code>). No one else can access this page.</p>
                            <p>👥 <strong>Users tab</strong> — Promote users to Premium or Admin, downgrade back to User. Changes take effect immediately on next login.</p>
                            <p>🏆 <strong>Tournaments tab</strong> — View and delete any tournament across the platform regardless of who created it.</p>
                            <p>⚙️ To change the owner email, update <code style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>OWNER_EMAIL</code> in your <code style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>.env.local</code> file and restart the server.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
