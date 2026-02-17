'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Tournament {
    id: string;
    name: string;
    join_code: string;
    created_at: number;
    sport: string;
}

export default function TournamentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session) {
            fetchTournaments();
        }
    }, [session]);

    const fetchTournaments = async () => {
        try {
            const res = await fetch('/api/tournaments');
            const data = await res.json();
            setTournaments(data);
        } catch (error) {
            console.error('Failed to fetch tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/tournaments/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
            });
            const data = await res.json();
            if (res.ok) {
                setJoinCode('');
                setShowJoinForm(false);
                fetchTournaments();
            } else {
                setError(data.error || 'Failed to join tournament');
            }
        } catch (error) {
            setError('An error occurred. Please try again.');
        }
    };

    if (status === 'loading' || loading) {
        return <div className="container" style={{ paddingTop: '4rem' }}><div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div></div>;
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="flex justify-between items-center mb-3">
                <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: 0 }}>My Tournaments</h1>
                <div className="flex gap-2">
                    {((session?.user as any).role === 'premium' || (session?.user as any).role === 'admin') && (
                        <Link href="/premium" className="btn btn-secondary">
                            Premium Dashboard
                        </Link>
                    )}
                    <Link href="/profile" className="btn btn-secondary">My Profile</Link>
                    <button className="btn btn-secondary" onClick={() => signOut()}>Sign Out</button>
                </div>
            </div>

            <div className="mb-3">
                <button className="btn btn-primary" onClick={() => setShowJoinForm(!showJoinForm)}>
                    + Join Tournament
                </button>
            </div>

            {showJoinForm && (
                <div className="card mb-3">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>Join Tournament</h2>
                    <form onSubmit={handleJoinTournament}>
                        <div className="form-group">
                            <label className="form-label">Tournament Code</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter 6-character code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                required
                            />
                        </div>
                        {error && (
                            <div style={{ padding: 'var(--spacing-sm)', background: 'rgba(245, 87, 108, 0.1)', border: '1px solid rgba(245, 87, 108, 0.3)', borderRadius: 'var(--radius-sm)', color: '#f5576c', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}
                        <div className="flex gap-1">
                            <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Join</button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowJoinForm(false); setError(''); }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-2">
                {tournaments.map((tournament) => (
                    <div key={tournament.id} className="card">
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>{tournament.name}</h3>
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>
                            Joined {new Date(tournament.created_at * 1000).toLocaleDateString()} • <span className="badge badge-secondary" style={{ background: 'rgba(102, 126, 234, 0.1)', color: '#667eea', border: 'none', padding: '2px 6px', fontSize: '0.75rem' }}>{tournament.sport}</span>
                        </p>
                        <div className="flex gap-1">
                            <Link href={`/predictions/${tournament.id}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>
                                Make Predictions
                            </Link>
                            <Link href={`/leaderboard/${tournament.id}`} className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                                Leaderboard
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {tournaments.length === 0 && !showJoinForm && (
                <div className="card text-center">
                    <p className="text-muted" style={{ fontSize: '1.125rem' }}>
                        You haven't joined any tournaments yet. Click "Join Tournament" to get started!
                    </p>
                </div>
            )}
        </div>
    );
}
