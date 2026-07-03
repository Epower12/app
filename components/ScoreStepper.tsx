'use client';

interface Props {
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}

export default function ScoreStepper({ value, onChange, disabled = false }: Props) {
    const btn: React.CSSProperties = {
        width: 34, height: 42, borderRadius: 8,
        background: disabled ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: '1.15rem', cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, lineHeight: 1, flexShrink: 0,
        transition: 'background 0.15s, border-color 0.15s',
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
                type="button"
                style={btn}
                disabled={disabled || value <= 0}
                onClick={() => onChange(Math.max(0, value - 1))}
            >
                −
            </button>
            <input
                type="number"
                min={0}
                max={99}
                value={value}
                disabled={disabled}
                onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                onFocus={e => e.target.select()}
                style={{
                    width: 54, height: 42, textAlign: 'center', fontWeight: 800,
                    fontSize: '1.15rem', borderRadius: 8,
                    background: disabled ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                    border: `2px solid ${disabled ? 'var(--border-color)' : 'var(--color-primary)'}`,
                    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                    outline: 'none', padding: 0,
                    /* hide browser spin arrows */
                    appearance: 'textfield' as any,
                    MozAppearance: 'textfield' as any,
                    WebkitAppearance: 'none' as any,
                }}
            />
            <button
                type="button"
                style={btn}
                disabled={disabled}
                onClick={() => onChange(value + 1)}
            >
                +
            </button>
        </div>
    );
}
