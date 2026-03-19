'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface LeaderboardEntry {
    userId: string; username: string; totalPoints: number;
    predictions: {
        matchId: string; teamA: string; teamB: string;
        predictedScoreA: number; predictedScoreB: number;
        actualScoreA: number | null; actualScoreB: number | null;
        points: number;
    }[];
}

export default function LeaderboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

    useEffect(() => {
        if (session && tournamentId) {
            fetch(`/api/leaderboard/${tournamentId}`).then(r => r.json()).then(setLeaderboard).catch(() => { }).finally(() => setLoading(false));
            fetch(`/api/tournaments?id=${tournamentId}`).then(r => r.json()).then(d => setTournamentName(d?.name ?? ''));
        }
    }, [session, tournamentId]);

    const myId = (session?.user as any)?.id;

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Podium order: 2nd, 1st, 3rd (display left→right)
    const podiumOrder = top3.length >= 2
        ? [top3[1], top3[0], top3[2]].filter(Boolean)
        : top3;

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
                {/* Header */}
                <div className="app-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="app-page-title">📊 Rankings</h1>
                        {tournamentName && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{tournamentName}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/predictions/${tournamentId}`} className="btn btn-primary">🎯 Predict</Link>
                        <Link href="/tournaments" className="btn btn-secondary">← Leagues</Link>
                    </div>
                </div>

                {leaderboard.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <h3>No predictions yet</h3>
                        <p>Be the first to make a prediction and claim the top spot!</p>
                        <Link href={`/predictions/${tournamentId}`} className="btn btn-primary">Make a Prediction</Link>
                    </div>
                ) : (
                    <>
                        {/* --- Podium --- */}
                        {top3.length >= 2 && (
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem' }}>
                                <div className="podium-section">
                                    {podiumOrder.map((entry, idx) => {
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

                        {/* --- Full Table --- */}
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
                                    const scored = entry.predictions.filter(p => p.actualScoreA !== null);
                                    return (
                                        <div key={entry.userId}>
                                            <div
                                                className={`lb-row ${isMe ? 'lb-row-me' : ''}`}
                                                onClick={() => setExpanded(isOpen ? null : entry.userId)}
                                            >
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
                                                    <div className="lb-points">{entry.totalPoints}</div>
                                                    <div className="lb-pts-label">points</div>
                                                </div>
                                            </div>
                                            {isOpen && scored.length > 0 && (
                                                <div className="lb-breakdown">
                                                    {scored.map(p => {
                                                        const exact = p.predictedScoreA === p.actualScoreA && p.predictedScoreB === p.actualScoreB;
                                                        const color = p.points === 5 ? '#4facfe' : p.points >= 3 ? '#667eea' : p.points > 0 ? '#fa709a' : 'var(--text-muted)';
                                                        return (
                                                            <div key={p.matchId} className="lb-pred-row">
                                                                <span style={{ color: 'var(--text-secondary)' }}>{p.teamA} vs {p.teamB}</span>
                                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                                        Pick: {p.predictedScoreA}–{p.predictedScoreB} · Actual: {p.actualScoreA}–{p.actualScoreB}
                                                                    </span>
                                                                    <span style={{ color, fontWeight: 700, fontSize: '0.82rem' }}>+{p.points}pts</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
