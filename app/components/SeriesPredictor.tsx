'use client';

import { seriesOutcomes } from '@/lib/types';
import type { SeriesFormat } from '@/lib/types';

interface Props {
    format: SeriesFormat;
    teamA: string;
    teamB: string;
    value: [number, number] | null;
    onChange: (a: number, b: number) => void;
    disabled?: boolean;
}

export default function SeriesPredictor({ format, teamA, teamB, value, onChange, disabled }: Props) {
    const outcomes = seriesOutcomes(format);

    const isSelected = (a: number, b: number) =>
        value !== null && value[0] === a && value[1] === b;

    const aWins = outcomes.filter(([a, b]) => a > b);
    const bWins = outcomes.filter(([a, b]) => b > a);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
                <span style={{ color: '#38bdf8' }}>{teamA} wins</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                <span style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{format}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                <span style={{ color: '#f97316' }}>{teamB} wins</span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Team A win outcomes */}
                {aWins.map(([a, b]) => {
                    const selected = isSelected(a, b);
                    return (
                        <button
                            key={`${a}-${b}`}
                            disabled={disabled}
                            onClick={() => !disabled && onChange(a, b)}
                            style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: '999px',
                                border: selected
                                    ? '2px solid #38bdf8'
                                    : '1px solid rgba(56,189,248,0.25)',
                                background: selected
                                    ? 'rgba(56,189,248,0.22)'
                                    : 'rgba(56,189,248,0.06)',
                                color: selected ? '#e0f2fe' : '#38bdf8',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: disabled ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: selected ? '0 0 12px rgba(56,189,248,0.35)' : 'none',
                                minWidth: 52,
                                letterSpacing: '0.02em',
                            }}
                        >
                            {a}–{b}
                        </button>
                    );
                })}

                {/* Divider */}
                <div style={{ width: 1, background: 'var(--border-color)', alignSelf: 'stretch', margin: '0 0.2rem' }} />

                {/* Team B win outcomes */}
                {bWins.map(([a, b]) => {
                    const selected = isSelected(a, b);
                    return (
                        <button
                            key={`${a}-${b}`}
                            disabled={disabled}
                            onClick={() => !disabled && onChange(a, b)}
                            style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: '999px',
                                border: selected
                                    ? '2px solid #f97316'
                                    : '1px solid rgba(249,115,22,0.25)',
                                background: selected
                                    ? 'rgba(249,115,22,0.22)'
                                    : 'rgba(249,115,22,0.06)',
                                color: selected ? '#fed7aa' : '#f97316',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: disabled ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: selected ? '0 0 12px rgba(249,115,22,0.35)' : 'none',
                                minWidth: 52,
                                letterSpacing: '0.02em',
                            }}
                        >
                            {a}–{b}
                        </button>
                    );
                })}
            </div>

            {value && (
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Predicting: <strong style={{ color: value[0] > value[1] ? '#38bdf8' : '#f97316' }}>
                        {value[0] > value[1] ? teamA : teamB}
                    </strong> win {value[0]}–{value[1]}
                </div>
            )}
        </div>
    );
}
