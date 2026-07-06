'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';

interface PlayerRow {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    jersey_number: number | null;
}

export default function RosterPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ teamId: string }>();
    const [players, setPlayers] = useState<PlayerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [canManage, setCanManage] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [position, setPosition] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push(`/login?next=/teams/${params.teamId}/roster`);
    }, [status, router, params.teamId]);

    const loadRoster = () => {
        fetch(`/api/teams/${params.teamId}/players`)
            .then(async res => {
                if (!res.ok) throw new Error((await res.json()).error || 'Failed to load roster');
                return res.json();
            })
            .then(setPlayers)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!session) return;
        fetch(`/api/teams/${params.teamId}`)
            .then(res => res.json())
            .then(team => {
                const role = team.my_role;
                setCanManage(role === 'coach' || role === 'manager' || (session.user as any).role === 'admin');
            });
        loadRoster();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, params.teamId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        setAdding(true);
        try {
            const res = await fetch(`/api/teams/${params.teamId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName, lastName,
                    position: position || undefined,
                    jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAddError(data.error || 'Failed to add player');
                return;
            }
            setFirstName(''); setLastName(''); setPosition(''); setJerseyNumber('');
            loadRoster();
        } catch {
            setAddError('An error occurred. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (playerId: string) => {
        await fetch(`/api/teams/${params.teamId}/players/${playerId}`, { method: 'DELETE' });
        loadRoster();
    };

    if (status === 'loading' || loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Roster</h1>
                {error && <div className="auth-error">{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                    {players.map(p => (
                        <div key={p.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', borderRadius: 10,
                            border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                        }}>
                            <div>
                                <strong>{p.first_name} {p.last_name}</strong>
                                {p.position && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{p.position}</span>}
                                {p.jersey_number != null && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>#{p.jersey_number}</span>}
                            </div>
                            {canManage && (
                                <button type="button" className="btn" onClick={() => handleRemove(p.id)}>Remove</button>
                            )}
                        </div>
                    ))}
                    {players.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No players on the roster yet.</p>}
                </div>

                {canManage && (
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add a player</h2>
                        <input className="input" placeholder="First name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                        <input className="input" placeholder="Last name" required value={lastName} onChange={e => setLastName(e.target.value)} />
                        <input className="input" placeholder="Position (optional)" value={position} onChange={e => setPosition(e.target.value)} />
                        <input className="input" type="number" placeholder="Jersey number (optional)" value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} />
                        {addError && <div className="auth-error">{addError}</div>}
                        <button type="submit" className="btn btn-primary" disabled={adding}>
                            {adding ? 'Adding…' : 'Add player'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
