import type { MatchType, SeriesFormat, RaceSession, RaceBonusConfig } from './types';
import { defaultRaceBonusConfig } from './types';

export interface Prediction {
    teamAScore: number;
    teamBScore: number;
}

export interface ActualResult {
    teamAScore: number;
    teamBScore: number;
}

/**
 * Score/series prediction scoring (tiered — only highest matching rule applies):
 * - 5 pts: Exact result
 * - 3 pts: Correct winner + correct margin
 * - 2 pts: Correct winner only
 * - 0 pts: Wrong winner
 *
 * For 'score' type: winner = higher score
 * For 'series' type: winner = higher map wins (same logic)
 */
export function calculatePoints(
    prediction: Prediction,
    actual: ActualResult
): number {
    const { teamAScore: predA, teamBScore: predB } = prediction;
    const { teamAScore: actualA, teamBScore: actualB } = actual;

    if (predA === actualA && predB === actualB) return 5;

    const predWinner   = predA   > predB   ? 'A' : predA   < predB   ? 'B' : 'draw';
    const actualWinner = actualA > actualB ? 'A' : actualA < actualB ? 'B' : 'draw';
    const correctWinner = predWinner === actualWinner;
    const correctGap    = Math.abs(predA - predB) === Math.abs(actualA - actualB);

    if (correctWinner && correctGap) return 3;
    if (correctWinner) return 2;
    return 0;
}

// Alias — series uses identical algorithm
export const calculateSeriesPoints = calculatePoints;

export interface RacePrediction {
    p1Driver: string;
    p2Driver: string;
    p3Driver: string;
}

export interface RaceActual {
    p1Driver: string;
    p2Driver: string;
    p3Driver: string;
}

/**
 * Race podium scoring:
 * - P1 exact: 5 pts
 * - P2 exact: 3 pts
 * - P3 exact: 2 pts
 * - Each correct driver in wrong podium slot: 1 pt (max 3)
 * Max possible: 10 pts (5+3+2)
 */
export function calculateRacePoints(
    prediction: RacePrediction,
    actual: RaceActual
): { total: number; breakdown: string } {
    let pts = 0;
    const details: string[] = [];

    const predPodium = [prediction.p1Driver, prediction.p2Driver, prediction.p3Driver];
    const actualPodium = [actual.p1Driver, actual.p2Driver, actual.p3Driver];

    // Exact position bonuses (checked before partial credit)
    const positionPoints = [5, 3, 2];
    const exactMatches = new Set<number>(); // indices with exact match

    for (let i = 0; i < 3; i++) {
        if (predPodium[i] === actualPodium[i]) {
            pts += positionPoints[i];
            exactMatches.add(i);
            details.push(`P${i + 1} exact +${positionPoints[i]}`);
        }
    }

    // Partial credit: correct driver, wrong slot (only for non-exact predictions)
    for (let i = 0; i < 3; i++) {
        if (exactMatches.has(i)) continue;
        const driver = predPodium[i];
        const inActualPodium = actualPodium.some((d, j) => d === driver && !exactMatches.has(j));
        if (inActualPodium) {
            pts += 1;
            details.push(`P${i + 1} wrong slot +1`);
        }
    }

    return { total: pts, breakdown: details.join(', ') || 'no points' };
}

/**
 * Unified point calculator that branches on match type.
 * Returns { total, breakdown }.
 */
export function calculatePointsForMatch(
    matchType: MatchType,
    predictionData: {
        teamAScore?: number;
        teamBScore?: number;
        p1Driver?: string;
        p2Driver?: string;
        p3Driver?: string;
    },
    actualData: {
        teamAScore?: number | null;
        teamBScore?: number | null;
        p1Driver?: string | null;
        p2Driver?: string | null;
        p3Driver?: string | null;
    }
): { total: number; breakdown: string } {
    if (matchType === 'race') {
        if (!predictionData.p1Driver || !actualData.p1Driver) return { total: 0, breakdown: 'incomplete' };
        const result = calculateRacePoints(
            { p1Driver: predictionData.p1Driver, p2Driver: predictionData.p2Driver!, p3Driver: predictionData.p3Driver! },
            { p1Driver: actualData.p1Driver, p2Driver: actualData.p2Driver!, p3Driver: actualData.p3Driver! }
        );
        return result;
    }

    // 'score' or 'series'
    if (predictionData.teamAScore === undefined || actualData.teamAScore === null || actualData.teamAScore === undefined) {
        return { total: 0, breakdown: 'incomplete' };
    }
    const pts = calculatePoints(
        { teamAScore: predictionData.teamAScore, teamBScore: predictionData.teamBScore! },
        { teamAScore: actualData.teamAScore, teamBScore: actualData.teamBScore! }
    );
    const labels: Record<number, string> = { 5: 'exact', 3: 'winner+margin', 2: 'winner', 0: 'miss' };
    return { total: pts, breakdown: labels[pts] ?? String(pts) };
}

/**
 * Race weekend scoring — Top 10 finishing order (distance-based points) plus
 * Winner/Podium bonuses derived from that same order, plus independent bonus
 * picks (pole, fastest lap, first retirement, safety car, and a few optional
 * extras). One prediction, many ways to score — no need for ten separate forms.
 */
export interface Top10PointsTable { exact: number; within1: number; within2: number; correctIn: number; }
export const RACE_TOP10_TABLE: Top10PointsTable = { exact: 5, within1: 3, within2: 2, correctIn: 1 };
export const QUALI_TOP10_TABLE: Top10PointsTable = { exact: 3, within1: 1, within2: 0, correctIn: 0 };

/**
 * Distance-based Top 10 scoring: each predicted driver earns points based on
 * how far their predicted slot is from their actual finishing position.
 * A predicted driver who isn't in the actual Top 10 at all (DNF or finished
 * outside the points) earns 0 for that slot — no need to track *why*.
 */
export function calculateTop10Points(
    picks: string[],
    actual: string[],
    table: Top10PointsTable = RACE_TOP10_TABLE
): { total: number; breakdown: string } {
    let pts = 0;
    const details: string[] = [];
    picks.forEach((driver, i) => {
        if (!driver) return;
        const actualIdx = actual.indexOf(driver);
        if (actualIdx === -1) return;
        const dist = Math.abs(actualIdx - i);
        const gained = dist === 0 ? table.exact : dist === 1 ? table.within1 : dist === 2 ? table.within2 : table.correctIn;
        if (gained > 0) { pts += gained; details.push(`P${i + 1} ${driver} +${gained}`); }
    });
    return { total: pts, breakdown: details.join(', ') || 'no points' };
}

/** Winner bonus — derived from picks[0] vs actual[0], no separate pick needed. */
export function calculateWinnerBonus(picks: string[], actual: string[]): number {
    return picks[0] && actual[0] && picks[0] === actual[0] ? 3 : 0;
}

/** Full podium bonus — derived from picks[0..2] vs actual[0..2]. */
export function calculatePodiumBonus(picks: string[], actual: string[]): number {
    const predTop3 = picks.slice(0, 3).filter(Boolean);
    const actualTop3 = actual.slice(0, 3).filter(Boolean);
    if (predTop3.length < 3 || actualTop3.length < 3) return 0;
    if (predTop3.every((d, i) => d === actualTop3[i])) return 5;
    const predSet = new Set(predTop3);
    const actualSet = new Set(actualTop3);
    const sameThree = predSet.size === 3 && actualSet.size === 3 && [...predSet].every(d => actualSet.has(d));
    return sameThree ? 3 : 0;
}

function singlePickBonus(pick: string | null | undefined, actual: string | null | undefined, pts: number): number {
    return pick && actual && pick === actual ? pts : 0;
}

function boolPickBonus(pick: boolean | null | undefined, actual: boolean | null | undefined, pts: number): number {
    return pick !== null && pick !== undefined && actual !== null && actual !== undefined && pick === actual ? pts : 0;
}

export interface RaceWeekendPredictionInput {
    picks: string[];
    polePick?: string | null;
    fastestLapPick?: string | null;
    firstRetirementPick?: string | null;
    safetyCarPick?: boolean | null;
    positionsGainedPick?: string | null;
    positionsLostPick?: string | null;
    winningMarginPick?: string | null;
    retirementsPick?: string | null;
}

export interface RaceWeekendActualInput {
    top10Result: string[] | null;
    poleResult?: string | null;
    fastestLapResult?: string | null;
    firstRetirementResult?: string | null;
    safetyCarResult?: boolean | null;
    positionsGainedResult?: string | null;
    positionsLostResult?: string | null;
    winningMarginResult?: string | null;
    retirementsResult?: string | null;
}

/**
 * Race session point multiplier. Sprint sessions are worth half; a race that's
 * flagged as the season finale is worth double. Qualifying is never multiplied.
 */
export function raceSessionMultiplier(raceSession: RaceSession | null, isSeasonFinale: boolean): number {
    if (raceSession === 'sprint') return isSeasonFinale ? 1 : 0.5;
    if (raceSession === 'race' && isSeasonFinale) return 2;
    return 1;
}

/**
 * Full race-weekend scoring: Top 10 (session-appropriate table) plus, for the
 * main race session only, the derived Winner/Podium bonuses and independent
 * bonus picks — all multiplied by the session multiplier.
 */
export function calculateRaceWeekendPoints(
    prediction: RaceWeekendPredictionInput,
    actual: RaceWeekendActualInput,
    raceSession: RaceSession | null,
    multiplier: number = 1,
    enabledQuestions: RaceBonusConfig = defaultRaceBonusConfig()
): { total: number; breakdown: { label: string; points: number }[] } {
    const breakdown: { label: string; points: number }[] = [];
    if (!actual.top10Result || actual.top10Result.length === 0) {
        return { total: 0, breakdown: [] };
    }

    const table = (raceSession === 'qualifying' || raceSession === 'sprint_qualifying') ? QUALI_TOP10_TABLE : RACE_TOP10_TABLE;
    const top10 = calculateTop10Points(prediction.picks ?? [], actual.top10Result, table);
    if (top10.total > 0) breakdown.push({ label: 'Top 10 order', points: top10.total });

    // Bonus questions only attach to the main race — quali/sprint just score the order.
    // Each category is also gated by the league's enabled-questions config.
    if (raceSession === 'race') {
        if (enabledQuestions.winner) {
            const winner = calculateWinnerBonus(prediction.picks ?? [], actual.top10Result);
            if (winner) breakdown.push({ label: 'Race winner', points: winner });
        }

        if (enabledQuestions.podium) {
            const podium = calculatePodiumBonus(prediction.picks ?? [], actual.top10Result);
            if (podium) breakdown.push({ label: 'Full podium', points: podium });
        }

        if (enabledQuestions.pole) {
            const pole = singlePickBonus(prediction.polePick, actual.poleResult, 3);
            if (pole) breakdown.push({ label: 'Pole position', points: pole });
        }

        if (enabledQuestions.fastestLap) {
            const fastestLap = singlePickBonus(prediction.fastestLapPick, actual.fastestLapResult, 3);
            if (fastestLap) breakdown.push({ label: 'Fastest lap', points: fastestLap });
        }

        if (enabledQuestions.firstRetirement) {
            const firstRetirement = singlePickBonus(prediction.firstRetirementPick, actual.firstRetirementResult, 2);
            if (firstRetirement) breakdown.push({ label: 'First retirement', points: firstRetirement });
        }

        if (enabledQuestions.safetyCar) {
            const safetyCar = boolPickBonus(prediction.safetyCarPick, actual.safetyCarResult, 2);
            if (safetyCar) breakdown.push({ label: 'Safety car', points: safetyCar });
        }

        if (enabledQuestions.positionsGained) {
            const posGained = singlePickBonus(prediction.positionsGainedPick, actual.positionsGainedResult, 3);
            if (posGained) breakdown.push({ label: 'Most positions gained', points: posGained });
        }

        if (enabledQuestions.positionsLost) {
            const posLost = singlePickBonus(prediction.positionsLostPick, actual.positionsLostResult, 3);
            if (posLost) breakdown.push({ label: 'Biggest position loss', points: posLost });
        }

        if (enabledQuestions.winningMargin) {
            const margin = singlePickBonus(prediction.winningMarginPick, actual.winningMarginResult, 2);
            if (margin) breakdown.push({ label: 'Winning margin', points: margin });
        }

        if (enabledQuestions.retirements) {
            const retirements = singlePickBonus(prediction.retirementsPick, actual.retirementsResult, 2);
            if (retirements) breakdown.push({ label: 'Retirements count', points: retirements });
        }
    }

    const rawTotal = breakdown.reduce((sum, b) => sum + b.points, 0);
    const total = Math.round(rawTotal * multiplier);
    if (multiplier !== 1 && rawTotal > 0) {
        breakdown.push({ label: `×${multiplier} multiplier`, points: total - rawTotal });
    }
    return { total, breakdown };
}

/**
 * Generate a random 6-character alphanumeric code for tournament join codes
 */
export function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Check if a match has started (scheduled time has passed)
 */
export function hasMatchStarted(scheduledTime: number): boolean {
    return Date.now() / 1000 >= scheduledTime;
}

/** Human-readable scoring rules label per match type */
export function scoringRulesLabel(matchType: MatchType, seriesFormat?: SeriesFormat | null): string {
    if (matchType === 'race') return 'Top 10: exact=5 · ±1=3 · ±2=2 · correct=1 · +3 Winner · +5 Podium · +3 Pole · +3 Fastest lap · +2 First retirement · +2 Safety car';
    if (matchType === 'series') {
        const fmt = seriesFormat ?? 'BO3';
        return `${fmt} · Exact=5pts · Winner+margin=3pts · Winner=2pts`;
    }
    return 'Exact=5pts · Winner+margin=3pts · Winner=2pts';
}
