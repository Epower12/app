import { describe, expect, it } from 'vitest';
import { demoPick, seededRandom, DEMO_PLAYERS } from './demo';

describe('demo league picks', () => {
    it('is repeatable for the same player and game', () => {
        expect(demoPick('u1:m1', 0.6, null)).toEqual(demoPick('u1:m1', 0.6, null));
        expect(seededRandom('x')()).toBe(seededRandom('x')());
    });

    it('never predicts a draw (hockey always has a winner)', () => {
        for (let i = 0; i < 500; i++) {
            const p = demoPick(`u:${i}`, 0.5, i % 2 ? { home: 3, away: 2 } : null);
            expect(p.home).not.toBe(p.away);
            expect(Math.max(p.home, p.away)).toBeLessThanOrEqual(5);
        }
    });

    it('better players call the winner more often', () => {
        const hitRate = (skill: number) => {
            let hits = 0;
            for (let i = 0; i < 2000; i++) {
                const p = demoPick(`s${skill}:${i}`, skill, { home: 4, away: 1 });
                if (p.home > p.away) hits++;
            }
            return hits / 2000;
        };
        expect(hitRate(0.75)).toBeGreaterThan(hitRate(0.45) + 0.15);
    });

    it('has distinct player names', () => {
        expect(new Set(DEMO_PLAYERS.map(p => p.name)).size).toBe(DEMO_PLAYERS.length);
    });
});
