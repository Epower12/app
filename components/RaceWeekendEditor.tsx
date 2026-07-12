'use client';

import { useEffect, useState } from 'react';
import type { RaceSession, RaceBonusConfig } from '@/lib/types';
import { defaultRaceBonusConfig } from '@/lib/types';

export interface RaceWeekendFormState {
    picks: string[];
    pole: string;
    fastestLap: string;
    firstRetirement: string;
    safetyCar: '' | 'yes' | 'no';
    positionsGained: string;
    positionsLost: string;
    winningMargin: '' | 'lt5' | '5to15' | 'gt15';
    retirements: '' | '0' | '1-2' | '3+';
}

export const emptyRaceWeekendForm: RaceWeekendFormState = {
    picks: [],
    pole: '', fastestLap: '', firstRetirement: '', safetyCar: '',
    positionsGained: '', positionsLost: '', winningMargin: '', retirements: '',
};

interface Driver { id: string; driver_name: string; team_name: string | null; number: number | null; }

interface Props {
    tournamentId: string;
    raceSession: RaceSession | null;
    value: RaceWeekendFormState;
    onChange: (next: RaceWeekendFormState) => void;
    mode: 'predict' | 'result';
    disabled?: boolean;
    enabledQuestions?: RaceBonusConfig;
}

const SESSION_LABELS: Record<string, string> = {
    qualifying: 'Qualifying',
    sprint_qualifying: 'Sprint Qualifying',
    sprint: 'Sprint Race',
    race: 'Grand Prix',
};

// Real F1 constructor livery colors — small authentic touch on the driver chips.
const TEAM_COLORS: Record<string, string> = {
    'Red Bull': '#3671C6',
    'Ferrari': '#E8002D',
    'Mercedes': '#27F4D2',
    'McLaren': '#FF8000',
    'Aston Martin': '#00665E',
    'Alpine': '#00A1E8',
    'Williams': '#1868DB',
    'RB': '#6C98FF',
    'AlphaTauri': '#6C98FF',
    'Racing Bulls': '#6C98FF',
    'Sauber': '#52C832',
    'Alfa Romeo': '#52C832',
    'Haas': '#B6BABD',
};
function teamColor(team?: string | null): string {
    if (!team) return '#94a3b8';
    const key = Object.keys(TEAM_COLORS).find(k => team.includes(k));
    return key ? TEAM_COLORS[key] : '#94a3b8';
}

const MARGIN_OPTIONS: { value: 'lt5' | '5to15' | 'gt15'; label: string }[] = [
    { value: 'lt5', label: '< 5s' },
    { value: '5to15', label: '5–15s' },
    { value: 'gt15', label: '> 15s' },
];
const RETIREMENTS_OPTIONS: { value: '0' | '1-2' | '3+'; label: string }[] = [
    { value: '0', label: '0' },
    { value: '1-2', label: '1–2' },
    { value: '3+', label: '3+' },
];

export default function RaceWeekendEditor({ tournamentId, raceSession, value, onChange, mode, disabled, enabledQuestions }: Props) {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMore, setShowMore] = useState(false);
    const q = enabledQuestions ?? defaultRaceBonusConfig();

    useEffect(() => {
        fetch(`/api/race-drivers?tournamentId=${tournamentId}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setDrivers(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [tournamentId]);

    const picks = value.picks;
    const pool = drivers.filter(d => !picks.includes(d.driver_name));
    const showBonus = raceSession === 'race';
    const resultCopy = mode === 'result';

    const setPicks = (next: string[]) => onChange({ ...value, picks: next });

    const addDriver = (name: string) => {
        if (picks.length >= 10 || picks.includes(name)) return;
        setPicks([...picks, name]);
    };
    const removeDriver = (idx: number) => setPicks(picks.filter((_, i) => i !== idx));
    const moveDriver = (idx: number, dir: -1 | 1) => {
        const next = [...picks];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return;
        [next[idx], next[target]] = [next[target], next[idx]];
        setPicks(next);
    };

    if (loading) {
        return <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading driver roster…</div>;
    }
    if (drivers.length === 0) {
        return (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#f97316' }}>
                No drivers in roster — league admin needs to add drivers first.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {raceSession && (
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    {SESSION_LABELS[raceSession] ?? raceSession} — {resultCopy ? 'enter the' : 'predict the'} Top 10{picks.length ? ` (${picks.length}/10)` : ''}
                </div>
            )}

            {/* Ordered Top 10 slots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                    const driver = picks[i];
                    const info = driver ? drivers.find(d => d.driver_name === driver) : null;
                    const accent = teamColor(info?.team_name);
                    return (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-md)',
                            background: driver ? 'var(--bg-card)' : 'var(--bg-tertiary)',
                            border: `1px solid ${driver ? accent + '55' : 'var(--border-color)'}`,
                            borderLeft: driver ? `3px solid ${accent}` : `1px solid var(--border-color)`,
                            minHeight: 40,
                        }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}</span>
                            {driver ? (
                                <>
                                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {driver}
                                    </span>
                                    {!disabled && (
                                        <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                                            <button type="button" onClick={() => moveDriver(i, -1)} disabled={i === 0}
                                                aria-label={`Move ${driver} up`}
                                                style={iconBtnStyle}>▲</button>
                                            <button type="button" onClick={() => moveDriver(i, 1)} disabled={i === picks.length - 1}
                                                aria-label={`Move ${driver} down`}
                                                style={iconBtnStyle}>▼</button>
                                            <button type="button" onClick={() => removeDriver(i)}
                                                aria-label={`Remove ${driver}`}
                                                style={{ ...iconBtnStyle, color: '#f56565' }}>×</button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Driver pool */}
            {!disabled && pool.length > 0 && picks.length < 10 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {pool.map(d => (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => addDriver(d.driver_name)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.35rem 0.65rem', borderRadius: '999px',
                                border: `1px solid ${teamColor(d.team_name)}44`,
                                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: teamColor(d.team_name), display: 'inline-block' }} />
                            {d.number ? `#${d.number} ` : ''}{d.driver_name}
                        </button>
                    ))}
                </div>
            )}

            {/* Bonus questions — main race session only, gated by the league's enabled-questions config */}
            {showBonus && (q.pole || q.fastestLap || q.firstRetirement || q.safetyCar || q.positionsGained || q.positionsLost || q.winningMargin || q.retirements) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                        Bonus predictions
                    </div>

                    {(q.pole || q.fastestLap || q.firstRetirement || q.safetyCar) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                            {q.pole && (
                                <DriverPicker label="Pole position (+3)" drivers={drivers} value={value.pole} disabled={disabled}
                                    onChange={v => onChange({ ...value, pole: v })} />
                            )}
                            {q.fastestLap && (
                                <DriverPicker label="Fastest lap (+3)" drivers={drivers} value={value.fastestLap} disabled={disabled}
                                    onChange={v => onChange({ ...value, fastestLap: v })} />
                            )}
                            {q.firstRetirement && (
                                <DriverPicker label="First retirement (+2)" drivers={drivers} value={value.firstRetirement} disabled={disabled}
                                    onChange={v => onChange({ ...value, firstRetirement: v })} />
                            )}
                            {q.safetyCar && (
                                <div>
                                    <label style={fieldLabelStyle}>Safety car? (+2)</label>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {(['yes', 'no'] as const).map(opt => (
                                            <button key={opt} type="button" disabled={disabled}
                                                onClick={() => onChange({ ...value, safetyCar: value.safetyCar === opt ? '' : opt })}
                                                style={pillStyle(value.safetyCar === opt)}>
                                                {opt === 'yes' ? 'Yes' : 'No'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(q.positionsGained || q.positionsLost || q.winningMargin || q.retirements) && (
                        <>
                            <button type="button" onClick={() => setShowMore(s => !s)}
                                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                {showMore ? 'Hide extra bonus predictions' : 'More bonus predictions (optional)'}
                            </button>

                            {showMore && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                                    {q.positionsGained && (
                                        <DriverPicker label="Most positions gained (+3)" drivers={drivers} value={value.positionsGained} disabled={disabled}
                                            onChange={v => onChange({ ...value, positionsGained: v })} />
                                    )}
                                    {q.positionsLost && (
                                        <DriverPicker label="Biggest position loss (+3)" drivers={drivers} value={value.positionsLost} disabled={disabled}
                                            onChange={v => onChange({ ...value, positionsLost: v })} />
                                    )}
                                    {q.winningMargin && (
                                        <div>
                                            <label style={fieldLabelStyle}>Winning margin (+2)</label>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {MARGIN_OPTIONS.map(opt => (
                                                    <button key={opt.value} type="button" disabled={disabled}
                                                        onClick={() => onChange({ ...value, winningMargin: value.winningMargin === opt.value ? '' : opt.value })}
                                                        style={pillStyle(value.winningMargin === opt.value)}>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {q.retirements && (
                                        <div>
                                            <label style={fieldLabelStyle}>Retirements (+2)</label>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {RETIREMENTS_OPTIONS.map(opt => (
                                                    <button key={opt.value} type="button" disabled={disabled}
                                                        onClick={() => onChange({ ...value, retirements: value.retirements === opt.value ? '' : opt.value })}
                                                        style={pillStyle(value.retirements === opt.value)}>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function DriverPicker({ label, drivers, value, onChange, disabled }: {
    label: string; drivers: Driver[]; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
    return (
        <div>
            <label style={fieldLabelStyle}>{label}</label>
            <select
                disabled={disabled}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="input"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem' }}
            >
                <option value="">— Pick driver —</option>
                {drivers.map(d => (
                    <option key={d.id} value={d.driver_name}>
                        {d.number ? `#${d.number} ` : ''}{d.driver_name}
                    </option>
                ))}
            </select>
        </div>
    );
}

const fieldLabelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600,
};

const iconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
    fontSize: '0.65rem', padding: '0.1rem 0.2rem', lineHeight: 1,
};

function pillStyle(active: boolean): React.CSSProperties {
    return {
        padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-color)'}`,
        background: active ? 'rgba(56,189,248,0.15)' : 'var(--bg-tertiary)',
        color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
    };
}
