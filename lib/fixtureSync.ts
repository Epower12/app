import db from './db';
import { fetchLeague, fetchGames, mapStatus, type ApiSportsSport } from './api-sports';
import { fetchNhlSeasonGames } from './nhl';
import { fetchF1SeasonRaces, fetchF1RaceResults } from './jolpicaF1';

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
        const homeScore = g.scores?.home?.total ?? null;
        const awayScore = g.scores?.away?.total ?? null;

        await db.query(
            `INSERT INTO api_matches (api_league_id, external_id, home_team, away_team, match_time, status, home_score, away_score, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, EXTRACT(EPOCH FROM NOW())::BIGINT)
             ON CONFLICT (api_league_id, external_id)
             DO UPDATE SET status = EXCLUDED.status, home_score = EXCLUDED.home_score,
                           away_score = EXCLUDED.away_score, synced_at = EXCLUDED.synced_at`,
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
                           away_score = EXCLUDED.away_score, synced_at = EXCLUDED.synced_at`,
            [league.id, g.id, g.homeTeam, g.awayTeam, g.timestamp, g.status, g.homeScore, g.awayScore]
        );
        upserted++;
    }
    return upserted;
}

/** Upsert every race for an F1-provider season into api_races, backfilling results for completed rounds. */
async function upsertF1Races(league: DbApiLeague): Promise<number> {
    const races = await fetchF1SeasonRaces(league.season);
    let upserted = 0;
    const now = Math.floor(Date.now() / 1000);

    for (const r of races) {
        const isPast = r.timestamp < now;
        let p1: string | null = null, p2: string | null = null, p3: string | null = null;
        let status = 'scheduled';

        if (isPast) {
            try {
                const results = await fetchF1RaceResults(league.season, r.round);
                if (results.length >= 3) {
                    p1 = results.find(x => x.position === 1)?.driverName ?? null;
                    p2 = results.find(x => x.position === 2)?.driverName ?? null;
                    p3 = results.find(x => x.position === 3)?.driverName ?? null;
                    status = 'finished';
                }
            } catch {
                // Results not published yet for a just-past race — leave as scheduled.
            }
        }

        await db.query(
            `INSERT INTO api_races (api_league_id, season, round, race_name, race_time, status, p1_driver, p2_driver, p3_driver, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, EXTRACT(EPOCH FROM NOW())::BIGINT)
             ON CONFLICT (season, round)
             DO UPDATE SET status = EXCLUDED.status, p1_driver = EXCLUDED.p1_driver,
                           p2_driver = EXCLUDED.p2_driver, p3_driver = EXCLUDED.p3_driver,
                           synced_at = EXCLUDED.synced_at`,
            [league.id, league.season, r.round, r.raceName, r.timestamp, status, p1, p2, p3]
        );
        upserted++;
    }

    await db.query('UPDATE api_leagues SET match_count = $1 WHERE id = $2', [upserted, league.id]);
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
    return { matchesSynced };
}

/** Re-sync every currently tracked source. Used by the daily cron job. */
export async function resyncAllLeagues() {
    const { rows } = await db.query('SELECT * FROM api_leagues ORDER BY id ASC');
    const results: { id: number; name: string; matchesSynced: number; error?: string }[] = [];

    for (const league of rows as DbApiLeague[]) {
        try {
            const matchesSynced = await upsertForLeague(league);
            results.push({ id: league.id, name: league.name, matchesSynced });
        } catch (err: any) {
            results.push({ id: league.id, name: league.name, matchesSynced: 0, error: err.message ?? String(err) });
        }
    }

    return results;
}
