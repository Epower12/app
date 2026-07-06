'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface TeamDetail {
    id: string;
    name: string;
    sport_type: string;
    my_role: 'coach' | 'manager' | 'player' | null;
}

export default function TeamDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ teamId: string }>();
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') router.push(`/login?next=/teams/${params.teamId}`);
    }, [status, router, params.teamId]);

    useEffect(() => {
        if (!session) return;
        fetch(`/api/teams/${params.teamId}`)
            .then(async res => {
                if (!res.ok) throw new Error((await res.json()).error || 'Failed to load team');
                return res.json();
            })
            .then(setTeam)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [session, params.teamId]);

    if (status === 'loading' || loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    if (error || !team) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {error || 'Team not found'}
                </div>
            </div>
        );
    }

    const canManageRoster = team.my_role === 'coach' || team.my_role === 'manager' || (session?.user as any)?.role === 'admin';

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{team.name}</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'capitalize' }}>
                    {team.sport_type} · your role: {team.my_role ?? 'super admin'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href={`/teams/${team.id}/roster`} className="btn btn-primary">
                        {canManageRoster ? 'Manage roster' : 'View roster'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
