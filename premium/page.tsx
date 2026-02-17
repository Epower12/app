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
    is_active: boolean;
    sport: string;
}

interface Match {
    id: string;
    tournament_id: string;
    team_a: string;
    team_b: string;
    scheduled_time: number;
    team_a_score: number | null;
    team_b_score: number | null;
    is_finished: boolean;
    sport: string;
}

interface Sport {
    id: string;
    name: string;
}

export default function PremiumPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewTournament, setShowNewTournament] = useState(false);
    const [showNewMatch, setShowNewMatch] = useState(false);
    const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
    const [newTournamentName, setNewTournamentName] = useState('');
    const [newTournamentSport, setNewTournamentSport] = useState('Football');
    const [customSport, setCustomSport] = useState('');
    const [editTournamentName, setEditTournamentName] = useState('');
    const [editTournamentSport, setEditTournamentSport] = useState('');
    const [newMatch, setNewMatch] = useState({
        teamA: '',
        teamB: '',
        sport: 'Football',
        scheduledTime: (() => {
            const d = new Date();
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().slice(0, 16);
        })(),
    });

    useEffect(() => {
        console.log('Premium Page Access Check:', { status, role: session?.user?.role });
        if (status === 'loading') return;

        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (session?.user) {
            const role = (session.user as any).role;
            if (role !== 'premium' && role !== 'admin') {
                console.warn('Access denied: Role is', role);
                router.push('/tournaments');
            }
        }
    }, [session, status, router]);

    useEffect(() => {
        if (session?.user && ((session.user as any).role === 'premium' || (session.user as any).role === 'admin')) {
            fetchTournaments();
            fetchSports();
        }
    }, [session]);

    const fetchSports = async () => {
        try {
            const res = await fetch('/api/sports');
            const data = await res.json();
            setSports(data);
        } catch (error) {
            console.error('Failed to fetch sports:', error);
        }
    };

    useEffect(() => {
        if (selectedTournament) {
            fetchMatches(selectedTournament);
        }
    }, [selectedTournament]);

    const fetchTournaments = async () => {
        try {
            const res = await fetch('/api/tournaments');
            const data = await res.json();
            setTournaments(data);
            if (data.length > 0 && !selectedTournament) {
                setSelectedTournament(data[0].id);
                setNewMatch(prev => ({ ...prev, sport: data[0].sport || 'Football' }));
            }
        } catch (error) {
            console.error('Failed to fetch tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMatches = async (tournamentId: string) => {
        try {
            const res = await fetch(`/api/matches?tournamentId=${tournamentId}`);
            const data = await res.json();
            setMatches(data);
        } catch (error) {
            console.error('Failed to fetch matches:', error);
        }
    };

    const handleCustomSport = async (selectedSport: string, customName: string) => {
        if (selectedSport === 'Add New Sport...') {
            if (!customName.trim()) {
                alert('Please enter a name for the new sport');
                return null;
            }
            try {
                const res = await fetch('/api/sports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: customName.trim() }),
                });
                const data = await res.json();
                if (res.ok) {
                    await fetchSports();
                    setCustomSport('');
                    return data.name;
                } else {
                    alert(data.error || 'Failed to add custom sport');
                    return null;
                }
            } catch (error) {
                console.error('Failed to add custom sport:', error);
                return null;
            }
        }
        return selectedSport;
    };

    const createTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let sportToSave = await handleCustomSport(newTournamentSport, customSport);
            if (!sportToSave) return;

            const res = await fetch('/api/tournaments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTournamentName, sport: sportToSave }),
            });
            if (res.ok) {
                setNewTournamentName('');
                setShowNewTournament(false);
                fetchTournaments();
            }
        } catch (error) {
            console.error('Failed to create tournament:', error);
        }
    };

    const updateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTournamentId) return;

        try {
            let sportToSave = await handleCustomSport(editTournamentSport, customSport);
            if (!sportToSave) return;

            const res = await fetch(`/api/tournaments/${editingTournamentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editTournamentName, sport: sportToSave }),
            });
            if (res.ok) {
                setEditingTournamentId(null);
                fetchTournaments();
            } else {
                const data = await res.json();
                alert(`Failed to update tournament: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to update tournament:', error);
        }
    };

    const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

    const createMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let sportToSave = await handleCustomSport(newMatch.sport, customSport);
            if (!sportToSave) return;

            const scheduledTime = Math.floor(new Date(newMatch.scheduledTime).getTime() / 1000);
            const res = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId: selectedTournament,
                    teamA: newMatch.teamA,
                    teamB: newMatch.teamB,
                    scheduledTime,
                    sport: sportToSave,
                }),
            });
            if (res.ok) {
                setNewMatch({ teamA: '', teamB: '', sport: selectedTournamentData?.sport || 'Football', scheduledTime: '' });
                setShowNewMatch(false);
                if (selectedTournament) fetchMatches(selectedTournament);
            }
        } catch (error) {
            console.error('Failed to create match:', error);
        }
    };

    const updateMatchResult = async (matchId: string, teamAScore: number, teamBScore: number) => {
        try {
            const res = await fetch(`/api/matches/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_a_score: teamAScore,
                    team_b_score: teamBScore,
                    is_finished: true,
                }),
            });
            if (res.ok && selectedTournament) {
                await fetchMatches(selectedTournament);
            } else {
                const data = await res.json();
                alert(`Failed to update result: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to update match:', error);
            alert('Failed to update result. Please check your connection.');
        }
    };

    const updateMatchDetails = async (matchId: string, teamA: string, teamB: string, scheduledTime: string) => {
        try {
            const scheduledTimeUnix = Math.floor(new Date(scheduledTime).getTime() / 1000);
            const res = await fetch(`/api/matches/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_a: teamA,
                    team_b: teamB,
                    scheduled_time: scheduledTimeUnix,
                }),
            });
            if (res.ok && selectedTournament) {
                await fetchMatches(selectedTournament);
            } else {
                const data = await res.json();
                alert(`Failed to update match details: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to update match details:', error);
            alert('Failed to update match details. Please check your connection.');
        }
    };

    if (status === 'loading' || loading) {
        return <div className="container" style={{ paddingTop: '4rem' }}><div className="loading" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div></div>;
    }


    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="flex justify-between items-center mb-3">
                <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: 0 }}>Premium Dashboard</h1>
                <div className="flex gap-2">
                    <Link href="/tournaments" className="btn btn-secondary">Back to Tournaments</Link>
                    <button className="btn btn-secondary" onClick={() => signOut()}>Sign Out</button>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="card">
                    <div className="flex justify-between items-center mb-2">
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tournaments</h2>
                        <button className="btn btn-primary" onClick={() => setShowNewTournament(!showNewTournament)}>
                            + New
                        </button>
                    </div>

                    {showNewTournament && (
                        <form onSubmit={createTournament} className="mb-2">
                            <div className="form-group">
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Tournament name"
                                    value={newTournamentName}
                                    onChange={(e) => setNewTournamentName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sport</label>
                                <select
                                    className="input"
                                    value={newTournamentSport}
                                    onChange={(e) => setNewTournamentSport(e.target.value)}
                                >
                                    {sports.map((sport) => (
                                        <option key={sport.id} value={sport.name}>{sport.name}</option>
                                    ))}
                                    <option value="Add New Sport...">+ Add New Sport...</option>
                                </select>
                            </div>
                            {newTournamentSport === 'Add New Sport...' && (
                                <div className="form-group">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Enter new sport name"
                                        value={customSport}
                                        onChange={(e) => setCustomSport(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <div className="flex gap-1">
                                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Create</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewTournament(false)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {tournaments.map((tournament) => (
                            <div
                                key={tournament.id}
                                className="card"
                                style={{
                                    padding: 'var(--spacing-md)',
                                    cursor: 'pointer',
                                    border: selectedTournament === tournament.id ? '2px solid #667eea' : '1px solid var(--border-color)',
                                    position: 'relative'
                                }}
                                onClick={() => setSelectedTournament(tournament.id)}
                            >
                                {editingTournamentId === tournament.id ? (
                                    <form onSubmit={updateTournament} onClick={(e) => e.stopPropagation()}>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="input"
                                                value={editTournamentName}
                                                onChange={(e) => setEditTournamentName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <select
                                                className="input"
                                                value={editTournamentSport}
                                                onChange={(e) => setEditTournamentSport(e.target.value)}
                                            >
                                                {sports.map((sport) => (
                                                    <option key={sport.id} value={sport.name}>{sport.name}</option>
                                                ))}
                                                <option value="Add New Sport...">+ Add New Sport...</option>
                                            </select>
                                        </div>
                                        {editTournamentSport === 'Add New Sport...' && (
                                            <div className="form-group">
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="Enter new sport name"
                                                    value={customSport}
                                                    onChange={(e) => setCustomSport(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}
                                        <div className="flex gap-1">
                                            <button type="submit" className="btn btn-success btn-sm" style={{ flex: 1 }}>Save</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingTournamentId(null)}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{tournament.name}</h3>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                style={{ padding: '2px 8px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTournamentId(tournament.id);
                                                    setEditTournamentName(tournament.name);
                                                    setEditTournamentSport(tournament.sport);
                                                }}
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-1 items-center">
                                                <span className="badge badge-primary">Code: {tournament.join_code}</span>
                                                <span className="badge badge-secondary" style={{ background: 'rgba(102, 126, 234, 0.1)', color: '#667eea', border: 'none' }}>{tournament.sport}</span>
                                            </div>
                                            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                {new Date(tournament.created_at * 1000).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
                        Match Details (Premium only)
                    </h2>
                    {selectedTournamentData && (
                        <div>
                            <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{selectedTournamentData.name}</h3>
                                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                    Share this code with friends to join:
                                </p>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#667eea', letterSpacing: '0.2em' }}>
                                    {selectedTournamentData.join_code}
                                </div>
                                <div className="mt-1">
                                    <span className="badge badge-secondary" style={{ background: '#667eea', color: 'white' }}>{selectedTournamentData.sport}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedTournament && (
                <div className="card">
                    <div className="flex justify-between items-center mb-2">
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Matches</h2>
                        <button className="btn btn-primary" onClick={() => setShowNewMatch(!showNewMatch)}>
                            + Add Match
                        </button>
                    </div>

                    {showNewMatch && (
                        <form onSubmit={createMatch} className="mb-2" style={{ background: 'var(--bg-tertiary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Team A</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Team A name"
                                        value={newMatch.teamA}
                                        onChange={(e) => setNewMatch({ ...newMatch, teamA: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Team B</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Team B name"
                                        value={newMatch.teamB}
                                        onChange={(e) => setNewMatch({ ...newMatch, teamB: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Scheduled Time (24h)</label>
                                <div className="flex gap-1">
                                    <input
                                        type="date"
                                        className="input"
                                        style={{ flex: 2 }}
                                        value={newMatch.scheduledTime.split('T')[0] || ''}
                                        onChange={(e) => {
                                            const time = newMatch.scheduledTime.split('T')[1] || '12:00';
                                            setNewMatch({ ...newMatch, scheduledTime: `${e.target.value}T${time}` });
                                        }}
                                        required
                                    />
                                    <select
                                        className="input"
                                        style={{ flex: 1 }}
                                        value={newMatch.scheduledTime.split('T')[1]?.split(':')[0] || '12'}
                                        onChange={(e) => {
                                            const parts = newMatch.scheduledTime.split('T');
                                            const date = parts[0] || new Date().toISOString().split('T')[0];
                                            const minute = parts[1]?.split(':')[1] || '00';
                                            setNewMatch({ ...newMatch, scheduledTime: `${date}T${e.target.value}:${minute}` });
                                        }}
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="input"
                                        style={{ flex: 1 }}
                                        value={newMatch.scheduledTime.split('T')[1]?.split(':')[1] || '00'}
                                        onChange={(e) => {
                                            const parts = newMatch.scheduledTime.split('T');
                                            const date = parts[0] || new Date().toISOString().split('T')[0];
                                            const hour = parts[1]?.split(':')[0] || '12';
                                            setNewMatch({ ...newMatch, scheduledTime: `${date}T${hour}:${e.target.value}` });
                                        }}
                                    >
                                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sport Selection</label>
                                <select
                                    className="input"
                                    value={newMatch.sport}
                                    onChange={(e) => setNewMatch({ ...newMatch, sport: e.target.value })}
                                >
                                    {sports.map((sport) => (
                                        <option key={sport.id} value={sport.name}>{sport.name}</option>
                                    ))}
                                    <option value="Add New Sport...">+ Add New Sport...</option>
                                </select>
                            </div>
                            {newMatch.sport === 'Add New Sport...' && (
                                <div className="form-group">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Enter new sport name"
                                        value={customSport}
                                        onChange={(e) => setCustomSport(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <div className="flex gap-1">
                                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Create Match</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewMatch(false)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {matches.map((match) => (
                            <MatchCard key={match.id} match={match} onUpdate={updateMatchResult} onUpdateDetails={updateMatchDetails} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MatchCard({ match, onUpdate, onUpdateDetails }: {
    match: Match;
    onUpdate: (id: string, scoreA: number, scoreB: number) => void;
    onUpdateDetails: (id: string, teamA: string, teamB: string, scheduledTime: string) => void;
}) {
    const [editingResult, setEditingResult] = useState(false);
    const [editingDetails, setEditingDetails] = useState(false);
    const [scores, setScores] = useState({ teamA: match.team_a_score ?? 0, teamB: match.team_b_score ?? 0 });
    const [details, setDetails] = useState({
        teamA: match.team_a,
        teamB: match.team_b,
        scheduledTime: (() => {
            const d = new Date(match.scheduled_time * 1000);
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().slice(0, 16);
        })(),
    });

    // Sync state when props change (e.g., after a successful save and re-fetch)
    useEffect(() => {
        setDetails({
            teamA: match.team_a,
            teamB: match.team_b,
            scheduledTime: (() => {
                const d = new Date(match.scheduled_time * 1000);
                const offset = d.getTimezoneOffset() * 60000;
                return new Date(d.getTime() - offset).toISOString().slice(0, 16);
            })(),
        });
        setScores({
            teamA: match.team_a_score ?? 0,
            teamB: match.team_b_score ?? 0,
        });
    }, [match]);

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmitResult = async () => {
        setIsSaving(true);
        await onUpdate(match.id, scores.teamA, scores.teamB);
        setIsSaving(false);
        setEditingResult(false);
    };

    const handleSubmitDetails = async () => {
        setIsSaving(true);
        await onUpdateDetails(match.id, details.teamA, details.teamB, details.scheduledTime);
        setIsSaving(false);
        setEditingDetails(false);
    };

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
            {editingDetails ? (
                <div>
                    <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Team A</label>
                            <input
                                type="text"
                                className="input"
                                value={details.teamA}
                                onChange={(e) => setDetails({ ...details, teamA: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Team B</label>
                            <input
                                type="text"
                                className="input"
                                value={details.teamB}
                                onChange={(e) => setDetails({ ...details, teamB: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Scheduled Time (24h)</label>
                        <div className="flex gap-1">
                            <input
                                type="date"
                                className="input"
                                style={{ flex: 2 }}
                                value={details.scheduledTime.split('T')[0] || ''}
                                onChange={(e) => {
                                    const time = details.scheduledTime.split('T')[1] || '12:00';
                                    setDetails({ ...details, scheduledTime: `${e.target.value}T${time}` });
                                }}
                                required
                            />
                            <select
                                className="input"
                                style={{ flex: 1 }}
                                value={details.scheduledTime.split('T')[1]?.split(':')[0] || '12'}
                                onChange={(e) => {
                                    const parts = details.scheduledTime.split('T');
                                    const date = parts[0] || new Date().toISOString().split('T')[0];
                                    const minute = parts[1]?.split(':')[1] || '00';
                                    setDetails({ ...details, scheduledTime: `${date}T${e.target.value}:${minute}` });
                                }}
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            <select
                                className="input"
                                style={{ flex: 1 }}
                                value={details.scheduledTime.split('T')[1]?.split(':')[1] || '00'}
                                onChange={(e) => {
                                    const parts = details.scheduledTime.split('T');
                                    const date = parts[0] || new Date().toISOString().split('T')[0];
                                    const hour = parts[1]?.split(':')[0] || '12';
                                    setDetails({ ...details, scheduledTime: `${date}T${hour}:${e.target.value}` });
                                }}
                            >
                                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button className="btn btn-success" onClick={handleSubmitDetails} disabled={isSaving} style={{ flex: 1 }}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => {
                            setEditingDetails(false);
                            setDetails({
                                teamA: match.team_a,
                                teamB: match.team_b,
                                scheduledTime: (() => {
                                    const d = new Date(match.scheduled_time * 1000);
                                    const offset = d.getTimezoneOffset() * 60000;
                                    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                                })(),
                            });
                        }}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{match.team_a}</span>
                            <span className="text-muted">vs</span>
                            <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{match.team_b}</span>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                            {formatDateTime(match.scheduled_time)} • <span style={{ color: 'var(--primary-color)' }}>{match.sport}</span>
                        </div>
                    </div>

                    {editingResult ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="input"
                                style={{ width: '60px', padding: '0.5rem' }}
                                value={scores.teamA}
                                onChange={(e) => setScores({ ...scores, teamA: parseInt(e.target.value) || 0 })}
                                min="0"
                            />
                            <span>-</span>
                            <input
                                type="number"
                                className="input"
                                style={{ width: '60px', padding: '0.5rem' }}
                                value={scores.teamB}
                                onChange={(e) => setScores({ ...scores, teamB: parseInt(e.target.value) || 0 })}
                                min="0"
                            />
                            <button className="btn btn-success" onClick={handleSubmitResult} disabled={isSaving}>
                                {isSaving ? '...' : 'Save'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setEditingResult(false)}>Cancel</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button className="btn btn-secondary" onClick={() => setEditingDetails(true)} style={{ fontSize: '0.875rem' }}>
                                ✏️ Edit Match
                            </button>
                            {match.is_finished ? (
                                <>
                                    <span className="badge badge-success">
                                        {match.team_a_score} - {match.team_b_score}
                                    </span>
                                    <button className="btn btn-secondary" onClick={() => setEditingResult(true)}>Edit Result</button>
                                </>
                            ) : (
                                <button className="btn btn-primary" onClick={() => setEditingResult(true)}>Set Result</button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
