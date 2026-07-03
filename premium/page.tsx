'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface Tournament {
    id: string;
    name: string;
    join_code: string;
    created_at: number;
    is_active: boolean;
    sport: string;
    league_type: string;
    description: string;
    max_participants: number;
}

interface Sport { id: string; name: string; }

const SPORT_ICONS: Record<string, string> = {
    Football: '⚽', 'Ice Hockey': '🏒', Tennis: '🎾', Basketball: '🏀',
    Volleyball: '🏐', Baseball: '⚾', 'Formula 1': '🏎️', MotoGP: '🏍️',
};
const sportIcon = (s: string) => SPORT_ICONS[s] ?? '🏅';

export default function PremiumPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createMsg, setCreateMsg] = useState('');

    const [form, setForm] = useState({
        name: '', sport: 'Ice Hockey', leagueType: 'private',
        description: '', maxParticipants: 0, customSport: '',
    });

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') { router.push('/login'); return; }
        const role = (session?.user as any)?.role;
        if (role !== 'premium' && role !== 'admin') router.push('/tournaments');
    }, [session, status, router]);

    useEffect(() => {
        if (session?.user) {
            const role = (session.user as any).role;
            if (role === 'premium' || role === 'admin') {
                fetchTournaments();
                fetchSports();
            }
        }
    }, [session]);

    const fetchTournaments = async () => {
        setLoading(true);
        const res = await fetch('/api/tournaments');
        if (res.ok) setTournaments(await res.json());
        setLoading(false);
    };

    const fetchSports = async () => {
        const res = await fetch('/api/sports');
        if (res.ok) setSports(await res.json());
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateMsg('');
        const sport = form.sport === 'custom' ? form.customSport : form.sport;
        const res = await fetch('/api/tournaments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: form.name, sport,
                league_type: form.leagueType,
                description: form.description,
                max_participants: form.maxParticipants,
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setCreateMsg('✅ League created!');
            setForm({ name: '', sport: 'Ice Hockey', leagueType: 'private', description: '', maxParticipants: 0, customSport: '' });
            setShowCreate(false);
            fetchTournaments();
        } else {
            setCreateMsg(`❌ ${data.error}`);
        }
        setCreating(false);
    };

    const toggleStatus = async (id: string, current: boolean) => {
        if (!confirm(`${current ? 'Close' : 'Reopen'} this league?`)) return;
        await fetch(`/api/tournaments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !current }),
        });
        fetchTournaments();
    };

    const user = session?.user as any;

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    {[1, 2].map(i => <div key={i} className="loading" style={{ height: '140px', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">

                {/* Header */}
                <div className="app-page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f97316, #fb923c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                            boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
                        }}>💎</div>
                        <div>
                            <h1 className="app-page-title" style={{ marginBottom: '0.1rem' }}>
                                {user?.role === 'admin' ? '🛡️ Admin Dashboard' : '💎 Premium Dashboard'}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                                Welcome back, <strong style={{ color: 'var(--text-secondary)' }}>{user?.name || user?.username}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* What Premium gives you */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1rem', marginBottom: '2.5rem',
                }}>
                    {[
                        {
                            icon: '🏆', title: 'Create Leagues',
                            desc: 'Set up private or public prediction leagues for your friends and community.',
                            color: '#38bdf8',
                        },
                        {
                            icon: '📊', title: 'Community Insights',
                            desc: 'See what percentage of players predicted each outcome before a match kicks off.',
                            color: '#818cf8',
                        },
                        {
                            icon: '⚙️', title: 'Manage Matches',
                            desc: 'Add matches, import schedules, and enter final scores to update everyone\'s points.',
                            color: '#f97316',
                        },
                        {
                            icon: '🔑', title: 'Invite Codes',
                            desc: 'Share a private join code with friends — only invited players can enter your league.',
                            color: '#48bb78',
                        },
                    ].map(f => (
                        <div key={f.title} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)', padding: '1.25rem',
                            borderTop: `3px solid ${f.color}`,
                        }}>
                            <div style={{ fontSize: '1.75rem', marginBottom: '0.6rem' }}>{f.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{f.title}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Important note about scoring */}
                <div style={{
                    background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.25)',
                    borderRadius: 'var(--radius-md)', padding: '0.9rem 1.1rem',
                    marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>ℹ️</span>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Fair play:</strong> Premium membership does not give any scoring advantage.
                        Every player earns points the same way — <strong>+5 pts</strong> exact score · <strong>+3 pts</strong> correct winner &amp; gap · <strong>+2 pts</strong> correct winner · <strong>+0 pts</strong> wrong.
                        Premium is about tools to organise and insights to enjoy, not winning more points.
                    </div>
                </div>

                {/* My Leagues section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🏆 My Leagues <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>({tournaments.length})</span>
                    </h2>
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                        + Create League
                    </button>
                </div>

                {/* Create form */}
                {showCreate && (
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem',
                    }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.05rem' }}>✨ New League</h3>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-row-2">
                                <div>
                                    <label htmlFor="league-name" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>League Name *</label>
                                    <input id="league-name" className="input" placeholder="e.g. IIHF 2026 — Friends" value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div>
                                    <label htmlFor="league-sport" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Sport *</label>
                                    <select id="league-sport" className="input" value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}>
                                        {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        <option value="custom">+ Add New Sport…</option>
                                    </select>
                                </div>
                            </div>
                            {form.sport === 'custom' && (
                                <div>
                                    <label htmlFor="league-custom-sport" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Custom sport name</label>
                                    <input id="league-custom-sport" className="input" placeholder="Enter sport name" value={form.customSport}
                                        onChange={e => setForm(f => ({ ...f, customSport: e.target.value }))} required />
                                </div>
                            )}
                            <div className="form-row-2">
                                <div>
                                    <label htmlFor="league-visibility" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Visibility</label>
                                    <select id="league-visibility" className="input" value={form.leagueType} onChange={e => setForm(f => ({ ...f, leagueType: e.target.value }))}>
                                        <option value="private">🔒 Private — invite code only</option>
                                        <option value="open">🌍 Open — anyone can join (no code needed)</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="league-max" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Max Players (0 = unlimited)</label>
                                    <input id="league-max" className="input" type="number" min="0" value={form.maxParticipants}
                                        onChange={e => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 0 }))} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="league-description" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Description (optional)</label>
                                <textarea id="league-description" className="input" rows={2} placeholder="Short description for your league…"
                                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            {createMsg && <p style={{ fontSize: '0.87rem', color: createMsg.startsWith('✅') ? '#48bb78' : '#f56565' }}>{createMsg}</p>}
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-primary" type="submit" disabled={creating} style={{ flex: 1 }}>
                                    {creating ? 'Creating…' : '🏆 Create League'}
                                </button>
                                <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* League list */}
                {tournaments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏆</div>
                        <h3>No leagues yet</h3>
                        <p>Create your first league and invite your friends to compete.</p>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create League</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {tournaments.map(t => (
                            <div key={t.id} style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem',
                                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                            }}>
                                {/* Sport icon */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
                                }}>
                                    {sportIcon(t.sport)}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{t.name}</span>
                                        <span className={t.league_type === 'open' ? 'league-badge-open' : 'league-badge-private'}>
                                            {t.league_type === 'open' ? '🌍 Open' : '🔒 Private'}
                                        </span>
                                        {!t.is_active && (
                                            <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>🏁 CLOSED</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.sport}</span>
                                        {t.league_type === 'private' && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                🔑 Code: <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{t.join_code}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="premium-league-actions" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                    <Link href={`/manage/${t.id}`} className="btn btn-primary btn-sm" aria-label={`Manage ${t.name}`}>⚙️ Manage</Link>
                                    <Link href={`/predictions/${t.id}`} className="btn btn-secondary btn-sm" aria-label={`Predict in ${t.name}`}>🎯 Predict</Link>
                                    <Link href={`/leaderboard/${t.id}`} className="btn btn-secondary btn-sm" aria-label={`Rankings for ${t.name}`}>📊 Ranks</Link>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => toggleStatus(t.id, t.is_active)}
                                        title={t.is_active ? 'Close league' : 'Reopen league'}
                                        aria-label={t.is_active ? `Close ${t.name}` : `Reopen ${t.name}`}
                                    >
                                        {t.is_active ? '🔒 Close' : '🔓 Reopen'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
