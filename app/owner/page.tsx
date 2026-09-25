'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface User { id: string; username: string; email: string; role: string; created_at: number; }
interface Tournament { id: string; name: string; sport: string; league_type: string; join_code: string; creator_name: string; created_at: number; is_active: number; }
interface Stats { users: number; tournaments: number; matches: number; predictions: number; }
interface ApiLeague { id: number; name: string; sport: string; provider: string; external_id: number; season: number; country: string; logo_url: string; match_count: number; synced_at: number; }

type SyncSource = 'api-sports-hockey' | 'api-sports-football' | 'nhl' | 'jolpica-f1';

export default function OwnerPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [accessDenied, setAccessDenied] = useState(false);
    const [tab, setTab] = useState<'stats' | 'users' | 'tournaments' | 'api'>('stats');
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [apiLeagues, setApiLeagues] = useState<ApiLeague[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingRole, setSavingRole] = useState<string | null>(null);
    // API Leagues form
    const [syncSource, setSyncSource] = useState<SyncSource>('nhl');
    const [syncLeagueId, setSyncLeagueId] = useState('');
    const [syncSeason, setSyncSeason] = useState(new Date().getFullYear().toString());
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [resyncingId, setResyncingId] = useState<number | null>(null);
    const [migrated, setMigrated] = useState(false);
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') { router.push('/login'); return; }
        if (status === 'authenticated') {
            loadStats();
        }
    }, [status, session]);

    const loadStats = async () => {
        setLoading(true);
        const res = await fetch('/api/owner?section=stats');
        if (!res.ok) { setAccessDenied(true); setLoading(false); return; }
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

    const loadApiLeagues = async () => {
        const res = await fetch('/api/owner/api-leagues');
        if (res.ok) setApiLeagues(await res.json());
    };

    const runMigration = async () => {
        setMigrating(true);
        const res = await fetch('/api/owner/migrate', { method: 'POST' });
        const data = await res.json();
        setMigrated(res.ok);
        setSyncMsg(res.ok ? '✅ DB migration complete — tables ready.' : `❌ ${data.error}`);
        setMigrating(false);
    };

    const syncLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        setSyncing(true);
        setSyncMsg('');
        const body: Record<string, unknown> = { season: Number(syncSeason) };
        if (syncSource === 'nhl') {
            body.provider = 'nhl';
        } else if (syncSource === 'jolpica-f1') {
            body.provider = 'jolpica-f1';
        } else {
            body.provider = 'api-sports';
            body.sport = syncSource === 'api-sports-football' ? 'Football' : 'Ice Hockey';
            body.leagueId = Number(syncLeagueId);
        }
        const res = await fetch('/api/owner/api-leagues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            const unit = syncSource === 'jolpica-f1' ? 'races' : 'matches';
            setSyncMsg(`✅ Synced "${data.league.name}" — ${data.matchesSynced} ${unit} imported.`);
            loadApiLeagues();
        } else {
            setSyncMsg(`❌ ${data.error}`);
        }
        setSyncing(false);
    };

    const resyncLeague = async (id: number) => {
        setResyncingId(id);
        const res = await fetch('/api/owner/api-leagues', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (res.ok) {
            setSyncMsg(`✅ Re-synced — ${data.matchesSynced} matches updated.`);
            loadApiLeagues();
        } else {
            setSyncMsg(`❌ ${data.error}`);
        }
        setResyncingId(null);
    };

    const deleteApiLeague = async (id: number) => {
        if (!confirm('Delete this API league and all its cached matches?')) return;
        await fetch(`/api/owner/api-leagues?id=${id}`, { method: 'DELETE' });
        setApiLeagues(prev => prev.filter(l => l.id !== id));
    };

    const handleTabChange = (t: typeof tab) => {
        setTab(t);
        if (t === 'users') loadUsers();
        if (t === 'tournaments') loadTournaments();
        if (t === 'api') loadApiLeagues();
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
                    <button className={`tab-btn ${tab === 'api' ? 'tab-btn-active' : ''}`} onClick={() => handleTabChange('api')}>
                        🔗 API Leagues
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

                {/* API Leagues */}
                {tab === 'api' && (
                    <div className="owner-section">
                        <div className="owner-section-title">🔗 API-Sports Leagues</div>

                        {/* Step 1: Migration */}
                        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Step 1:</strong> First time only — run the DB migration to create the required tables.
                            </p>
                            <button className="btn btn-secondary btn-sm" onClick={runMigration} disabled={migrating || migrated}>
                                {migrating ? '⏳ Running…' : migrated ? '✅ Done' : '🛠 Run DB Migration'}
                            </button>
                        </div>

                        {/* Step 2: Sync a source */}
                        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Step 2:</strong> Sync fixtures from a source. NHL and Formula 1 are free and need no league ID.
                                {' '}<span style={{ color: 'var(--text-muted)' }}>API-Sports Hockey/Football need a league ID + season — <strong>note: our API-Sports plan is Free tier, capped to seasons 2022–2024, no current-season data.</strong></span>
                            </p>
                            <form onSubmit={syncLeague} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div>
                                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Source</label>
                                    <select
                                        className="input"
                                        style={{ width: '220px' }}
                                        value={syncSource}
                                        onChange={e => setSyncSource(e.target.value as SyncSource)}
                                    >
                                        <option value="nhl">Ice Hockey — NHL (free)</option>
                                        <option value="jolpica-f1">Formula 1 — Jolpica (free)</option>
                                        <option value="api-sports-hockey">Ice Hockey — API-Sports (2022-2024 only)</option>
                                        <option value="api-sports-football">Football — API-Sports (2022-2024 only)</option>
                                    </select>
                                </div>
                                {syncSource.startsWith('api-sports') && (
                                    <div>
                                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>League ID</label>
                                        <input
                                            className="input"
                                            style={{ width: '110px' }}
                                            type="number"
                                            placeholder="e.g. 57"
                                            value={syncLeagueId}
                                            onChange={e => setSyncLeagueId(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                                        {syncSource === 'nhl' ? 'Season start year' : 'Season'}
                                    </label>
                                    <input
                                        className="input"
                                        style={{ width: '100px' }}
                                        type="number"
                                        placeholder="2026"
                                        value={syncSeason}
                                        onChange={e => setSyncSeason(e.target.value)}
                                        required
                                    />
                                </div>
                                <button className="btn btn-primary btn-sm" type="submit" disabled={syncing} style={{ alignSelf: 'flex-end' }}>
                                    {syncing ? '⏳ Syncing…' : '↓ Sync League'}
                                </button>
                            </form>
                            {syncMsg && (
                                <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: syncMsg.startsWith('✅') ? '#48bb78' : '#f56565' }}>{syncMsg}</p>
                            )}
                        </div>

                        {/* Synced leagues list */}
                        {apiLeagues.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2rem' }}>
                                <div className="empty-state-icon">🔗</div>
                                <h3>No leagues synced yet</h3>
                                <p>Run the migration then sync your first league above.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>League</th>
                                            <th>Sport</th>
                                            <th>Provider</th>
                                            <th>Season</th>
                                            <th>Country</th>
                                            <th>Matches</th>
                                            <th>Last Sync</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apiLeagues.map(l => (
                                            <tr key={l.id}>
                                                <td><strong style={{ color: 'var(--text-primary)' }}>{l.name}</strong></td>
                                                <td>{l.sport}</td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.provider}</td>
                                                <td>{l.season}</td>
                                                <td>{l.country ?? '—'}</td>
                                                <td><span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{l.match_count}</span></td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(l.synced_at * 1000).toLocaleString()}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                                                            onClick={() => resyncLeague(l.id)}
                                                            disabled={resyncingId === l.id}
                                                        >
                                                            {resyncingId === l.id ? '⏳' : '🔄 Refresh'}
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                                                            onClick={() => deleteApiLeague(l.id)}
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                            💡 These leagues become available to tournament organisers when they create matches. Set <code style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>API_SPORTS_KEY</code> in your environment variables to enable syncing.
                        </p>
                    </div>
                )}

                {/* Overview info */}
                {tab === 'stats' && (
                    <div className="owner-section">
                        <div className="owner-section-title">💡 How the Owner Panel Works</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <p>🔑 <strong>Access is tied to your email address</strong> set in the <code style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>OWNER_EMAIL</code> environment variable. No one else can access this page.</p>
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
