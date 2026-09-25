import { describe, it, expect } from 'vitest';
import { PRESETS, listPresets, getPreset } from './presets';

describe('PRESETS registry integrity', () => {
    it('has no duplicate preset ids', () => {
        const ids = PRESETS.map(p => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every preset has at least one match', () => {
        for (const p of PRESETS) {
            expect(p.matches.length).toBeGreaterThan(0);
        }
    });
});

describe('listPresets', () => {
    it('returns one summary per preset with matching metadata', () => {
        const summaries = listPresets();
        expect(summaries.length).toBe(PRESETS.length);
        summaries.forEach((s, i) => {
            expect(s.id).toBe(PRESETS[i].id);
            expect(s.name).toBe(PRESETS[i].name);
        });
    });

    it('matchCount reflects the actual number of matches, not a stale value', () => {
        const summaries = listPresets();
        summaries.forEach((s, i) => {
            expect(s.matchCount).toBe(PRESETS[i].matches.length);
        });
    });

    it('never leaks the full matches array in the summary view', () => {
        const summaries = listPresets();
        for (const s of summaries) {
            expect((s as any).matches).toBeUndefined();
        }
    });
});

describe('getPreset', () => {
    it('finds a known preset by id', () => {
        expect(getPreset('iihf2026')?.name).toBe('IIHF World Championship 2026');
    });

    it('returns undefined for an unknown id', () => {
        expect(getPreset('does-not-exist')).toBeUndefined();
    });
});
