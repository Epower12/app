/**
 * API-Sports client (hockey + football tiers)
 * Docs: https://api-sports.io/documentation/hockey/v1
 *       https://api-sports.io/documentation/football/v3
 *
 * Set API_SPORTS_KEY in your environment variables.
 * Free tier: 100 requests/day per sport — plenty for a cron sync once per day.
 */

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
    status: { long: string; short: string };
}

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
        return data.response ?? [];
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
        status: r.fixture.status,
    }));
}

/** Map API-Sports status short code to our internal status. Covers both hockey and football codes. */
export function mapStatus(short: string): 'scheduled' | 'live' | 'finished' {
    if (['FT', 'AET', 'PEN', 'AWA', 'WO', 'AP'].includes(short)) return 'finished';
    if (['LIVE', '1P', '2P', '3P', 'OT', 'BT', 'P', 'HT', 'INT', '1H', '2H', 'ET', 'BT'].includes(short)) return 'live';
    return 'scheduled';
}
