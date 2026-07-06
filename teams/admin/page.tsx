'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface TeamRow {
    id: string;
    name: string;
    sport_type: string;
    created_by: string;
}

export default function AdminTeamsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [teams, setTeams] = useState<TeamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?next=/teams/admin');
    }, [status, router]);

    useEffect(() => {
        if (!session) return;
        if ((session.user as any).role !== 'admin') {
            router.push('/teams');
            return;
        }
        fetch('/api/teams/admin')
            .then(res => res.json())
            .then(setTeams)
            .catch(() => setError('Could not load teams.'))
            .finally(() => setLoading(false));
    }, [session, router]);

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
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>All teams</h1>
                {error && <div className="auth-error">{error}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teams.map(team => (
                        <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            style={{
                                display: 'block', padding: '1rem 1.25rem', borderRadius: 12,
                                border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            }}
                        >
                            <div style={{ fontWeight: 700 }}>{team.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{team.sport_type}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
