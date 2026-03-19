'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface Match {
    id: string; team_a: string; team_b: string; scheduled_time: number;
    team_a_score: number | null; team_b_score: number | null;
    is_finished: boolean; sport: string;
}
interface Prediction { id: string; match_id: string; team_a_score: number; team_b_score: number; }

const sportIcon = (s: string) => {
    const m: Record<string, string> = { Football: '⚽', 'Ice Hockey': '🏒', Tennis: '🎾', Basketball: '🏀' };
    return m[s] ?? '🏅';
};

const avatarLetters = (name: string) => name.slice(0, 2).toUpperCase();
const formatDT = (ts: number) => new Date(ts * 1000).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [matches, setMatches] = useState<Match[]>([]);
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
    const [tournamentName, setTournamentName] = useState('');
    const [isTournamentActive, setIsTournamentActive] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

    useEffect(() => {
        if (session && tournamentId) fetchData();
    }, [session, tournamentId]);

    const fetchData = async () => {
        try {
            const [mRes, pRes, tRes] = await Promise.all([
                fetch(`/api/matches?tournamentId=${tournamentId}`),
                fetch(`/api/predictions?tournamentId=${tournamentId}`),
                fetch(`/api/tournaments?id=${tournamentId}`),
            ]);
            const [mData, pData, tData] = await Promise.all([mRes.json(), pRes.json(), tRes.json()]);
            setMatches(mData);
            const predMap: Record<string, Prediction> = {};
            pData.forEach((p: Prediction) => { predMap[p.match_id] = p; });
            setPredictions(predMap);
            setTournamentName(tData?.name ?? '');
            setIsTournamentActive(tData?.is_active === 1);
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    const submitPrediction = async (matchId: string, teamAScore: number, teamBScore: number) => {
        await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, teamAScore, teamBScore }),
        });
        fetchData();
    };

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    {[1, 2, 3].map(i => <div key={i} className="loading" style={{ height: '100px', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />)}
                </div>
            </div>
        );
    }

    const now = Date.now() / 1000;
    const upcomingMatches = matches.filter(m => !m.is_finished && now < m.scheduled_time);
    const liveMatches = matches.filter(m => !m.is_finished && now >= m.scheduled_time);
    const finishedMatches = matches.filter(m => m.is_finished);

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                {/* Header */}
                <div className="app-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="app-page-title">🎯 Predictions</h1>
                        {tournamentName && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{tournamentName}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/leaderboard/${tournamentId}`} className="btn btn-secondary">📊 Rankings</Link>
                        <Link href="/tournaments" className="btn btn-secondary">← Leagues</Link>
                    </div>
                </div>

                {/* Summary bar */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    {[
                        { label: 'Open', count: upcomingMatches.length, color: '#4facfe' },
                        { label: 'Live', count: liveMatches.length, color: '#f5576c' },
                        { label: 'Finished', count: finishedMatches.length, color: 'var(--text-muted)' },
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', border: `1px solid var(--border-color)`, padding: '0.4rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                            <span style={{ color: s.color, fontWeight: 700 }}>{s.count}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {matches.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No matches yet</h3>
                        <p>The league organiser hasn't added any matches yet. Check back soon!</p>
                    </div>
                )}

                {upcomingMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4facfe', display: 'inline-block' }} />
                            Open for Predictions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {upcomingMatches.map(m => (
                                <PredCard key={m.id} match={m} prediction={predictions[m.id]} onSubmit={submitPrediction} locked={!isTournamentActive} />
                            ))}
                        </div>
                    </div>
                )}

                {liveMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span className="match-live-dot" />
                            Live / Locked
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {liveMatches.map(m => (
                                <PredCard key={m.id} match={m} prediction={predictions[m.id]} onSubmit={submitPrediction} locked />
                            ))}
                        </div>
                    </div>
                )}

                {finishedMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                            Finished
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {finishedMatches.map(m => (
                                <PredCard key={m.id} match={m} prediction={predictions[m.id]} onSubmit={submitPrediction} locked showResult />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PredCard({ match, prediction, onSubmit, locked = false, showResult = false }: {
    match: Match; prediction?: Prediction;
    onSubmit: (id: string, a: number, b: number) => void;
    locked?: boolean; showResult?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [scores, setScores] = useState({ a: prediction?.team_a_score ?? 0, b: prediction?.team_b_score ?? 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => { setScores({ a: prediction?.team_a_score ?? 0, b: prediction?.team_b_score ?? 0 }); }, [prediction]);

    const timeLeft = Math.floor((match.scheduled_time * 1000 - Date.now()) / 1000);
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    const handleSave = async () => {
        setSaving(true);
        await onSubmit(match.id, scores.a, scores.b);
        setEditing(false);
        setSaving(false);
    };

    const resultPoints = () => {
        if (!showResult || match.team_a_score === null) return null;
        if (!prediction) return null;
        const correctOutcome = (
            (match.team_a_score > match.team_b_score! && prediction.team_a_score > prediction.team_b_score) ||
            (match.team_a_score < match.team_b_score! && prediction.team_a_score < prediction.team_b_score) ||
            (match.team_a_score === match.team_b_score! && prediction.team_a_score === prediction.team_b_score)
        );
        const exact = prediction.team_a_score === match.team_a_score && prediction.team_b_score === match.team_b_score;
        if (exact) return { pts: 5, label: '🎯 Exact!', color: '#4facfe' };
        if (correctOutcome) return { pts: 3, label: '✓ Correct', color: '#667eea' };
        return { pts: 0, label: '✗ Wrong', color: 'var(--text-muted)' };
    };
    const result = resultPoints();

    return (
        <div className="match-card">
            {/* Teams row */}
            <div className="match-card-teams">
                <div className="match-team">
                    <div className="match-team-avatar match-team-avatar-a">{avatarLetters(match.team_a)}</div>
                    <span className="match-team-name">{match.team_a}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    {showResult && match.team_a_score !== null ? (
                        <div className="score-result">{match.team_a_score} – {match.team_b_score}</div>
                    ) : (
                        <span className="match-vs-badge">VS</span>
                    )}
                    {result && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: result.color }}>{result.label} +{result.pts}pts</span>
                    )}
                </div>
                <div className="match-team" style={{ justifyContent: 'flex-end' }}>
                    <span className="match-team-name" style={{ textAlign: 'right' }}>{match.team_b}</span>
                    <div className="match-team-avatar match-team-avatar-b">{avatarLetters(match.team_b)}</div>
                </div>
            </div>

            {/* Footer */}
            <div className="match-card-footer">
                <div>
                    <span className="match-time">{formatDT(match.scheduled_time)}</span>
                    {!locked && timeLeft > 0 && (
                        <span className="match-countdown" style={{ marginLeft: '0.75rem' }}>
                            ⏱ {hours}h {minutes}m
                        </span>
                    )}
                    {locked && !showResult && <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#f5576c', fontWeight: 600 }}>🔒 Locked</span>}
                </div>

                {/* Prediction action */}
                {editing && !locked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="number" className="input" style={{ width: '50px', padding: '0.4rem', textAlign: 'center', fontWeight: 700 }}
                            min="0" value={scores.a} onChange={e => setScores({ ...scores, a: parseInt(e.target.value) || 0 })} />
                        <span style={{ color: 'var(--text-muted)' }}>–</span>
                        <input type="number" className="input" style={{ width: '50px', padding: '0.4rem', textAlign: 'center', fontWeight: 700 }}
                            min="0" value={scores.b} onChange={e => setScores({ ...scores, b: parseInt(e.target.value) || 0 })} />
                        <button className="btn btn-success btn-sm" onClick={handleSave} disabled={saving}>{saving ? '…' : 'Save'}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                ) : prediction && !editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>My pick:</span>
                        <span style={{ fontWeight: 700, color: '#667eea', fontSize: '0.95rem' }}>
                            {prediction.team_a_score} – {prediction.team_b_score}
                        </span>
                        {!locked && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
                        )}
                    </div>
                ) : !locked ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>+ Predict</button>
                ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No prediction made</span>
                )}
            </div>
        </div>
    );
}
