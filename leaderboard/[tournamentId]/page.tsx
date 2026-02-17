'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
    userId: string;
    username: string;
    totalPoints: number;
    predictions: {
        matchId: string;
        teamA: string;
        teamB: string;
        predictedScoreA: number;
        predictedScoreB: number;
        actualScoreA: number | null;
        actualScoreB: number | null;
        points: number;
    }[];
}

export default function LeaderboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredUser, setHoveredUser] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session && tournamentId) {
            fetchLeaderboard();
        }
    }, [session, tournamentId]);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`/api/leaderboard/${tournamentId}`);
            const data = await res.json();
            setLeaderboard(data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className="container" style={{ paddingTop: '4rem' }}><div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div></div>;
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="flex justify-between items-center mb-3">
                <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: 0 }}>Leaderboard</h1>
                <Link href="/tournaments" className="btn btn-secondary">Back to Tournaments</Link>
            </div>

            <div className="card">
                {leaderboard.length === 0 ? (
                    <div className="text-center">
                        <p className="text-muted" style={{ fontSize: '1.125rem' }}>
                            No predictions yet. Be the first to make a prediction!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {leaderboard.map((entry, index) => (
                            <div
                                key={entry.userId}
                                className="tooltip"
                                onMouseEnter={() => setHoveredUser(entry.userId)}
                                onMouseLeave={() => setHoveredUser(null)}
                            >
                                <div
                                    className="card"
                                    style={{
                                        padding: 'var(--spacing-md)',
                                        background: index === 0 ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' :
                                            index === 1 ? 'linear-gradient(135deg, rgba(74, 172, 254, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%)' :
                                                index === 2 ? 'linear-gradient(135deg, rgba(250, 112, 154, 0.15) 0%, rgba(254, 225, 64, 0.15) 100%)' :
                                                    'var(--bg-card)',
                                        border: session?.user.id === entry.userId ? '2px solid #667eea' : '1px solid var(--border-color)',
                                    }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                                                        index === 1 ? 'linear-gradient(135deg, #C0C0C0, #808080)' :
                                                            index === 2 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' :
                                                                'var(--bg-tertiary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.25rem',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                                                    {entry.username}
                                                    {session?.user.id === entry.userId && (
                                                        <span className="badge badge-primary" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>You</span>
                                                    )}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                    {entry.predictions.filter(p => p.actualScoreA !== null).length} predictions scored
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                {entry.totalPoints}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Points
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {hoveredUser === entry.userId && entry.predictions.filter(p => p.actualScoreA !== null).length > 0 && (
                                    <div className="tooltip-content" style={{ width: '400px', maxWidth: '90vw' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                                            {entry.username}'s Predictions
                                        </h4>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                            {entry.predictions
                                                .filter(p => p.actualScoreA !== null)
                                                .map((pred) => (
                                                    <div
                                                        key={pred.matchId}
                                                        style={{
                                                            padding: 'var(--spacing-xs)',
                                                            background: 'var(--bg-tertiary)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: '0.875rem',
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                                            {pred.teamA} vs {pred.teamB}
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted">
                                                                Predicted: {pred.predictedScoreA}-{pred.predictedScoreB}
                                                            </span>
                                                            <span className="text-muted">
                                                                Actual: {pred.actualScoreA}-{pred.actualScoreB}
                                                            </span>
                                                        </div>
                                                        <div style={{ marginTop: '0.25rem' }}>
                                                            <span
                                                                className="badge"
                                                                style={{
                                                                    background: pred.points === 5 ? 'var(--success-gradient)' :
                                                                        pred.points === 3 ? 'var(--primary-gradient)' :
                                                                            pred.points === 2 ? 'var(--warning-gradient)' :
                                                                                'var(--bg-secondary)',
                                                                    fontSize: '0.75rem',
                                                                }}
                                                            >
                                                                {pred.points === 5 ? '🎯 Exact' :
                                                                    pred.points === 3 ? '✓ Diff' :
                                                                        pred.points === 2 ? '✓ Winner' :
                                                                            '✗ Miss'} ({pred.points} pts)
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
