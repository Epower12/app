import db from './db';
import { fetchLeague, fetchGames, mapStatus, gameFinalScore, type ApiSportsSport } from './api-sports';
import { fetchNhlSeasonGames } from './nhl';
import { fetchF1SeasonRaces, fetchF1RaceResults, fetchF1Pole } from './jolpicaF1';
import { applyImportedResults } from './applyResults';

export type FixtureProvider = 'api-sports' | 'nhl' | 'jolpica-f1';
export const VALID_API_SPORTS: ApiSportsSport[] = ['Ice Hockey', 'Football'];

interface DbApiLeague {
    id: number;
    name: string;
    sport: string;
    provider: FixtureProvider;
    external_id: number;
    season: number;
}

/** Upsert every game/fixture for an already-tracked api-sports league into api_matches. */
async function upsertApiSportsGames(league: DbApiLeague): Promise<number> {
    const games = await fetchGames(league.sport as ApiSportsSport, league.external_id, league.season);
    let upserted = 0;

    for (const g of games) {
        const status = mapStatus(g.status.short);
        const { home: homeScore, away: awayScore } = gameFinalScore(g);

        await db.query(
            `INSERT INTO api_matches (api_league_id, external_id, home_team, away_team, match_time, status, home_score, away_score, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, EXTRACT(EPOCH FROM NOW())::BIGINT)
             ON CONFLICT (api_league_id, external_id)
             DO UPDATE SET status = EXCLUDED.status, home_score = EXCLUDED.home_score,
                           away_score = EXCLUDED.away_score, match_time = EXCLUDED.match_time,
                           synced_at = EXCLUDED.synced_at`,
            [league.id, g.id, g.teams.home.name, g.teams.away.name, g.timestamp, status, homeScore, awayScore]
        );
        upserted++;
    }
    return upserted;
}

/** Upsert every game for an NHL-provider league into api_matches (single constant external_id per season). */
async function upsertNhlGames(league: DbApiLeague): Promise<number> {
    const games = await fetchNhlSeasonGames(league.season);
    let upserted = 0;

    for (const g of games) {
        await db.query(
            `INSERT INTO api_matches (api_league_id, external_id, home_team, away_team, match_time, status, home_score, away_score, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, EXTRACT(EPOCH FROM NOW())::BIGINT)
             ON CONFLICT (api_league_id, external_id)
             DO UPDATE SET status = EXCLUDED.status, home_score = EXCLUDED.home_score,
                           away_score = EXCLUDED.away_score, match_time = EXCLUDED.match_time,
                           synced_at = EXCLUDED.synced_at`,
            [league.id, g.id, g.homeTeam, g.awayTeam, g.timestamp, g.status, g.homeScore, g.awayScore]
        );
        upserted++;
    }
    return upserted;
}

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Upsert every race for an F1-provider season into api_races. Results are only
 * fetched for races that have been run and don't have a full classification
 * yet, so a sync every 30 minutes stays well inside Jolpica's rate limit.
 */
async function upsertF1Races(league: DbApiLeague): Promise<number> {
    const races = await fetchF1SeasonRaces(league.season);
    const now = Math.floor(Date.now() / 1000);
    const { rows: existing } = await db.query(
        `SELECT round FROM api_races WHERE season = $1 AND status = 'finished' AND result_rows IS NOT NULL`,
        [league.season]
    );
    const complete = new Set(existing.map((r: { round: number }) => Number(r.round)));
    let upserted = 0;

    for (const r of races) {
        upserted++;
        if (complete.has(r.round)) {
            await db.query('UPDATE api_races SET race_name = $1, synced_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE season = $2 AND round = $3',
                [r.raceName, league.season, r.round]);
            continue;
        }

        let rows: Awaited<ReturnType<typeof fetchF1RaceResults>> = [];
        let pole: Awaited<ReturnType<typeof fetchF1Pole>> = null;
        if (r.timestamp < now) {
            try {
                rows = await fetchF1RaceResults(league.season, r.round);
                await pause(300);
                pole = await fetchF1Pole(league.season, r.round);
                await pause(300);
            } catch {
                // Results not published yet for a just-finished race; try again next sync.
            }
        }
        const finished = rows.length >= 10;
        const podium = (pos: number) => rows.find(x => x.position === pos)?.driverName ?? null;

        await db.query(
            `INSERT INTO api_races (api_league_id, season, round, race_name, race_time, status, p1_driver, p2_driver, p3_driver,
                                    result_rows, pole_driver, pole_number, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, EXTRACT(EPOCH FROM NOW())::BIGINT)
             ON CONFLICT (season, round)
             DO UPDATE SET race_name = EXCLUDED.race_name, race_time = EXCLUDED.race_time, status = EXCLUDED.status,
                           p1_driver = EXCLUDED.p1_driver, p2_driver = EXCLUDED.p2_driver, p3_driver = EXCLUDED.p3_driver,
                           result_rows = EXCLUDED.result_rows,
                           pole_driver = COALESCE(EXCLUDED.pole_driver, api_races.pole_driver),
                           pole_number = COALESCE(EXCLUDED.pole_number, api_races.pole_number),
                           synced_at = EXCLUDED.synced_at`,
            [league.id, league.season, r.round, r.raceName, r.timestamp, finished ? 'finished' : 'scheduled',
             finished ? podium(1) : null, finished ? podium(2) : null, finished ? podium(3) : null,
             finished ? JSON.stringify(rows) : null, pole?.driverName ?? null, pole?.number ?? null]
        );
    }

    await db.query(
        'UPDATE api_leagues SET match_count = $1, synced_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $2',
        [upserted, league.id]
    );
    return upserted;
}

async function upsertForLeague(league: DbApiLeague): Promise<number> {
    let upserted: number;
    if (league.provider === 'nhl') {
        upserted = await upsertNhlGames(league);
    } else if (league.provider === 'jolpica-f1') {
        return upsertF1Races(league); // updates match_count itself since it writes to api_races, not api_matches
    } else {
        upserted = await upsertApiSportsGames(league);
    }

    await db.query(
        'UPDATE api_leagues SET match_count = $1, synced_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $2',
        [upserted, league.id]
    );
    return upserted;
}

/** Start tracking a new API-Sports league: fetch metadata, upsert the api_leagues row, then sync its games. */
export async function syncNewApiSportsLeague(sport: ApiSportsSport, leagueId: number, season: number) {
    const leagues = await fetchLeague(sport, leagueId, season);
    if (!leagues.length) throw new Error('League not found on API-Sports');
    const l = leagues[0];

    const { rows } = await db.query(
        `INSERT INTO api_leagues (name, sport, provider, external_id, season, country, logo_url, synced_at)
         VALUES ($1, $2, 'api-sports', $3, $4, $5, $6, EXTRACT(EPOCH FROM NOW())::BIGINT)
         ON CONFLICT (provider, sport, external_id, season)
         DO UPDATE SET name = EXCLUDED.name, synced_at = EXCLUDED.synced_at
         RETURNING *`,
        [l.league.name, sport, leagueId, season, l.country.name, l.league.logo]
    );
    const dbLeague: DbApiLeague = rows[0];
    const matchesSynced = await upsertForLeague(dbLeague);
    return { league: { ...dbLeague, match_count: matchesSynced }, matchesSynced };
}

/** Start tracking an NHL season. There's exactly one NHL, so external_id is a constant. */
export async function syncNewNhlSeason(seasonStartYear: number) {
    const { rows } = await db.query(
        `INSERT INTO api_leagues (name, sport, provider, external_id, season, country, logo_url, synced_at)
         VALUES ($1, 'Ice Hockey', 'nhl', 0, $2, 'USA/Canada', NULL, EXTRACT(EPOCH FROM NOW())::BIGINT)
         ON CONFLICT (provider, sport, external_id, season)
         DO UPDATE SET synced_at = EXCLUDED.synced_at
         RETURNING *`,
        [`NHL ${seasonStartYear}-${seasonStartYear + 1}`, seasonStartYear]
    );
    const dbLeague: DbApiLeague = rows[0];
    const matchesSynced = await upsertForLeague(dbLeague);
    return { league: { ...dbLeague, match_count: matchesSynced }, matchesSynced };
}

/** Start tracking an F1 season. There's exactly one championship, so external_id is a constant. */
export async function syncNewF1Season(season: number) {
    const { rows } = await db.query(
        `INSERT INTO api_leagues (name, sport, provider, external_id, season, country, logo_url, synced_at)
         VALUES ($1, 'Formula 1', 'jolpica-f1', 0, $2, NULL, NULL, EXTRACT(EPOCH FROM NOW())::BIGINT)
         ON CONFLICT (provider, sport, external_id, season)
         DO UPDATE SET synced_at = EXCLUDED.synced_at
         RETURNING *`,
        [`Formula 1 ${season}`, season]
    );
    const dbLeague: DbApiLeague = rows[0];
    const matchesSynced = await upsertForLeague(dbLeague);
    return { league: { ...dbLeague, match_count: matchesSynced }, matchesSynced };
}

/** Re-sync an already-tracked source (by its api_leagues.id row), regardless of provider. */
export async function resyncLeagueById(id: number) {
    const { rows } = await db.query('SELECT * FROM api_leagues WHERE id = $1', [id]);
    if (!rows.length) throw new Error('League not found');
    const league: DbApiLeague = rows[0];
    const matchesSynced = await upsertForLeague(league);
    await applyImportedResults();
    return { matchesSynced };
}

type SyncResult = { id: number; name: string; matchesSynced: number; error?: string };

async function syncLeagues(leagues: DbApiLeague[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    for (const league of leagues) {
        try {
            const matchesSynced = await upsertForLeague(league);
            results.push({ id: league.id, name: league.name, matchesSynced });
        } catch (err: any) {
            results.push({ id: league.id, name: league.name, matchesSynced: 0, error: err.message ?? String(err) });
        }
    }
    return results;
}

/** Re-sync every currently tracked source, then apply finished results to league matches. */
export async function resyncAllLeagues() {
    const { rows } = await db.query('SELECT * FROM api_leagues ORDER BY id ASC');
    const results = await syncLeagues(rows as DbApiLeague[]);
    const applied = await applyImportedResults();
    return { results, applied };
}

/**
 * Sources worth calling the provider for right now: a game or race has started
 * in the last few days and its final result isn't in yet, or the source hasn't
 * been refreshed for a day (picks up new fixtures and date changes). Keeps a
 * 30-minute schedule within API-Sports' daily request allowance.
 */
const DUE_SQL = `
    SELECT l.* FROM api_leagues l
    WHERE l.synced_at < $1 - 23 * 3600
       OR EXISTS (SELECT 1 FROM api_matches am WHERE am.api_league_id = l.id
                  AND am.match_time BETWEEN $1 - 3 * 86400 AND $1 AND am.status IN ('scheduled', 'live'))
       OR EXISTS (SELECT 1 FROM api_races ar WHERE ar.api_league_id = l.id
                  AND ar.race_time BETWEEN $1 - 4 * 86400 AND $1 AND ar.status <> 'finished')`;

/** The scheduled job: sync the sources that are due, then apply finished results everywhere. */
export async function resyncDueLeagues() {
    const now = Math.floor(Date.now() / 1000);
    const { rows } = await db.query(`${DUE_SQL} ORDER BY l.id ASC`, [now]);
    const results = await syncLeagues(rows as DbApiLeague[]);
    const applied = await applyImportedResults();
    return { results, applied };
}

/**
 * The organiser's "Check for results now" button: refresh the sources this
 * league's matches came from (skipping any refreshed in the last 10 minutes,
 * so repeated clicks don't burn the API allowance), then apply results.
 */
export async function checkResultsForTournament(tournamentId: string) {
    const now = Math.floor(Date.now() / 1000);
    const { rows } = await db.query(
        `SELECT DISTINCT l.* FROM api_leagues l
         WHERE l.synced_at < $2 - 600 AND l.id IN (
             SELECT am.api_league_id FROM matches m JOIN api_matches am ON am.id = m.api_match_id WHERE m.tournament_id = $1
             UNION
             SELECT ar.api_league_id FROM matches m JOIN api_races ar ON ar.id = m.api_race_id WHERE m.tournament_id = $1
         )`,
        [tournamentId, now]
    );
    const results = await syncLeagues(rows as DbApiLeague[]);
    const applied = await applyImportedResults(tournamentId);
    return { results, applied };
}
