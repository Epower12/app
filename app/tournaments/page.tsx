'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import SportHeader, { sportImage } from '../components/SportHeader';
import { formatDate, timeUntil, plural } from '@/lib/format';

interface Tournament {
    id: string;
    name: string;
    join_code: string;
    created_at: number;
    created_by?: string;
    sport: string;
    league_type: 'open' | 'private';
    description?: string;
    max_participants?: number;
    is_active: boolean | number;
    // "what next" numbers from /api/tournaments
    joined_at?: number;
    member_count?: number;
    open_matches?: number;
    to_predict?: number;
    next_kickoff?: number | null;
    awaiting_results?: number;
    total_matches?: number;
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
            const data = await res.json();
            setMyTournaments(Array.isArray(data) ? data : []);
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
            // 409 = already a member: just take them to the league.
            if (res.ok || (res.status === 409 && data.tournamentId)) {
                setJoinCode('');
                setShowJoinModal(false);
                // Straight to the league's matches: that's what they came for.
                if (data.tournamentId) router.push(`/predictions/${data.tournamentId}`);
                else fetchMyTournaments();
            } else {
                setJoinError(data.error || 'That code did not work. Check it with the organiser.');
            }
        } catch { setJoinError('Something went wrong. Please try again.'); }
        finally { setJoinLoading(false); }
    };

    const myId = (session?.user as { id?: string } | undefined)?.id;
    const isOrganiser = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'premium';

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

    // The single most useful next action across all leagues.
    const needPicks = myTournaments.filter(t => (t.to_predict ?? 0) > 0 && t.is_active);
    const totalToPredict = needPicks.reduce((n, t) => n + (t.to_predict ?? 0), 0);
    const soonest = [...needPicks].sort((a, b) => (a.next_kickoff ?? Infinity) - (b.next_kickoff ?? Infinity))[0];
    const needResults = myTournaments.filter(t => t.created_by === myId && (t.awaiting_results ?? 0) > 0);

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                <SportHeader
                    title="My leagues"
                    subtitle="Predict each match before kick-off. When the result is in, points are added and the league table updates."
                    image="/img/hero-arena.png"
                    actions={
                        <>
                            <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>
                                Join with a code
                            </button>
                            {isOrganiser && <Link href="/premium" className="btn btn-secondary">Run a league</Link>}
                        </>
                    }
                />

                {/* What to do next */}
                {myTournaments.length > 0 && totalToPredict > 0 && soonest && (
                    <div className="next-step">
                        <span className="next-step-icon" aria-hidden="true">🎯</span>
                        <div>
                            <h2>{plural(totalToPredict, 'match needs', 'matches need')} your prediction</h2>
                            <p>
                                {soonest.next_kickoff && timeUntil(soonest.next_kickoff)
                                    ? <>The next one in <strong>{soonest.name}</strong> locks in <strong>{timeUntil(soonest.next_kickoff)}</strong>. </>
                                    : null}
                                Predictions lock at kick-off and can be changed until then.
                            </p>
                            <Link href={`/predictions/${soonest.id}`} className="btn btn-primary btn-sm">Predict now</Link>
                        </div>
                    </div>
                )}
                {needResults.length > 0 && (
                    <div className="next-step next-step-warn">
                        <span className="next-step-icon" aria-hidden="true">📝</span>
                        <div>
                            <h2>Your players are waiting for results</h2>
                            <p>
                                {needResults.map(t => `${t.name} (${plural(t.awaiting_results ?? 0, 'match', 'matches')})`).join(', ')}.
                                Enter the final score so everyone gets their points.
                            </p>
                            <Link href={`/manage/${needResults[0].id}`} className="btn btn-secondary btn-sm">Enter results</Link>
                        </div>
                    </div>
                )}

                <div className="tab-bar" role="tablist">
                    <button role="tab" aria-selected={tab === 'my'} className={`tab-btn ${tab === 'my' ? 'tab-btn-active' : ''}`} onClick={() => setTab('my')}>
                        My leagues <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>({myTournaments.length})</span>
                    </button>
                    <button role="tab" aria-selected={tab === 'open'} className={`tab-btn ${tab === 'open' ? 'tab-btn-active' : ''}`} onClick={() => setTab('open')}>
                        Browse open leagues <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>({openTournaments.length})</span>
                    </button>
                </div>

                {tab === 'my' && (
                    myTournaments.length === 0 ? (
                        <div className="empty-state">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/img/sport-crowd.png" alt="" className="empty-state-img" />
                            <h3>You&apos;re not in a league yet</h3>
                            <p>
                                Got an invite link or a 6-character code from a friend? Use it to join their league.
                                Or browse the open leagues anyone can join.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>Join with a code</button>
                                <button className="btn btn-secondary" onClick={() => setTab('open')}>Browse open leagues</button>
                            </div>
                            {isOrganiser && (
                                <p style={{ marginTop: '1.25rem' }}>
                                    Or <Link href="/premium" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>create your own league</Link> and invite your friends.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-2">
                            {myTournaments.map(t => (
                                <TournamentCard key={t.id} tournament={t} isOwner={t.created_by === myId} />
                            ))}
                        </div>
                    )
                )}

                {tab === 'open' && (
                    <>
                        <p className="section-help">
                            Open leagues are public: anyone can join with one click, no code needed.
                        </p>
                        {openTournaments.length === 0 ? (
                            <div className="empty-state">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/img/sport-floodlight.png" alt="" className="empty-state-img" />
                                <h3>No open leagues right now</h3>
                                <p>Ask a friend for an invite code, or check back soon.</p>
                            </div>
                        ) : (
                            <div className="grid grid-2">
                                {openTournaments.map(t => (
                                    <OpenLeagueCard
                                        key={t.id}
                                        tournament={t}
                                        joined={myTournaments.some(m => m.id === t.id)}
                                        onJoined={() => router.push(`/predictions/${t.id}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {showJoinModal && (
                    <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                        <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="join-title" onClick={e => e.stopPropagation()}>
                            <h2 id="join-title" style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Join a league with a code</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Enter the 6-character code the organiser shared with you. If you were sent an invite link,
                                just open the link instead.
                            </p>
                            <form onSubmit={handleJoin}>
                                <label htmlFor="join-code-input" className="sr-only" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                                    Join code
                                </label>
                                <input
                                    id="join-code-input"
                                    type="text"
                                    className="input"
                                    placeholder="ABC123"
                                    autoComplete="off"
                                    autoFocus
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    required
                                    style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.3em', marginBottom: '1rem' }}
                                />
                                {joinError && <div className="auth-error" role="alert">{joinError}</div>}
                                <div className="flex gap-1">
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={joinLoading || joinCode.length < 6}>
                                        {joinLoading ? 'Joining…' : 'Join league'}
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
            title="Copy an invite link friends can open to join"
            aria-label={`Share invite link for ${leagueName}`}
            style={{ minWidth: 80 }}
        >
            {copied ? 'Link copied!' : 'Invite'}
        </button>
    );
}

/* ---- Card banner: sport image + status badges ---- */
function CardBanner({ tournament: t }: { tournament: Tournament }) {
    return (
        <div className="tournament-card-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sportImage(t.sport)} alt="" />
            <div className="tournament-card-banner-badges">
                {!t.is_active && <span className="status-chip status-chip-muted">Closed</span>}
                <span
                    className={t.league_type === 'open' ? 'league-badge-open' : 'league-badge-private'}
                    title={t.league_type === 'open' ? 'Anyone can join' : 'Invite code needed to join'}
                >
                    {t.league_type === 'open' ? 'Open' : 'Private'}
                </span>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{t.sport}</span>
            </div>
        </div>
    );
}

/* ---- Tournament Card (My Leagues) ---- */
function TournamentCard({ tournament: t, isOwner }: { tournament: Tournament; isOwner: boolean }) {
    const toPredict = t.to_predict ?? 0;
    const open = t.open_matches ?? 0;
    const next = t.next_kickoff ? timeUntil(t.next_kickoff) : null;

    // One plain-language line telling the player where this league stands.
    let status: { text: string; tone: 'alert' | 'ok' | 'muted' };
    if (!t.is_active) status = { text: 'Closed by the organiser. Predictions are locked.', tone: 'muted' };
    else if (toPredict > 0) status = { text: `${plural(toPredict, 'match needs', 'matches need')} your prediction${next ? `, next locks in ${next}` : ''}.`, tone: 'alert' };
    else if (open > 0) status = { text: `All ${plural(open, 'upcoming match', 'upcoming matches')} predicted. Nice.`, tone: 'ok' };
    else if ((t.total_matches ?? 0) === 0) status = { text: isOwner ? 'No matches yet. Add some so your players can predict.' : 'No matches yet. The organiser will add them soon.', tone: 'muted' };
    else status = { text: 'No upcoming matches right now.', tone: 'muted' };

    return (
        <div className="tournament-card">
            <CardBanner tournament={t} />
            <div className="tournament-card-name">{t.name}</div>
            {t.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{t.description}</p>
            )}
            <p
                style={{
                    fontSize: '0.88rem', fontWeight: 600, margin: '0 0 0.75rem', padding: '0.5rem 0.7rem', borderRadius: 10,
                    background: status.tone === 'alert' ? '#ffe7dc' : status.tone === 'ok' ? 'var(--lime-soft)' : 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                }}
            >
                {status.text}
            </p>
            <div className="tournament-card-meta">
                <span>{plural(t.member_count ?? 1, 'player', 'players')}</span>
                {t.joined_at && <span>Joined {formatDate(t.joined_at)}</span>}
                {isOwner && <span className="status-chip status-chip-done">You run this league</span>}
                {t.league_type === 'private' && (
                    <span title="Friends can join with this code">Code: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{t.join_code}</strong></span>
                )}
            </div>
            <div className="tournament-card-actions">
                <Link href={`/predictions/${t.id}`} className="btn btn-primary">
                    {toPredict > 0 ? `Predict (${toPredict})` : 'Matches'}
                </Link>
                <Link href={`/leaderboard/${t.id}`} className="btn btn-secondary">Table</Link>
                {isOwner
                    ? <Link href={`/manage/${t.id}`} className="btn btn-secondary btn-sm">Manage</Link>
                    : <ShareButton joinCode={t.join_code} leagueName={t.name} />}
            </div>
        </div>
    );
}

/* ---- Open League Card (Browse tab) ---- */
function OpenLeagueCard({ tournament: t, joined, onJoined }: { tournament: Tournament; joined: boolean; onJoined: () => void; }) {
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    const handleQuickJoin = async () => {
        setJoining(true);
        setError('');
        try {
            const res = await fetch('/api/tournaments/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode: t.join_code }),
            });
            if (res.ok) onJoined();
            else setError((await res.json().catch(() => ({})))?.error || 'Could not join this league.');
        } catch { setError('Something went wrong. Please try again.'); }
        finally { setJoining(false); }
    };

    const full = (t.max_participants ?? 0) > 0 && (t.member_count ?? 0) >= (t.max_participants ?? 0);

    return (
        <div className="tournament-card">
            <CardBanner tournament={t} />
            <div className="tournament-card-name">{t.name}</div>
            {t.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t.description}</p>
            )}
            <div className="tournament-card-meta">
                <span>{plural(t.member_count ?? 0, 'player', 'players')}{(t.max_participants ?? 0) > 0 ? ` of ${t.max_participants}` : ''}</span>
                <span>{plural(t.open_matches ?? 0, 'upcoming match', 'upcoming matches')}</span>
            </div>
            {error && <div className="auth-error" role="alert" style={{ marginBottom: '0.75rem' }}>{error}</div>}
            <div className="tournament-card-actions">
                {joined ? (
                    <>
                        <Link href={`/predictions/${t.id}`} className="btn btn-primary">Matches</Link>
                        <Link href={`/leaderboard/${t.id}`} className="btn btn-secondary">Table</Link>
                    </>
                ) : (
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleQuickJoin} disabled={joining || full}>
                        {full ? 'League is full' : joining ? 'Joining…' : 'Join this league'}
                    </button>
                )}
            </div>
        </div>
    );
}
