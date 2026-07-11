'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import SportHeader, { sportImage } from '../../components/SportHeader';
import type { MatchType, SeriesFormat, RaceSession } from '@/lib/types';

interface RaceWeekendEntry {
    picks: string[];
    actual: string[] | null;
    pole: { pick: string | null; actual: string | null };
    fastestLap: { pick: string | null; actual: string | null };
    firstRetirement: { pick: string | null; actual: string | null };
    safetyCar: { pick: boolean | null; actual: boolean | null };
    positionsGained: { pick: string | null; actual: string | null };
    positionsLost: { pick: string | null; actual: string | null };
    winningMargin: { pick: string | null; actual: string | null };
    retirements: { pick: string | null; actual: string | null };
    multiplier: number;
    breakdown: { label: string; points: number }[];
}

interface PredictionEntry {
    matchId: string; teamA: string; teamB: string;
    matchType: MatchType; seriesFormat: SeriesFormat | null; raceSession: RaceSession | null;
    predictedScoreA?: number; predictedScoreB?: number;
    actualScoreA?: number | null; actualScoreB?: number | null;
    raceWeekend?: RaceWeekendEntry;
    points: number; pointsBreakdown?: string;
}

interface LeaderboardEntry {
    userId: string; username: string; totalPoints: number;
    predictions: PredictionEntry[];
}

const SESSION_BADGE: Record<string, { label: string; color: string }> = {
    qualifying:        { label: 'QUALI',  color: '#38bdf8' },
    sprint_qualifying: { label: 'SQ',     color: '#818cf8' },
    sprint:            { label: 'SPRINT', color: '#fb923c' },
    race:              { label: 'RACE',   color: '#fbbf24' },
};

// Scoring badge — visual chip per points tier
function ScoreBadge({ pts, matchType }: { pts: number; matchType: MatchType }) {
    if (matchType === 'race') {
        if (pts >= 10)      return <span style={badge('#fbbf24', 'rgba(251,191,36,0.15)')}>Perfect</span>;
        if (pts >= 8)       return <span style={badge('#fbbf24', 'rgba(251,191,36,0.12)')}>Excellent</span>;
        if (pts >= 5)       return <span style={badge('#38bdf8', 'rgba(56,189,248,0.12)')}>Good</span>;
        if (pts >= 1)       return <span style={badge('#818cf8', 'rgba(129,140,248,0.12)')}>Partial</span>;
        return               <span style={badge('var(--text-muted)', 'var(--bg-tertiary)')}>Miss</span>;
    }
    if (pts === 5) return <span style={badge('#4facfe', 'rgba(79,172,254,0.12)')}>Exact</span>;
    if (pts === 3) return <span style={badge('#48bb78', 'rgba(72,187,120,0.12)')}>Winner + margin</span>;
    if (pts === 2) return <span style={badge('#667eea', 'rgba(102,126,234,0.12)')}>Winner</span>;
    return                 <span style={badge('var(--text-muted)', 'var(--bg-tertiary)')}>Miss</span>;
}

function badge(color: string, bg: string): React.CSSProperties {
    return { fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '999px', background: bg, color, border: `1px solid ${color}22`, whiteSpace: 'nowrap' };
}

// Per-prediction breakdown row
function PredRow({ p }: { p: PredictionEntry }) {
    if (p.matchType === 'race') {
        const rw = p.raceWeekend;
        const sessionBadge = p.raceSession ? SESSION_BADGE[p.raceSession] : null;
        const podiumColors = ['#fbbf24', '#94a3b8', '#b45309'];
        return (
            <div className="lb-pred-row" style={{ flexDirection: 'column', gap: '0.4rem', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {sessionBadge && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: sessionBadge.color, letterSpacing: '0.04em' }}>
                                {sessionBadge.label}
                            </span>
                        )}
                        {rw && rw.multiplier !== 1 && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f97316' }}>×{rw.multiplier}</span>
                        )}
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.teamA}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <ScoreBadge pts={p.points} matchType="race" />
                        <span style={{ fontWeight: 800, color: p.points >= 8 ? '#fbbf24' : p.points >= 3 ? '#38bdf8' : p.points > 0 ? '#818cf8' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                            +{p.points}
                        </span>
                    </div>
                </div>

                {rw && rw.picks.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {rw.picks.slice(0, 3).map((driver, i) => {
                            const exact = rw.actual?.[i] === driver;
                            const inTop10 = !exact && rw.actual?.includes(driver);
                            return (
                                <div key={driver} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span style={{ color: podiumColors[i], fontWeight: 800 }}>P{i + 1}</span>
                                    <span style={{ color: exact ? podiumColors[i] : inTop10 ? '#818cf8' : 'var(--text-muted)', fontWeight: exact ? 700 : 400 }}>
                                        {driver}
                                    </span>
                                </div>
                            );
                        })}
                        {rw.picks.length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{rw.picks.length - 3} more</span>
                        )}
                    </div>
                )}

                {rw?.actual && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Actual top 3: <span style={{ color: '#fbbf24' }}>{rw.actual[0]}</span> · <span style={{ color: '#94a3b8' }}>{rw.actual[1]}</span> · <span style={{ color: '#b45309' }}>{rw.actual[2]}</span>
                    </div>
                )}

                {rw && rw.breakdown.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {rw.breakdown.map((b, i) => (
                            <span key={i} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(56,189,248,0.1)', color: 'var(--color-primary)' }}>
                                {b.label} {b.points >= 0 ? '+' : ''}{b.points}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // score / series
    const isActual = p.actualScoreA !== null && p.actualScoreA !== undefined;
    const isSeries = p.matchType === 'series';
    return (
        <div className="lb-pred-row">
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {isSeries && p.seriesFormat && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#818cf8', background: 'rgba(129,140,248,0.1)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>
                        {p.seriesFormat}
                    </span>
                )}
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.teamA} vs {p.teamB}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Pick: {p.predictedScoreA}–{p.predictedScoreB}
                    {isActual && ` · Actual: ${p.actualScoreA}–${p.actualScoreB}`}
                </span>
                <ScoreBadge pts={p.points} matchType={p.matchType} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: p.points === 5 ? '#4facfe' : p.points === 3 ? '#48bb78' : p.points === 2 ? '#667eea' : 'var(--text-muted)' }}>
                    +{p.points}
                </span>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [tournamentSport, setTournamentSport] = useState('');
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

    useEffect(() => {
        if (session && tournamentId) {
            fetch(`/api/leaderboard/${tournamentId}`).then(r => r.json()).then(setLeaderboard).catch(() => {}).finally(() => setLoading(false));
            fetch(`/api/tournaments?id=${tournamentId}`).then(r => r.json()).then(d => {
                setTournamentName(d?.name ?? '');
                setTournamentSport(d?.sport ?? '');
            });
        }
    }, [session, tournamentId]);

    const myId = (session?.user as any)?.id;
    const top3 = leaderboard.slice(0, 3);
    const podiumOrder = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;

    // Sport-specific accent colour for points highlights
    const sportAccent: Record<string, { color: string }> = {
        'Formula 1': { color: '#ef4444' },
        'MotoGP':    { color: '#f97316' },
        'Counter-Strike': { color: '#818cf8' },
        'League of Legends': { color: '#f59e0b' },
        'Dota 2':    { color: '#ef4444' },
        'Valorant':  { color: '#ff4655' },
        'Tennis':    { color: '#84cc16' },
    };
    const accent = sportAccent[tournamentSport] ?? { color: '#38bdf8' };

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    <div className="loading" style={{ height: '250px', borderRadius: 'var(--radius-lg)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                {/* Header — sport imagery backdrop */}
                <SportHeader
                    title="Rankings"
                    subtitle={tournamentName || undefined}
                    image={sportImage(tournamentSport)}
                    actions={
                        <>
                            <Link href={`/predictions/${tournamentId}`} className="btn btn-primary">Predict</Link>
                            <Link href="/tournaments" className="btn btn-secondary">All leagues</Link>
                        </>
                    }
                />

                {leaderboard.length === 0 ? (
                    <div className="empty-state">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/img/sport-scoreboard.png" alt="" className="empty-state-img" />
                        <h3>No predictions yet</h3>
                        <p>Be the first to make a prediction and claim the top spot!</p>
                        <Link href={`/predictions/${tournamentId}`} className="btn btn-primary">Make a prediction</Link>
                    </div>
                ) : (
                    <>
                        {/* Podium */}
                        {top3.length >= 2 && (
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem' }}>
                                <div className="podium-section">
                                    {podiumOrder.map((entry) => {
                                        const rank = leaderboard.indexOf(entry);
                                        const barClass = `podium-bar podium-bar-${rank + 1}`;
                                        const avatarClass = `podium-avatar podium-avatar-${rank + 1}`;
                                        const medals = ['🥇', '🥈', '🥉'];
                                        return (
                                            <div key={entry.userId} className="podium-item">
                                                <div className={avatarClass}>{medals[rank]}</div>
                                                <div className="podium-name">{entry.username}</div>
                                                <div className="podium-points">{entry.totalPoints} pts</div>
                                                <div className={barClass}>#{rank + 1}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Full table */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>All Participants ({leaderboard.length})</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Click a row to see breakdown</span>
                            </div>
                            <div style={{ padding: '0.5rem 0' }}>
                                {leaderboard.map((entry, index) => {
                                    const isMe = entry.userId === myId;
                                    const isOpen = expanded === entry.userId;
                                    const medals = ['🥇', '🥈', '🥉'];
                                    const scored = entry.predictions.filter(p =>
                                        p.matchType === 'race' ? !!p.raceWeekend?.actual : p.actualScoreA !== null
                                    );
                                    return (
                                        <div key={entry.userId}>
                                            <div className={`lb-row ${isMe ? 'lb-row-me' : ''}`}
                                                onClick={() => setExpanded(isOpen ? null : entry.userId)}>
                                                <div className="lb-rank">
                                                    {index < 3 ? medals[index] : <span style={{ color: 'var(--text-muted)' }}>{index + 1}</span>}
                                                </div>
                                                <div className="lb-user">
                                                    <div className="lb-username">
                                                        {entry.username}
                                                        {isMe && <span style={{ fontSize: '0.65rem', background: 'rgba(102,126,234,0.2)', color: '#a0b3f8', padding: '0.1rem 0.4rem', borderRadius: '999px', fontWeight: 700 }}>YOU</span>}
                                                    </div>
                                                    <div className="lb-scored">{scored.length} scored</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div className="lb-points" style={{ color: accent.color }}>{entry.totalPoints}</div>
                                                    <div className="lb-pts-label">points</div>
                                                </div>
                                            </div>
                                            {isOpen && entry.predictions.length > 0 && (
                                                <div className="lb-breakdown">
                                                    {entry.predictions.map(p => (
                                                        <PredRow key={p.matchId} p={p} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
