'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface TeamListItem {
    id: string;
    name: string;
    sport_type: string;
    my_role: 'coach' | 'manager' | 'player';
}

export default function TeamsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [teams, setTeams] = useState<TeamListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?next=/teams');
    }, [status, router]);

    useEffect(() => {
        if (!session) return;
        fetch('/api/teams')
            .then(res => res.json())
            .then(setTeams)
            .catch(() => setError('Could not load your teams.'))
            .finally(() => setLoading(false));
    }, [session]);

    const isSuperAdmin = (session?.user as any)?.role === 'admin';

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Your teams</h1>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {isSuperAdmin && (
                            <Link href="/teams/admin" className="btn">All teams (admin)</Link>
                        )}
                        <Link href="/teams/new" className="btn btn-primary">Create a team</Link>
                    </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {teams.length === 0 && !error && (
                    <p style={{ color: 'var(--text-muted)' }}>
                        You&apos;re not part of any team yet. Create one, or use an invite link from a coach/manager.
                    </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teams.map(team => (
                        <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem 1.25rem', borderRadius: 12,
                                border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 700 }}>{team.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{team.sport_type}</div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'capitalize' }}>
                                {team.my_role}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
