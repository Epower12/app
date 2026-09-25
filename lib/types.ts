export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'premium' | 'user';
    isPaid: boolean;
    avatarUrl?: string;
    bio?: string;
    bestStreak: number;
    createdAt: number;
}

export interface Tournament {
    id: string;
    name: string;
    joinCode: string;
    createdBy: string;
    isActive: boolean;
    createdAt: number;
    sport: string;
}

export const SUPPORTED_SPORTS = [
    'Football',
    'Basketball',
    'Tennis',
    'Volleyball',
    'Ice Hockey',
    'Formula 1',
    'MotoGP',
    'League of Legends',
    'Counter-Strike',
    'Dota 2',
    'Valorant',
    'Other'
];

export type MatchType = 'score' | 'series' | 'race';
export type SeriesFormat = 'BO1' | 'BO3' | 'BO5';
export type RaceSession = 'qualifying' | 'sprint_qualifying' | 'sprint' | 'race';

export interface Match {
    id: string;
    tournamentId: string;
    teamA: string;
    teamB: string;
    scheduledTime: number;
    teamAScore: number | null;
    teamBScore: number | null;
    isFinished: boolean;
    createdAt: number;
    sport: string;
    // Multi-format fields
    match_type: MatchType;
    series_format: SeriesFormat | null;
    race_session: RaceSession | null;
}

export interface Prediction {
    id: string;
    matchId: string;
    userId: string;
    teamAScore: number;
    teamBScore: number;
    createdAt: number;
    updatedAt: number;
}

export interface RaceDriver {
    id: string;
    tournamentId: string;
    driverName: string;
    teamName: string | null;
    number: number | null;
}

export interface RacePrediction {
    id: string;
    matchId: string;
    userId: string;
    p1Driver: string;
    p2Driver: string;
    p3Driver: string;
    createdAt: number;
    updatedAt: number;
}

export type WinningMarginBucket = 'lt5' | '5to15' | 'gt15';
export type RetirementsBucket = '0' | '1-2' | '3+';

/** Which race bonus questions are active for a league — the Top 10 main
 *  prediction is never toggleable, only the bonus categories layered on it. */
export type RaceBonusQuestionKey =
    | 'winner' | 'podium' | 'pole' | 'fastestLap' | 'firstRetirement' | 'safetyCar'
    | 'positionsGained' | 'positionsLost' | 'winningMargin' | 'retirements';

export type RaceBonusConfig = Record<RaceBonusQuestionKey, boolean>;

/** Matches the spec's "Suggested Default Active Questions" — the six core
 *  bonus questions on by default, the three optional extras off. */
export function defaultRaceBonusConfig(): RaceBonusConfig {
    return {
        winner: true, podium: true, pole: true, fastestLap: true, firstRetirement: true, safetyCar: true,
        positionsGained: false, positionsLost: false, winningMargin: false, retirements: false,
    };
}

/** Merge a possibly-null/partial config (e.g. straight from the DB, or a
 *  config saved before a new question key existed) with the defaults. */
export function parseRaceBonusConfig(raw: unknown): RaceBonusConfig {
    if (!raw || typeof raw !== 'object') return defaultRaceBonusConfig();
    return { ...defaultRaceBonusConfig(), ...(raw as Partial<RaceBonusConfig>) };
}

/**
 * Race weekend prediction — the Top 10 finishing order plus optional bonus
 * picks (winner and full podium are derived from the Top 10 order, not
 * separate picks). Replaces the old P1/P2/P3-only RacePrediction above.
 */
export interface RaceWeekendPrediction {
    id: string;
    matchId: string;
    userId: string;
    picks: string[];
    polePick: string | null;
    fastestLapPick: string | null;
    firstRetirementPick: string | null;
    safetyCarPick: boolean | null;
    positionsGainedPick: string | null;
    positionsLostPick: string | null;
    winningMarginPick: WinningMarginBucket | null;
    retirementsPick: RetirementsBucket | null;
    createdAt: number;
    updatedAt: number;
}

export interface TournamentParticipant {
    id: string;
    tournamentId: string;
    userId: string;
    joinedAt: number;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    totalPoints: number;
    predictions: {
        matchId: string;
        teamA: string;
        teamB: string;
        matchType: MatchType;
        seriesFormat: SeriesFormat | null;
        raceSession: RaceSession | null;
        // score / series
        predictedScoreA?: number;
        predictedScoreB?: number;
        actualScoreA?: number | null;
        actualScoreB?: number | null;
        // race weekend (Top 10 + bonus questions)
        raceWeekend?: {
            picks: string[];
            actual: string[] | null;
            pole: { pick: string | null; actual: string | null };
            fastestLap: { pick: string | null; actual: string | null };
            firstRetirement: { pick: string | null; actual: string | null };
            safetyCar: { pick: boolean | null; actual: boolean | null };
            positionsGained: { pick: string | null; actual: string | null };
            positionsLost: { pick: string | null; actual: string | null };
            winningMargin: { pick: string | null; actual: string | null };
            retirements: { pick: string | null; actual: string | null };
            multiplier: number;
            breakdown: { label: string; points: number }[];
        };
        points: number;
        pointsBreakdown?: string;
    }[];
}

/** Per-sport default match type */
export function defaultMatchType(sport: string): MatchType {
    if (sport === 'Formula 1' || sport === 'MotoGP') return 'race';
    if (sport === 'Counter-Strike' || sport === 'League of Legends' || sport === 'Dota 2' || sport === 'Valorant' || sport === 'Tennis') return 'series';
    return 'score';
}

/** Per-sport default series format */
export function defaultSeriesFormat(sport: string): SeriesFormat | null {
    if (sport === 'Counter-Strike' || sport === 'League of Legends' || sport === 'Dota 2' || sport === 'Valorant') return 'BO3';
    if (sport === 'Tennis') return 'BO3';
    return null;
}

/** Valid outcomes for a series format */
export function seriesOutcomes(format: SeriesFormat): Array<[number, number]> {
    if (format === 'BO1') return [[1, 0], [0, 1]];
    if (format === 'BO3') return [[2, 0], [2, 1], [1, 2], [0, 2]];
    if (format === 'BO5') return [[3, 0], [3, 1], [3, 2], [2, 3], [1, 3], [0, 3]];
    return [];
}
