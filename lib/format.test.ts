import { describe, expect, it } from 'vitest';
import { plural, timeUntil } from './format';

describe('timeUntil', () => {
    const now = 1_000_000;
    it('returns null once the time has passed', () => {
        expect(timeUntil(now, now)).toBeNull();
        expect(timeUntil(now - 60, now)).toBeNull();
    });
    it('shows minutes under an hour, never "0m"', () => {
        expect(timeUntil(now + 20, now)).toBe('1m');
        expect(timeUntil(now + 45 * 60, now)).toBe('45m');
    });
    it('shows hours and minutes under a day', () => {
        expect(timeUntil(now + 5 * 3600 + 12 * 60, now)).toBe('5h 12m');
    });
    it('shows one day with hours, then whole days', () => {
        expect(timeUntil(now + 86400 + 3 * 3600, now)).toBe('1 day 3h');
        expect(timeUntil(now + 3 * 86400 + 60, now)).toBe('3 days');
    });
});

describe('plural', () => {
    it('picks the singular only for exactly one', () => {
        expect(plural(1, 'match', 'matches')).toBe('1 match');
        expect(plural(0, 'match', 'matches')).toBe('0 matches');
        expect(plural(3, 'match', 'matches')).toBe('3 matches');
    });
});
