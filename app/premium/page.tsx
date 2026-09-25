'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import SportHeader, { sportImage } from '../components/SportHeader';
import { plural } from '@/lib/format';

interface Tournament {
    id: string;
    name: string;
    join_code: string;
    created_at: number;
    created_by: string;
    is_active: boolean;
    sport: string;
    league_type: string;
    description: string;
    max_participants: number;
    member_count?: number;
    total_matches?: number;
    open_matches?: number;
    awaiting_results?: number;
}

interface Sport { id: string; name: string; }


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
        name: '', sport: 'Football', leagueType: 'private',
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
            // Step 2 is adding matches, so go straight there.
            router.push(`/manage/${data.id}?new=1`);
            return;
        } else {
            setCreateMsg(`Error: ${data.error}`);
        }
        setCreating(false);
    };

    const toggleStatus = async (id: string, current: boolean) => {
        if (!confirm(current
            ? 'Close this league?\n\nPlayers can no longer make or change predictions. The league table stays visible, and you can reopen it at any time.'
            : 'Reopen this league?\n\nPlayers can predict upcoming matches again.')) return;
        await fetch(`/api/tournaments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !current }),
        });
        fetchTournaments();
    };

    const user = session?.user as any;
    // The dashboard is about leagues this organiser runs; leagues they only play
    // in live on the My leagues page.
    const ownLeagues = tournaments.filter(t => t.created_by === user?.id);
    const playingIn = tournaments.length - ownLeagues.length;
    const awaiting = ownLeagues.reduce((n, t) => n + (t.awaiting_results ?? 0), 0);

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
                <SportHeader
                    title="Organiser"
                    subtitle="Run your own leagues: add the matches, invite your friends, enter the results. Your players always play free."
                    image="/img/cta-celebration.png"
                    actions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create a league</button>}
                />

                {/* How running a league works */}
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>How running a league works</h2>
                <ol className="steps-guide">
                    <li className={ownLeagues.length > 0 ? 'is-done' : 'is-current'}>
                        <strong>Create a league</strong>
                        Pick the sport and whether it&apos;s private (invite code) or open to anyone.
                    </li>
                    <li className={ownLeagues.some(t => (t.total_matches ?? 0) > 0) ? 'is-done' : ownLeagues.length > 0 ? 'is-current' : ''}>
                        <strong>Add matches</strong>
                        Import fixtures in one click, use a tournament preset, or add them by hand.
                    </li>
                    <li className={ownLeagues.some(t => (t.member_count ?? 0) > 1) ? 'is-done' : ownLeagues.some(t => (t.total_matches ?? 0) > 0) ? 'is-current' : ''}>
                        <strong>Invite friends</strong>
                        Share the invite link or code. Friends join free and predict before kick-off.
                    </li>
                    <li className={awaiting > 0 ? 'is-current' : ''}>
                        <strong>Enter results</strong>
                        After each match, enter the final score. Points and the table update instantly.
                    </li>
                </ol>

                {awaiting > 0 && (
                    <div className="next-step next-step-warn">
                        <span className="next-step-icon" aria-hidden="true">📝</span>
                        <div>
                            <h2>{plural(awaiting, 'match is', 'matches are')} waiting for a result</h2>
                            <p>These matches have started. Enter the final score so your players get their points.</p>
                        </div>
                    </div>
                )}

                <p className="section-help" style={{ marginTop: '-0.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Fair play:</strong> Premium gives you organiser tools and
                    community stats. It never changes how anyone scores.
                </p>

                {/* Leagues you run */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.75rem 0 1rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Leagues you run <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>({ownLeagues.length})</span>
                    </h2>
                    {!showCreate && <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(true)}>+ New league</button>}
                </div>

                {/* Create form */}
                {showCreate && (
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem',
                    }}>
                        <h3 style={{ fontWeight: 800, marginBottom: '0.35rem', fontSize: '1.05rem' }}>New league</h3>
                        <p className="section-help" style={{ marginTop: 0 }}>You can change the name and description later. Next you&apos;ll add the matches.</p>
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
                                        <option value="private">Private: only people with the invite code</option>
                                        <option value="open">Open: listed publicly, anyone can join</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="league-max" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Player limit (0 = no limit)</label>
                                    <input id="league-max" className="input" type="number" min="0" value={form.maxParticipants}
                                        onChange={e => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 0 }))} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="league-description" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Description (optional)</label>
                                <textarea id="league-description" className="input" rows={2} placeholder="Short description for your league…"
                                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            {createMsg && <p style={{ fontSize: '0.87rem', color: !createMsg.startsWith('Error') ? '#48bb78' : '#f56565' }}>{createMsg}</p>}
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-primary" type="submit" disabled={creating} style={{ flex: 1 }}>
                                    {creating ? 'Creating…' : 'Create league and add matches'}
                                </button>
                                <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* League list */}
                {ownLeagues.length === 0 ? (
                    !showCreate && (
                        <div className="empty-state">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/img/sport-crowd.png" alt="" className="empty-state-img" />
                            <h3>You don&apos;t run a league yet</h3>
                            <p>Create one in under a minute, add the matches, then share the invite link with your friends.</p>
                            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create a league</button>
                        </div>
                    )
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {ownLeagues.map(t => (
                            <div key={t.id} style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem',
                                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                            }}>
                                {/* Sport image */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={sportImage(t.sport)} alt={t.sport} className="feature-thumb" style={{ flexShrink: 0 }} />

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{t.name}</span>
                                        <span className={t.league_type === 'open' ? 'league-badge-open' : 'league-badge-private'}>
                                            {t.league_type === 'open' ? 'Open' : 'Private'}
                                        </span>
                                        {!t.is_active && (
                                            <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>CLOSED</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.sport}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plural(t.member_count ?? 1, 'player', 'players')}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plural(t.total_matches ?? 0, 'match', 'matches')}</span>
                                        {(t.awaiting_results ?? 0) > 0 && <span className="status-chip status-chip-live">{plural(t.awaiting_results ?? 0, 'result', 'results')} to enter</span>}
                                        {(t.total_matches ?? 0) === 0 && <span className="status-chip status-chip-upcoming">Next: add matches</span>}
                                        {(t.total_matches ?? 0) > 0 && (t.member_count ?? 1) <= 1 && <span className="status-chip status-chip-upcoming">Next: invite friends</span>}
                                        {t.league_type === 'private' && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Invite code: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{t.join_code}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="premium-league-actions" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                    <Link href={`/manage/${t.id}`} className="btn btn-primary btn-sm" aria-label={`Manage ${t.name}`}>Manage</Link>
                                    <Link href={`/predictions/${t.id}`} className="btn btn-secondary btn-sm" aria-label={`Predict in ${t.name}`}>Predict</Link>
                                    <Link href={`/leaderboard/${t.id}`} className="btn btn-secondary btn-sm" aria-label={`League table for ${t.name}`}>Table</Link>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => toggleStatus(t.id, t.is_active)}
                                        title={t.is_active ? 'Close: locks all predictions, the table stays visible' : 'Reopen: players can predict again'}
                                        aria-label={t.is_active ? `Close ${t.name}` : `Reopen ${t.name}`}
                                    >
                                        {t.is_active ? 'Close' : 'Reopen'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {playingIn > 0 && (
                    <p className="section-help" style={{ marginTop: '1.25rem' }}>
                        You also play in {plural(playingIn, 'league', 'leagues')} run by others. Find {playingIn === 1 ? 'it' : 'them'} under <Link href="/tournaments" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>My leagues</Link>.
                    </p>
                )}
            </div>
        </div>
    );
}
