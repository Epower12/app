'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import SportHeader, { sportImage } from '../components/SportHeader';

interface Tournament {
    id: string;
    name: string;
    join_code: string;
    created_at: number;
    sport: string;
    league_type: 'open' | 'private';
    description?: string;
    max_participants?: number;
    is_active: number;
}

export default function TournamentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
    const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
    const [tab, setTab] = useState<'my' | 'open'>('my');
    const [loading, setLoading] = useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (session) {
            fetchMyTournaments();
            fetchOpenTournaments();
        }
    }, [session]);

    const fetchMyTournaments = async () => {
        try {
            const res = await fetch('/api/tournaments');
            setMyTournaments(await res.json());
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    const fetchOpenTournaments = async () => {
        try {
            const res = await fetch('/api/tournaments/open');
            if (res.ok) setOpenTournaments(await res.json());
        } catch { /* ignore */ }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setJoinError('');
        setJoinLoading(true);
        try {
            const res = await fetch('/api/tournaments/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
            });
            const data = await res.json();
            if (res.ok) {
                setJoinCode('');
                setShowJoinModal(false);
                fetchMyTournaments();
            } else {
                setJoinError(data.error || 'Failed to join');
            }
        } catch { setJoinError('An error occurred.'); }
        finally { setJoinLoading(false); }
    };

    const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'premium';

    if (status === 'loading' || loading) {
        return (
            <div className="app-page">
                <Navbar />
                <div className="container" style={{ paddingTop: '3rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="loading" style={{ height: '140px', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
                    ))}
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
                    title="Leagues"
                    subtitle="Predict scores, earn points for accuracy, climb the table."
                    image="/img/hero-arena.png"
                    actions={
                        <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>
                            Join a league
                        </button>
                    }
                />

                {/* Tab bar */}
                <div className="tab-bar">
                    <button className={`tab-btn ${tab === 'my' ? 'tab-btn-active' : ''}`} onClick={() => setTab('my')}>
                        My leagues <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>({myTournaments.length})</span>
                    </button>
                    <button className={`tab-btn ${tab === 'open' ? 'tab-btn-active' : ''}`} onClick={() => setTab('open')}>
                        Open leagues <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>({openTournaments.length})</span>
                    </button>
                </div>

                {/* --- MY LEAGUES TAB --- */}
                {tab === 'my' && (
                    <>
                        {myTournaments.length === 0 ? (
                            <div className="empty-state">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/img/sport-crowd.png" alt="" className="empty-state-img" />
                                <h3>No leagues yet</h3>
                                <p>Join an open league or ask for a join code to get started.</p>
                                <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>Join a league</button>
                            </div>
                        ) : (
                            <div className="grid grid-2">
                                {myTournaments.map(t => (
                                    <TournamentCard key={t.id} tournament={t} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* --- OPEN LEAGUES TAB --- */}
                {tab === 'open' && (
                    <>
                        {openTournaments.length === 0 ? (
                            <div className="empty-state">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/img/sport-floodlight.png" alt="" className="empty-state-img" />
                                <h3>No open leagues available</h3>
                                <p>No public tournaments have been created yet. Check back soon!</p>
                            </div>
                        ) : (
                            <div className="grid grid-2">
                                {openTournaments.map(t => {
                                    const joined = myTournaments.some(m => m.id === t.id);
                                    return (
                                        <OpenLeagueCard key={t.id} tournament={t} joined={joined} onJoined={() => { fetchMyTournaments(); }} />
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* JOIN MODAL */}
                {showJoinModal && (
                    <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Join a Private League</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Enter the 6-character code shared by the league organiser.
                            </p>
                            <form onSubmit={handleJoin}>
                                <label htmlFor="join-code-input" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                                    Join code
                                </label>
                                <input
                                    id="join-code-input"
                                    type="text"
                                    className="input"
                                    placeholder="XXXXXX"
                                    aria-label="6-character join code"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    required
                                    style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.3em', marginBottom: '1rem' }}
                                />
                                {joinError && <div className="auth-error">{joinError}</div>}
                                <div className="flex gap-1">
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={joinLoading}>
                                        {joinLoading ? 'Joining…' : 'Join League'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowJoinModal(false); setJoinError(''); }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---- Share helper ---- */
function ShareButton({ joinCode, leagueName }: { joinCode: string; leagueName: string }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        // Always share via the app subdomain (in dev/preview, fall back to current origin)
        const origin = window.location.hostname.endsWith('yourfriendleague.com')
            ? 'https://app.yourfriendleague.com'
            : window.location.origin;
        const url = `${origin}/join?code=${joinCode}`;
        if (navigator.share) {
            try { await navigator.share({ title: `Join "${leagueName}" on YourFriendsLeague`, url }); return; } catch { /* fallback */ }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            className="btn btn-secondary btn-sm"
            onClick={handleShare}
            title="Share invite link"
            aria-label={`Share invite link for ${leagueName}`}
            style={{ minWidth: 80 }}
        >
            {copied ? 'Copied!' : 'Share'}
        </button>
    );
}

/* ---- Card banner: sport image + status badges ---- */
function CardBanner({ tournament: t }: { tournament: Tournament }) {
    return (
        <div className="tournament-card-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sportImage(t.sport)} alt={t.sport} />
            <div className="tournament-card-banner-badges">
                {!t.is_active && (
                    <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid var(--border-color)' }}>
                        Closed
                    </span>
                )}
                <span className={t.league_type === 'open' ? 'league-badge-open' : 'league-badge-private'}>
                    {t.league_type === 'open' ? 'Open' : 'Private'}
                </span>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{t.sport}</span>
            </div>
        </div>
    );
}

/* ---- Tournament Card (My Leagues) ---- */
function TournamentCard({ tournament: t }: { tournament: Tournament }) {
    return (
        <div className="tournament-card">
            <CardBanner tournament={t} />
            <div className="tournament-card-name">{t.name}</div>
            {t.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t.description}</p>
            )}
            <div className="tournament-card-meta">
                <span>Joined {new Date(t.created_at * 1000).toLocaleDateString()}</span>
                {t.league_type === 'private' && (
                    <span>Code: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{t.join_code}</strong></span>
                )}
            </div>
            <div className="tournament-card-actions">
                <Link href={`/predictions/${t.id}`} className="btn btn-primary">Predict</Link>
                <Link href={`/leaderboard/${t.id}`} className="btn btn-secondary">Rankings</Link>
                <ShareButton joinCode={t.join_code} leagueName={t.name} />
            </div>
        </div>
    );
}

/* ---- Open League Card (Browse tab) ---- */
function OpenLeagueCard({ tournament: t, joined, onJoined }: { tournament: Tournament; joined: boolean; onJoined: () => void; }) {
    const [joining, setJoining] = useState(false);

    const handleQuickJoin = async () => {
        setJoining(true);
        try {
            const res = await fetch('/api/tournaments/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode: t.join_code }),
            });
            if (res.ok) onJoined();
        } catch { /* ignore */ } finally { setJoining(false); }
    };

    return (
        <div className="tournament-card" style={{ opacity: joined ? 0.8 : 1 }}>
            <CardBanner tournament={t} />
            <div className="tournament-card-name">{t.name}</div>
            {t.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t.description}</p>
            )}
            <div className="tournament-card-meta">
                <span>Created {new Date(t.created_at * 1000).toLocaleDateString()}</span>
            </div>
            <div className="tournament-card-actions">
                {joined ? (
                    <>
                        <Link href={`/predictions/${t.id}`} className="btn btn-primary">Predict</Link>
                        <Link href={`/leaderboard/${t.id}`} className="btn btn-secondary">Rankings</Link>
                        <ShareButton joinCode={t.join_code} leagueName={t.name} />
                    </>
                ) : (
                    <>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleQuickJoin} disabled={joining}>
                            {joining ? 'Joining…' : 'Join this league'}
                        </button>
                        <ShareButton joinCode={t.join_code} leagueName={t.name} />
                    </>
                )}
            </div>
        </div>
    );
}
