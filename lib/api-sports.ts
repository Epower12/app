/**
 * API-Sports client (hockey + football tiers)
 * Docs: https://api-sports.io/documentation/hockey/v1
 *       https://api-sports.io/documentation/football/v3
 *
 * Set API_SPORTS_KEY in your environment variables.
 * Free tier: 100 requests/day per sport — plenty for a cron sync once per day.
 */

import { finalScoreWithShootout, parsePeriodScore } from './results';

export type ApiSportsSport = 'Ice Hockey' | 'Football';

const BASE_URLS: Record<ApiSportsSport, string> = {
    'Ice Hockey': 'https://v1.hockey.api-sports.io',
    Football: 'https://v3.football.api-sports.io',
};

async function request(sport: ApiSportsSport, path: string, params: Record<string, string> = {}) {
    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) throw new Error('API_SPORTS_KEY environment variable is not set');

    const url = new URL(BASE_URLS[sport] + path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        headers: { 'x-apisports-key': apiKey },
        cache: 'no-store',
    });

    if (!res.ok) throw new Error(`API-Sports HTTP error: ${res.status}`);

    const json = await res.json();

    // API-Sports wraps errors inside 200 responses
    if (json.errors && Object.keys(json.errors).length > 0) {
        const firstError = Object.values(json.errors)[0];
        throw new Error(`API-Sports error: ${firstError}`);
    }

    return json;
}

export interface ApiLeagueResult {
    league: { id: number; name: string; type: string; logo: string };
    country: { name: string; code: string | null; flag: string | null };
    seasons: { year: number; start: string; end: string; current: boolean }[];
}

/** Normalized shape both sports' game/fixture endpoints get mapped into */
export interface ApiGameResult {
    id: number;
    date: string;
    timestamp: number;
    teams: {
        home: { id: number; name: string; logo: string };
        away: { id: number; name: string; logo: string };
    };
    scores: {
        home: { total: number | null };
        away: { total: number | null };
    };
    /** Penalty shoot-out score, when the game went to one. */
    shootout: { home: number | null; away: number | null };
    status: { long: string; short: string };
}

/** Hockey returns scores as plain numbers, football as goals.*; accept either. */
const total = (v: number | { total?: number | null } | null | undefined): number | null =>
    (typeof v === 'number' ? v : v?.total ?? null);

/** Search for leagues by ID and/or name. Same response shape across hockey + football. */
export async function fetchLeague(sport: ApiSportsSport, leagueId: number, season?: number): Promise<ApiLeagueResult[]> {
    const params: Record<string, string> = { id: String(leagueId) };
    if (season) params.season = String(season);
    const data = await request(sport, '/leagues', params);
    return data.response ?? [];
}

/** Fetch all games/fixtures for a league + season, normalized to a common shape. */
export async function fetchGames(sport: ApiSportsSport, leagueId: number, season: number): Promise<ApiGameResult[]> {
    if (sport === 'Ice Hockey') {
        const data = await request(sport, '/games', { league: String(leagueId), season: String(season) });
        type HockeyGame = Omit<ApiGameResult, 'scores' | 'shootout'> & {
            scores?: { home?: number | null; away?: number | null };
            periods?: { penalties?: string | null };
        };
        return (data.response ?? []).map((r: HockeyGame) => {
            const [soHome, soAway] = parsePeriodScore(r.periods?.penalties);
            return {
                id: r.id,
                date: r.date,
                timestamp: r.timestamp,
                teams: r.teams,
                scores: { home: { total: total(r.scores?.home) }, away: { total: total(r.scores?.away) } },
                shootout: { home: soHome, away: soAway },
                status: r.status,
            };
        });
    }

    // Football's /fixtures endpoint nests fields differently (fixture.*, goals.* instead of scores.*)
    const data = await request(sport, '/fixtures', { league: String(leagueId), season: String(season) });
    const rows = data.response ?? [];
    return rows.map((r: any) => ({
        id: r.fixture.id,
        date: r.fixture.date,
        timestamp: r.fixture.timestamp,
        teams: r.teams,
        scores: {
            home: { total: r.goals?.home ?? null },
            away: { total: r.goals?.away ?? null },
        },
        shootout: { home: r.score?.penalty?.home ?? null, away: r.score?.penalty?.away ?? null },
        status: r.fixture.status,
    }));
}

export type FixtureStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

/** Map API-Sports status short code to our internal status. Covers both hockey and football codes. */
export function mapStatus(short: string): FixtureStatus {
    if (['FT', 'AET', 'PEN', 'AWA', 'WO', 'AP', 'AOT'].includes(short)) return 'finished';
    if (['PST', 'POST', 'TBD', 'SUSP'].includes(short)) return 'postponed';
    if (['CANC', 'ABD', 'INTR'].includes(short)) return 'cancelled';
    if (['LIVE', '1P', '2P', '3P', 'OT', 'BT', 'P', 'HT', 'INT', '1H', '2H', 'ET', 'BT'].includes(short)) return 'live';
    return 'scheduled';
}

/** Status codes meaning the game was settled by a penalty shoot-out. */
export function isShootoutStatus(short: string): boolean {
    return short === 'PEN' || short === 'AP';
}

/**
 * The score to store: after extra time, plus 1 for the shoot-out winner when
 * the game was level (see finalScoreWithShootout).
 */
export function gameFinalScore(g: ApiGameResult): { home: number | null; away: number | null } {
    const home = g.scores?.home?.total ?? null, away = g.scores?.away?.total ?? null;
    const fin = finalScoreWithShootout(home, away, isShootoutStatus(g.status.short), g.shootout?.home ?? null, g.shootout?.away ?? null);
    return fin ?? { home, away };
}
