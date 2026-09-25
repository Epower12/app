import { describe, expect, it } from 'vitest';
import { finalScoreWithShootout, makeDriverMatcher, parseGapSeconds, parsePeriodScore, summariseF1Race, type F1ResultRow } from './results';

describe('finalScoreWithShootout', () => {
    it('keeps the score after extra time when there was no shoot-out', () => {
        expect(finalScoreWithShootout(2, 1, false, null, null)).toEqual({ home: 2, away: 1 });
        expect(finalScoreWithShootout(3, 2, true, 4, 2)).toEqual({ home: 3, away: 2 });
    });
    it('gives the shoot-out winner +1 when level', () => {
        expect(finalScoreWithShootout(1, 1, true, 4, 3)).toEqual({ home: 2, away: 1 });
        expect(finalScoreWithShootout(0, 0, true, 2, 4)).toEqual({ home: 0, away: 1 });
    });
    it('returns null when a level shoot-out game has no usable shoot-out score', () => {
        expect(finalScoreWithShootout(1, 1, true, null, null)).toBeNull();
    });
    it('returns null without a score', () => {
        expect(finalScoreWithShootout(null, 1, false, null, null)).toBeNull();
    });
});

describe('parsePeriodScore / parseGapSeconds', () => {
    it('parses period strings', () => {
        expect(parsePeriodScore('1-0')).toEqual([1, 0]);
        expect(parsePeriodScore(null)).toEqual([null, null]);
    });
    it('parses gaps', () => {
        expect(parseGapSeconds('+0.895')).toBeCloseTo(0.895);
        expect(parseGapSeconds('+1:02.345')).toBeCloseTo(62.345);
        expect(parseGapSeconds(null)).toBeNull();
    });
});

const row = (number: string, driverName: string, position: number, positionText: string, grid: number, laps: number, time: string | null, fastestLapRank: number | null): F1ResultRow =>
    ({ number, driverName, position, positionText, grid, laps, time, fastestLapRank });

// 2025 Australian Grand Prix, as returned by Jolpica-F1.
const australia2025 = [
    row('4', 'Lando Norris', 1, '1', 1, 57, '1:42:06.304', 1),
    row('1', 'Max Verstappen', 2, '2', 3, 57, '+0.895', 3),
    row('63', 'George Russell', 3, '3', 4, 57, '+8.481', 11),
    row('12', 'Andrea Kimi Antonelli', 4, '4', 16, 57, '+10.135', 9),
    row('23', 'Alexander Albon', 5, '5', 6, 57, '+12.773', 8),
    row('18', 'Lance Stroll', 6, '6', 13, 57, '+17.413', 14),
    row('27', 'Nico Hülkenberg', 7, '7', 17, 57, '+18.423', 12),
    row('16', 'Charles Leclerc', 8, '8', 7, 57, '+19.826', 13),
    row('81', 'Oscar Piastri', 9, '9', 2, 57, '+20.448', 4),
    row('44', 'Lewis Hamilton', 10, '10', 8, 57, '+22.473', 7),
    row('10', 'Pierre Gasly', 11, '11', 9, 57, '+26.502', 10),
    row('22', 'Yuki Tsunoda', 12, '12', 5, 57, '+29.884', 6),
    row('31', 'Esteban Ocon', 13, '13', 19, 57, '+33.161', 15),
    row('87', 'Oliver Bearman', 14, '14', 20, 57, '+40.351', 16),
    row('30', 'Liam Lawson', 15, 'R', 18, 46, null, 2),
    row('5', 'Gabriel Bortoleto', 16, 'R', 15, 45, null, 5),
    row('14', 'Fernando Alonso', 17, 'R', 12, 32, null, 17),
    row('55', 'Carlos Sainz', 18, 'R', 10, 0, null, null),
    row('7', 'Jack Doohan', 19, 'R', 14, 0, null, null),
    row('6', 'Isack Hadjar', 20, 'R', 11, 0, null, null),
];

describe('summariseF1Race', () => {
    const s = summariseF1Race(australia2025);
    it('takes the classified Top 10 in order', () => {
        expect(s.top10).toEqual(['Lando Norris', 'Max Verstappen', 'George Russell', 'Andrea Kimi Antonelli', 'Alexander Albon',
            'Lance Stroll', 'Nico Hülkenberg', 'Charles Leclerc', 'Oscar Piastri', 'Lewis Hamilton']);
    });
    it('answers the bonus questions it can decide', () => {
        expect(s.fastestLap).toBe('Lando Norris');
        expect(s.positionsGained).toBe('Andrea Kimi Antonelli'); // 16th → 4th
        expect(s.winningMargin).toBe('lt5');
        expect(s.retirements).toBe('3+');
    });
    it('leaves ties for the organiser', () => {
        expect(s.firstRetirement).toBeNull();  // three cars out on lap 0
        expect(s.positionsLost).toBeNull();    // Piastri and Tsunoda both lost 7
    });
    it('finds a single first retirement and a lapped runner-up', () => {
        const r = summariseF1Race([
            row('1', 'A', 1, '1', 2, 50, '1:30:00', 1),
            row('2', 'B', 2, '2', 1, 49, null, 2),
            row('3', 'C', 3, 'R', 3, 10, null, null),
            row('4', 'D', 4, 'W', 4, 0, null, null),
        ]);
        expect(r.firstRetirement).toBe('C');
        expect(r.winningMargin).toBe('gt15');
        expect(r.retirements).toBe('1-2');
    });
});

describe('makeDriverMatcher', () => {
    const match = makeDriverMatcher([
        { driver_name: 'Max Verstappen' },
        { driver_name: 'Kimi Antonelli' },
        { driver_name: 'Nico Hulkenberg' },
        { driver_name: 'Ocon' },
    ]);
    it('maps to the organiser\'s spelling', () => {
        expect(match('Max Verstappen')).toBe('Max Verstappen');
        expect(match('Andrea Kimi Antonelli')).toBe('Kimi Antonelli');
        expect(match('Nico Hülkenberg')).toBe('Nico Hulkenberg');
        expect(match('Esteban Ocon')).toBe('Ocon');
    });
    it('falls back to the API name (never guesses by car number)', () => {
        expect(match('Oscar Piastri')).toBe('Oscar Piastri');
        expect(match(null)).toBeNull();
    });
});
