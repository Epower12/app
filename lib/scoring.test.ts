import { describe, it, expect } from 'vitest';
import {
    calculatePoints,
    calculateRacePoints,
    calculateTop10Points,
    calculateWinnerBonus,
    calculatePodiumBonus,
    calculateRaceWeekendPoints,
    raceSessionMultiplier,
    generateJoinCode,
    hasMatchStarted,
    RACE_TOP10_TABLE,
    QUALI_TOP10_TABLE,
} from './scoring';
import { defaultRaceBonusConfig, parseRaceBonusConfig } from './types';

describe('calculatePoints (score/series)', () => {
    it('awards 5 for an exact result', () => {
        expect(calculatePoints({ teamAScore: 2, teamBScore: 1 }, { teamAScore: 2, teamBScore: 1 })).toBe(5);
    });
    it('awards 3 for correct winner and margin', () => {
        expect(calculatePoints({ teamAScore: 3, teamBScore: 1 }, { teamAScore: 2, teamBScore: 0 })).toBe(3);
    });
    it('awards 2 for correct winner only', () => {
        expect(calculatePoints({ teamAScore: 1, teamBScore: 0 }, { teamAScore: 4, teamBScore: 1 })).toBe(2);
    });
    it('awards 0 for the wrong winner', () => {
        expect(calculatePoints({ teamAScore: 1, teamBScore: 0 }, { teamAScore: 0, teamBScore: 1 })).toBe(0);
    });
});

describe('calculateTop10Points', () => {
    const actual = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    it('awards the exact-position table value for every correct slot', () => {
        const { total } = calculateTop10Points(actual, actual, RACE_TOP10_TABLE);
        expect(total).toBe(10 * RACE_TOP10_TABLE.exact);
    });

    it('scores by distance when picks are shifted by one', () => {
        const picks = ['B', 'A', 'D', 'C', 'F', 'E', 'H', 'G', 'J', 'I'];
        const { total } = calculateTop10Points(picks, actual, RACE_TOP10_TABLE);
        expect(total).toBe(10 * RACE_TOP10_TABLE.within1);
    });

    it('gives 0 for a driver not in the actual Top 10 (DNF or finished outside points)', () => {
        const picks = ['ZZZ'];
        const { total } = calculateTop10Points(picks, actual, RACE_TOP10_TABLE);
        expect(total).toBe(0);
    });

    it('ignores empty slots', () => {
        const picks = ['A', '', 'C'];
        const { total } = calculateTop10Points(picks, actual, RACE_TOP10_TABLE);
        expect(total).toBe(RACE_TOP10_TABLE.exact + RACE_TOP10_TABLE.exact);
    });

    it('uses the qualifying table when passed explicitly', () => {
        const { total } = calculateTop10Points(actual, actual, QUALI_TOP10_TABLE);
        expect(total).toBe(10 * QUALI_TOP10_TABLE.exact);
    });

    it('correctIn (3+ positions away) still scores under the race table but not the quali table', () => {
        const picks = ['J']; // actual index 9, predicted index 0 -> distance 9
        expect(calculateTop10Points(picks, actual, RACE_TOP10_TABLE).total).toBe(RACE_TOP10_TABLE.correctIn);
        expect(calculateTop10Points(picks, actual, QUALI_TOP10_TABLE).total).toBe(QUALI_TOP10_TABLE.correctIn);
    });
});

describe('calculateWinnerBonus', () => {
    it('awards 3 when the predicted winner matches', () => {
        expect(calculateWinnerBonus(['A', 'B'], ['A', 'C'])).toBe(3);
    });
    it('awards 0 when the predicted winner is wrong', () => {
        expect(calculateWinnerBonus(['A', 'B'], ['B', 'A'])).toBe(0);
    });
    it('awards 0 when either side has no pick', () => {
        expect(calculateWinnerBonus([], ['A'])).toBe(0);
        expect(calculateWinnerBonus(['A'], [])).toBe(0);
    });
});

describe('calculatePodiumBonus', () => {
    it('awards 5 for the exact podium order', () => {
        expect(calculatePodiumBonus(['A', 'B', 'C'], ['A', 'B', 'C'])).toBe(5);
    });
    it('awards 3 for the correct three drivers in the wrong order', () => {
        expect(calculatePodiumBonus(['A', 'B', 'C'], ['C', 'A', 'B'])).toBe(3);
    });
    it('awards 0 when a podium driver is wrong', () => {
        expect(calculatePodiumBonus(['A', 'B', 'C'], ['A', 'B', 'D'])).toBe(0);
    });
    it('awards 0 when fewer than 3 picks are made', () => {
        expect(calculatePodiumBonus(['A', 'B'], ['A', 'B', 'C'])).toBe(0);
    });
});

describe('raceSessionMultiplier', () => {
    it('is 1x for a normal race', () => {
        expect(raceSessionMultiplier('race', false)).toBe(1);
    });
    it('is 0.5x for a sprint', () => {
        expect(raceSessionMultiplier('sprint', false)).toBe(0.5);
    });
    it('is 2x for a season-finale race', () => {
        expect(raceSessionMultiplier('race', true)).toBe(2);
    });
    it('is never multiplied for qualifying sessions', () => {
        expect(raceSessionMultiplier('qualifying', true)).toBe(1);
        expect(raceSessionMultiplier('sprint_qualifying', true)).toBe(1);
    });
});

describe('calculateRaceWeekendPoints', () => {
    const actual = {
        top10Result: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
        poleResult: 'A', fastestLapResult: 'B', firstRetirementResult: 'K',
        safetyCarResult: true, positionsGainedResult: 'D', positionsLostResult: 'E',
        winningMarginResult: 'lt5', retirementsResult: '1-2',
    };
    const prediction = {
        picks: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
        polePick: 'A', fastestLapPick: 'B', firstRetirementPick: 'K',
        safetyCarPick: true, positionsGainedPick: 'D', positionsLostPick: 'E',
        winningMarginPick: 'lt5', retirementsPick: '1-2',
    };

    it('returns 0 with no breakdown when the race has no result yet', () => {
        const result = calculateRaceWeekendPoints(prediction, { top10Result: null }, 'race', 1);
        expect(result).toEqual({ total: 0, breakdown: [] });
    });

    it('sums Top 10 + every bonus category on a perfect prediction (default config)', () => {
        const { total, breakdown } = calculateRaceWeekendPoints(prediction, actual, 'race', 1);
        // Top10 perfect = 10*5=50, winner +3, podium +5, pole +3, fastestLap +3, firstRetirement +2, safetyCar +2
        // positionsGained/positionsLost/winningMargin/retirements are OFF by default -> not counted
        expect(total).toBe(50 + 3 + 5 + 3 + 3 + 2 + 2);
        expect(breakdown.map(b => b.label)).not.toContain('Most positions gained');
        expect(breakdown.map(b => b.label)).not.toContain('Winning margin');
    });

    it('includes the optional extras when the league enables them', () => {
        const allOn = { ...defaultRaceBonusConfig(), positionsGained: true, positionsLost: true, winningMargin: true, retirements: true };
        const { total } = calculateRaceWeekendPoints(prediction, actual, 'race', 1, allOn);
        expect(total).toBe(50 + 3 + 5 + 3 + 3 + 2 + 2 + 3 + 3 + 2 + 2);
    });

    it('excludes a bonus category the league has disabled', () => {
        const noSafetyCar = { ...defaultRaceBonusConfig(), safetyCar: false };
        const { total, breakdown } = calculateRaceWeekendPoints(prediction, actual, 'race', 1, noSafetyCar);
        expect(breakdown.map(b => b.label)).not.toContain('Safety car');
        expect(total).toBe(50 + 3 + 5 + 3 + 3 + 2); // no +2 safety car
    });

    it('never scores bonus questions outside the main race session', () => {
        const { total, breakdown } = calculateRaceWeekendPoints(prediction, actual, 'qualifying', 1);
        // Top10 with the quali table (exact=3) only, no bonuses
        expect(total).toBe(10 * QUALI_TOP10_TABLE.exact);
        expect(breakdown).toEqual([{ label: 'Top 10 order', points: 30 }]);
    });

    it('applies the session multiplier to the combined total', () => {
        const { total } = calculateRaceWeekendPoints(prediction, actual, 'race', 2);
        const unmultiplied = 50 + 3 + 5 + 3 + 3 + 2 + 2;
        expect(total).toBe(unmultiplied * 2);
    });

    it('records the multiplier delta in the breakdown', () => {
        const { breakdown } = calculateRaceWeekendPoints(prediction, actual, 'race', 2);
        const multiplierLine = breakdown.find(b => b.label.includes('multiplier'));
        expect(multiplierLine).toBeDefined();
    });
});

describe('parseRaceBonusConfig', () => {
    it('falls back to defaults for null', () => {
        expect(parseRaceBonusConfig(null)).toEqual(defaultRaceBonusConfig());
    });
    it('merges a partial config with defaults so old leagues never crash', () => {
        const merged = parseRaceBonusConfig({ safetyCar: false });
        expect(merged.safetyCar).toBe(false);
        expect(merged.winner).toBe(true); // untouched default
    });
});

describe('calculateRacePoints (legacy P1/P2/P3 podium — kept for backward compatibility)', () => {
    it('still scores the old 5/3/2 podium shape correctly', () => {
        const { total } = calculateRacePoints(
            { p1Driver: 'A', p2Driver: 'B', p3Driver: 'C' },
            { p1Driver: 'A', p2Driver: 'B', p3Driver: 'C' }
        );
        expect(total).toBe(10);
    });
});

describe('generateJoinCode', () => {
    it('produces a 6-character code', () => {
        expect(generateJoinCode()).toHaveLength(6);
    });

    it('never produces ambiguous characters (0/O, 1/I) — full alphabet check', () => {
        // Run many times to exercise the full character set with high probability.
        const seen = new Set<string>();
        for (let i = 0; i < 500; i++) {
            for (const ch of generateJoinCode()) seen.add(ch);
        }
        for (const ambiguous of ['0', 'O', '1', 'I']) {
            expect(seen.has(ambiguous)).toBe(false);
        }
    });

    it('generates different codes across calls (not a constant)', () => {
        const codes = new Set(Array.from({ length: 20 }, () => generateJoinCode()));
        expect(codes.size).toBeGreaterThan(1);
    });
});

describe('hasMatchStarted', () => {
    it('is true for a scheduled time in the past', () => {
        expect(hasMatchStarted(Math.floor(Date.now() / 1000) - 60)).toBe(true);
    });

    it('is false for a scheduled time in the future', () => {
        expect(hasMatchStarted(Math.floor(Date.now() / 1000) + 3600)).toBe(false);
    });
});
