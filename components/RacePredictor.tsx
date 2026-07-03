'use client';

import { useState, useEffect } from 'react';
import type { RaceSession } from '@/lib/types';

interface Driver {
    id: string;
    driver_name: string;
    team_name: string | null;
    number: number | null;
}

interface Props {
    tournamentId: string;
    matchId: string;
    raceSession: RaceSession | null;
    value: { p1: string; p2: string; p3: string } | null;
    onChange: (p1: string, p2: string, p3: string) => void;
    disabled?: boolean;
}

const SLOT_CONFIG = [
    { pos: 'p1', label: 'P1', icon: '🥇', color: '#fbbf24', glow: 'rgba(251,191,36,0.35)', border: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.08)' },
    { pos: 'p2', label: 'P2', icon: '🥈', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', border: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.06)' },
    { pos: 'p3', label: 'P3', icon: '🥉', color: '#b45309', glow: 'rgba(180,83,9,0.3)', border: 'rgba(180,83,9,0.4)', bg: 'rgba(180,83,9,0.06)' },
] as const;

const SESSION_LABELS: Record<string, string> = {
    qualifying: '⚡ Qualifying',
    sprint_qualifying: '⚡ Sprint Quali',
    sprint: '🔰 Sprint Race',
    race: '🏁 Grand Prix',
};

export default function RacePredictor({ tournamentId, matchId, raceSession, value, onChange, disabled }: Props) {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/race-drivers?tournamentId=${tournamentId}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setDrivers(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [tournamentId]);

    const current = value ?? { p1: '', p2: '', p3: '' };

    const handleChange = (slot: 'p1' | 'p2' | 'p3', driver: string) => {
        const next = { ...current, [slot]: driver };
        // Clear duplicate selections
        if (slot !== 'p1' && next.p1 === driver) next.p1 = '';
        if (slot !== 'p2' && next.p2 === driver) next.p2 = '';
        if (slot !== 'p3' && next.p3 === driver) next.p3 = '';
        onChange(next.p1, next.p2, next.p3);
    };

    const isComplete = current.p1 && current.p2 && current.p3;

    if (loading) {
        return (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading driver roster…
            </div>
        );
    }

    if (drivers.length === 0) {
        return (
            <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                color: '#f97316',
            }}>
                ⚠️ No drivers in roster — league admin needs to add drivers first.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
            {raceSession && (
                <div style={{
                    fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>
                    {SESSION_LABELS[raceSession] ?? raceSession} — Predict the podium
                </div>
            )}

            {SLOT_CONFIG.map(({ pos, label, icon, color, glow, border, bg }) => {
                const selected = current[pos as 'p1' | 'p2' | 'p3'];
                const usedByOther = [
                    pos !== 'p1' ? current.p1 : '',
                    pos !== 'p2' ? current.p2 : '',
                    pos !== 'p3' ? current.p3 : '',
                ].filter(Boolean);

                return (
                    <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: selected ? bg : 'var(--bg-tertiary)',
                            border: `1px solid ${selected ? border : 'var(--border-color)'}`,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: selected ? `0 0 10px ${glow}` : 'none',
                            transition: 'all 0.15s ease',
                            fontSize: '0.65rem',
                        }}>
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
                            <span style={{ color, fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em' }}>{label}</span>
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
                            <select
                                disabled={disabled}
                                value={selected}
                                onChange={e => handleChange(pos as 'p1' | 'p2' | 'p3', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${selected ? border : 'var(--border-color)'}`,
                                    background: selected ? bg : 'var(--bg-tertiary)',
                                    color: selected ? color : 'var(--text-secondary)',
                                    fontWeight: selected ? 700 : 400,
                                    fontSize: '0.88rem',
                                    cursor: disabled ? 'default' : 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.15s ease',
                                    boxShadow: selected ? `0 0 8px ${glow}` : 'none',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                }}
                            >
                                <option value="">— Pick driver —</option>
                                {drivers.map(d => (
                                    <option
                                        key={d.id}
                                        value={d.driver_name}
                                        disabled={usedByOther.includes(d.driver_name)}
                                    >
                                        {d.number ? `#${d.number} ` : ''}{d.driver_name}{d.team_name ? ` (${d.team_name})` : ''}
                                    </option>
                                ))}
                            </select>
                            <div style={{
                                position: 'absolute', right: '0.65rem', top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none', color: 'var(--text-muted)',
                                fontSize: '0.7rem',
                            }}>▾</div>
                        </div>
                    </div>
                );
            })}

            {isComplete && (
                <div style={{
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    color: '#10b981',
                    fontWeight: 600,
                    display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap',
                }}>
                    🏎️ Podium: <span style={{ color: '#fbbf24' }}>{current.p1}</span>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <span style={{ color: '#94a3b8' }}>{current.p2}</span>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <span style={{ color: '#b45309' }}>{current.p3}</span>
                </div>
            )}
        </div>
    );
}
