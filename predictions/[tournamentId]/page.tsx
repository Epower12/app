'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Match {
    id: string;
    team_a: string;
    team_b: string;
    scheduled_time: number;
    team_a_score: number | null;
    team_b_score: number | null;
    is_finished: boolean;
}

interface Prediction {
    id: string;
    match_id: string;
    team_a_score: number;
    team_b_score: number;
}

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [matches, setMatches] = useState<Match[]>([]);
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session && tournamentId) {
            fetchData();
        }
    }, [session, tournamentId]);

    const fetchData = async () => {
        try {
            const [matchesRes, predictionsRes] = await Promise.all([
                fetch(`/api/matches?tournamentId=${tournamentId}`),
                fetch(`/api/predictions?tournamentId=${tournamentId}`),
            ]);
            const matchesData = await matchesRes.json();
            const predictionsData = await predictionsRes.json();

            setMatches(matchesData);
            const predMap: Record<string, Prediction> = {};
            predictionsData.forEach((pred: Prediction) => {
                predMap[pred.match_id] = pred;
            });
            setPredictions(predMap);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitPrediction = async (matchId: string, teamAScore: number, teamBScore: number) => {
        try {
            await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, teamAScore, teamBScore }),
            });
            fetchData();
        } catch (error) {
            console.error('Failed to submit prediction:', error);
        }
    };

    if (status === 'loading' || loading) {
        return <div className="container" style={{ paddingTop: '4rem' }}><div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div></div>;
    }

    const upcomingMatches = matches.filter(m => !m.is_finished && Date.now() / 1000 < m.scheduled_time);
    const ongoingMatches = matches.filter(m => !m.is_finished && Date.now() / 1000 >= m.scheduled_time);
    const finishedMatches = matches.filter(m => m.is_finished);

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="flex justify-between items-center mb-3">
                <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: 0 }}>Predictions</h1>
                <Link href="/tournaments" className="btn btn-secondary">Back to Tournaments</Link>
            </div>

            {upcomingMatches.length > 0 && (
                <div className="mb-3">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>Upcoming Matches</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {upcomingMatches.map((match) => (
                            <PredictionCard
                                key={match.id}
                                match={match}
                                prediction={predictions[match.id]}
                                onSubmit={submitPrediction}
                            />
                        ))}
                    </div>
                </div>
            )}

            {ongoingMatches.length > 0 && (
                <div className="mb-3">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>Live / Locked</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {ongoingMatches.map((match) => (
                            <PredictionCard
                                key={match.id}
                                match={match}
                                prediction={predictions[match.id]}
                                onSubmit={submitPrediction}
                                locked
                            />
                        ))}
                    </div>
                </div>
            )}

            {finishedMatches.length > 0 && (
                <div className="mb-3">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>Finished Matches</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {finishedMatches.map((match) => (
                            <PredictionCard
                                key={match.id}
                                match={match}
                                prediction={predictions[match.id]}
                                onSubmit={submitPrediction}
                                locked
                                showResult
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PredictionCard({
    match,
    prediction,
    onSubmit,
    locked = false,
    showResult = false,
}: {
    match: Match;
    prediction?: Prediction;
    onSubmit: (matchId: string, teamAScore: number, teamBScore: number) => void;
    locked?: boolean;
    showResult?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [scores, setScores] = useState({
        teamA: prediction?.team_a_score ?? 0,
        teamB: prediction?.team_b_score ?? 0,
    });

    const handleSubmit = () => {
        onSubmit(match.id, scores.teamA, scores.teamB);
        setEditing(false);
    };

    const timeUntil = Math.floor((match.scheduled_time * 1000 - Date.now()) / 1000);
    const hours = Math.floor(timeUntil / 3600);
    const minutes = Math.floor((timeUntil % 3600) / 60);

    // Format date/time in 24-hour format
    const formatDateTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
            <div className="flex justify-between items-center mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{match.team_a}</span>
                        <span className="text-muted">vs</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{match.team_b}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {formatDateTime(match.scheduled_time)}
                        {!locked && timeUntil > 0 && (
                            <span style={{ marginLeft: '1rem', color: '#4facfe' }}>
                                ⏱ {hours}h {minutes}m remaining
                            </span>
                        )}
                    </div>
                </div>
                {locked && <span className="badge badge-warning">🔒 Locked</span>}
            </div>

            {showResult && match.team_a_score !== null && match.team_b_score !== null && (
                <div style={{ padding: 'var(--spacing-sm)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--spacing-sm)' }}>
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Final Score: </span>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#4facfe' }}>
                        {match.team_a_score} - {match.team_b_score}
                    </span>
                </div>
            )}

            {editing && !locked ? (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label">{match.team_a}</label>
                            <input
                                type="number"
                                className="input"
                                value={scores.teamA}
                                onChange={(e) => setScores({ ...scores, teamA: parseInt(e.target.value) || 0 })}
                                min="0"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label">{match.team_b}</label>
                            <input
                                type="number"
                                className="input"
                                value={scores.teamB}
                                onChange={(e) => setScores({ ...scores, teamB: parseInt(e.target.value) || 0 })}
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button className="btn btn-success" onClick={handleSubmit} style={{ flex: 1 }}>Save Prediction</button>
                        <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    {prediction ? (
                        <div className="flex items-center gap-2">
                            <span className="text-muted" style={{ fontSize: '0.875rem' }}>Your prediction:</span>
                            <span className="badge badge-primary" style={{ fontSize: '1rem' }}>
                                {prediction.team_a_score} - {prediction.team_b_score}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>No prediction yet</span>
                    )}
                    {!locked && (
                        <button className="btn btn-primary" onClick={() => setEditing(true)}>
                            {prediction ? 'Edit' : 'Predict'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
