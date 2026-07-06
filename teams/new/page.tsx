'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';

const SPORTS = ['hockey', 'football', 'basketball', 'volleyball', 'other'];

export default function NewTeamPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [name, setName] = useState('');
    const [sportType, setSportType] = useState('hockey');
    const [role, setRole] = useState<'coach' | 'manager'>('coach');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?next=/teams/new');
    }, [status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, sportType, role }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to create team');
                return;
            }
            router.push(`/teams/${data.id}`);
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') return null;

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Create a team</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Team name</label>
                        <input
                            id="name" type="text" className="input" required
                            value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. Riga Wolves"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="sportType">Sport</label>
                        <select id="sportType" className="input" value={sportType} onChange={e => setSportType(e.target.value)}>
                            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Your role on this team</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <input type="radio" name="role" checked={role === 'coach'} onChange={() => setRole('coach')} />
                                Coach
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <input type="radio" name="role" checked={role === 'manager'} onChange={() => setRole('manager')} />
                                Manager
                            </label>
                        </div>
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating…' : 'Create team'}
                    </button>
                </form>
            </div>
        </div>
    );
}
