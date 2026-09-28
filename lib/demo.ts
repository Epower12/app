import { v4 as uuidv4 } from 'uuid';
import db from './db';
import { syncNewNhlSeason } from './fixtureSync';
import { applyImportedResults } from './applyResults';
import { generateJoinCode } from './scoring';

/**
 * The NHL demo league: a clearly labelled open league with fictional players,
 * built on real NHL games so it keeps moving by itself. Past games (last
 * season's playoffs) have scored picks and a full table; upcoming regular-season
 * games are added a week ahead and the fictional players pick them over time,
 * so there is always something happening. Real users can join and play along.
 *
 * Everything it creates is flagged is_demo, so removeDemoLeague() clears it
 * in one go and owner stats can leave it out.
 */

export const DEMO_LEAGUE_NAME = 'NHL Demo League';
const DEMO_DESCRIPTION = 'A demo league with sample players, built on real NHL games. Join and play along: results come in automatically.';
const DEMO_EMAIL_DOMAIN = 'demo.yourfriendleague.invalid';

/** Fictional players. `skill` is how often they call the winner right (0–1). */
export const DEMO_PLAYERS: { name: string; skill: number; eagerness: number }[] = [
    { name: 'Mika_K', skill: 0.72, eagerness: 0.95 },
    { name: 'LauraB', skill: 0.66, eagerness: 0.9 },
    { name: 'JanisOnIce', skill: 0.63, eagerness: 0.85 },
    { name: 'Sofia.P', skill: 0.61, eagerness: 0.9 },
    { name: 'OskarTheGoalie', skill: 0.58, eagerness: 0.75 },
    { name: 'Elina_R', skill: 0.57, eagerness: 0.8 },
    { name: 'MarkoPuck', skill: 0.55, eagerness: 0.7 },
    { name: 'AnnaS', skill: 0.53, eagerness: 0.85 },
    { name: 'TomasV', skill: 0.5, eagerness: 0.65 },
    { name: 'KateH', skill: 0.48, eagerness: 0.8 },
    { name: 'RihardsZ', skill: 0.45, eagerness: 0.6 },
];
const ORGANISER = 'YFL_Demo';

const PAST_GAMES = 16;         // last season's final playoff games
const DAYS_AHEAD = 7;          // upcoming games are added this far ahead
const GAMES_PER_DAY = 3;       // keeps the list readable on busy NHL nights
const PICK_WINDOW = 3 * 86400; // fictional players pick games starting within 3 days

/** Small deterministic PRNG so re-running the seed gives the same picks. */
export function seededRandom(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    };
}

/**
 * A believable hockey pick. When the result is known, a player with higher
 * skill calls the winner more often and now and then nails the exact score.
 * Never a draw (hockey games always have a winner).
 */
export function demoPick(
    seed: string, skill: number, actual: { home: number; away: number } | null,
): { home: number; away: number } {
    const rnd = seededRandom(seed);
    if (actual && rnd() < skill * 0.22) return { ...actual }; // exact score
    const homeWins = actual && actual.home !== actual.away
        ? (rnd() < skill ? actual.home > actual.away : actual.home < actual.away)
        : rnd() < 0.55;
    const winner = 2 + Math.floor(rnd() * 4);           // 2–5 goals
    const loser = Math.floor(rnd() * Math.min(winner, 4)); // fewer than the winner
    return homeWins ? { home: winner, away: loser } : { home: loser, away: winner };
}

/** The NHL season (by start year) that is running or about to start. */
function currentNhlSeason(now = new Date()): number {
    return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1; // new season from August
}

async function demoTournamentId(): Promise<string | null> {
    const { rows } = await db.query('SELECT id FROM tournaments WHERE is_demo = true ORDER BY created_at LIMIT 1');
    return rows[0]?.id ?? null;
}

const demoEmail = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@${DEMO_EMAIL_DOMAIN}`;

async function ensureDemoUser(name: string, joinedDaysAgo: number): Promise<string> {
    const email = demoEmail(name);
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows[0]) return rows[0].id;

    // Usernames are unique across the site; add a number if a real user has this one.
    let username = name;
    for (let i = 2; ; i++) {
        const { rows: taken } = await db.query('SELECT 1 FROM users WHERE username = $1', [username]);
        if (!taken.length) break;
        username = `${name}${i}`;
    }
    const id = uuidv4();
    const createdAt = Math.floor(Date.now() / 1000) - joinedDaysAgo * 86400;
    // No password and no OAuth provider, so nobody can sign in as a demo player.
    await db.query(
        `INSERT INTO users (id, username, email, password, role, is_demo, created_at) VALUES ($1, $2, $3, NULL, 'user', true, $4)`,
        [id, username, email, createdAt]
    );
    return id;
}

async function addDemoMatches(tournamentId: string, apiMatches: { id: number; home_team: string; away_team: string; match_time: number; stage: string | null }[]) {
    let added = 0;
    for (const am of apiMatches) {
        const { rows } = await db.query('SELECT 1 FROM matches WHERE tournament_id = $1 AND api_match_id = $2', [tournamentId, am.id]);
        if (rows.length) continue;
        await db.query(
            `INSERT INTO matches (id, tournament_id, team_a, team_b, scheduled_time, sport, source, api_match_id, is_playoff)
             VALUES ($1, $2, $3, $4, $5, 'Ice Hockey', 'api', $6, $7)`,
            [uuidv4(), tournamentId, am.home_team, am.away_team, am.match_time, am.id, am.stage === 'playoffs']
        );
        added++;
    }
    return added;
}

/**
 * Fictional players pick the demo league's games: every finished game (so the
 * table has history) and upcoming games starting within PICK_WINDOW, a few more
 * each time this runs, so pick counts grow the way they would in a real league.
 */
async function addDemoPicks(tournamentId: string): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const { rows: players } = await db.query(
        `SELECT u.id, u.username, u.email FROM users u
         JOIN tournament_participants tp ON tp.user_id = u.id
         WHERE tp.tournament_id = $1 AND u.is_demo = true`, [tournamentId]);
    const { rows: games } = await db.query(
        `SELECT m.id, m.scheduled_time, am.home_score, am.away_score, am.status
         FROM matches m JOIN api_matches am ON am.id = m.api_match_id
         WHERE m.tournament_id = $1 AND (am.status = 'finished' OR m.scheduled_time BETWEEN $2 AND $2 + $3)`,
        [tournamentId, now, PICK_WINDOW]);

    let added = 0;
    for (const p of players) {
        const profile = DEMO_PLAYERS.find(d => demoEmail(d.name) === p.email) ?? { skill: 0.5, eagerness: 0.7 };
        for (const g of games) {
            const rnd = seededRandom(`${p.id}:${g.id}:join`);
            const upcoming = g.status !== 'finished';
            // Upcoming games get picked gradually: the closer kick-off, the more players have picked.
            const hoursLeft = (Number(g.scheduled_time) - now) / 3600;
            const chance = upcoming ? profile.eagerness * Math.min(1, Math.max(0.25, 1 - hoursLeft / 72)) : profile.eagerness;
            if (rnd() > chance) continue;

            const actual = g.status === 'finished' && g.home_score !== null ? { home: g.home_score, away: g.away_score } : null;
            const pick = demoPick(`${p.id}:${g.id}`, profile.skill, actual);
            const pickedAt = Number(g.scheduled_time) - Math.floor(3600 + rnd() * 40 * 3600);
            const { rowCount } = await db.query(
                `INSERT INTO predictions (id, match_id, user_id, team_a_score, team_b_score, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $6) ON CONFLICT (match_id, user_id) DO NOTHING`,
                [uuidv4(), g.id, p.id, pick.home, pick.away, Math.min(pickedAt, now)]
            );
            added += rowCount ?? 0;
        }
    }
    return added;
}

/** Add the next week's regular-season games (a few per day) to the demo league. */
async function addUpcomingGames(tournamentId: string): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const { rows } = await db.query(
        `SELECT am.id, am.home_team, am.away_team, am.match_time, am.stage
         FROM api_matches am JOIN api_leagues l ON l.id = am.api_league_id
         WHERE l.provider = 'nhl' AND am.stage IN ('regular', 'playoffs') AND am.status = 'scheduled'
           AND am.match_time BETWEEN $1 AND $1 + $2
         ORDER BY am.match_time, am.id`, [now, DAYS_AHEAD * 86400]);
    const perDay = new Map<string, number>();
    const chosen = rows.filter((r: { match_time: number }) => {
        const day = new Date(Number(r.match_time) * 1000).toISOString().slice(0, 10);
        const n = perDay.get(day) ?? 0;
        perDay.set(day, n + 1);
        return n < GAMES_PER_DAY;
    });
    return addDemoMatches(tournamentId, chosen);
}

/**
 * Create the demo league, or top it up if it exists. Safe to run repeatedly.
 * Tracks the NHL seasons it needs (last season for history, this season for
 * upcoming games) if they aren't tracked yet.
 */
export async function seedDemoLeague() {
    const season = currentNhlSeason();
    for (const s of [season - 1, season]) {
        const { rows } = await db.query(`SELECT 1 FROM api_leagues WHERE provider = 'nhl' AND season = $1 AND match_count > 0`, [s]);
        if (rows.length) continue;
        // A failed fetch isn't fatal: the league is built from what's there, and the
        // scheduled sync fills the season in later.
        await syncNewNhlSeason(s).catch(err => console.error(`Demo league: NHL ${s} sync failed:`, err));
    }

    let tournamentId = await demoTournamentId();
    const organiserId = await ensureDemoUser(ORGANISER, 120);
    if (!tournamentId) {
        tournamentId = uuidv4();
        await db.query(
            `INSERT INTO tournaments (id, name, join_code, created_by, sport, league_type, description, is_demo, created_at)
             VALUES ($1, $2, $3, $4, 'Ice Hockey', 'open', $5, true, $6)`,
            [tournamentId, DEMO_LEAGUE_NAME, generateJoinCode(), organiserId, DEMO_DESCRIPTION, Math.floor(Date.now() / 1000) - 120 * 86400]
        );
    }

    for (const [i, p] of DEMO_PLAYERS.entries()) {
        const userId = await ensureDemoUser(p.name, 110 - i * 3);
        await db.query(
            `INSERT INTO tournament_participants (id, tournament_id, user_id, joined_at) VALUES ($1, $2, $3, $4)
             ON CONFLICT (tournament_id, user_id) DO NOTHING`,
            [uuidv4(), tournamentId, userId, Math.floor(Date.now() / 1000) - (100 - i * 3) * 86400]
        );
    }

    // History: the last finished playoff games of last season.
    const { rows: past } = await db.query(
        `SELECT am.id, am.home_team, am.away_team, am.match_time, am.stage
         FROM api_matches am JOIN api_leagues l ON l.id = am.api_league_id
         WHERE l.provider = 'nhl' AND l.season = $1 AND am.stage = 'playoffs' AND am.status = 'finished'
         ORDER BY am.match_time DESC LIMIT $2`, [season - 1, PAST_GAMES]);
    const pastAdded = await addDemoMatches(tournamentId, past);
    const upcomingAdded = await addUpcomingGames(tournamentId);
    const picksAdded = await addDemoPicks(tournamentId);
    const applied = await applyImportedResults(tournamentId);

    return { tournamentId, pastAdded, upcomingAdded, picksAdded, resultsFilled: applied.filled };
}

/**
 * Called after each scheduled sync: keeps an existing demo league moving
 * (new games a week ahead, fictional players picking). Does nothing if there
 * is no demo league.
 */
export async function topUpDemoLeague() {
    const tournamentId = await demoTournamentId();
    if (!tournamentId) return null;
    const upcomingAdded = await addUpcomingGames(tournamentId);
    const picksAdded = await addDemoPicks(tournamentId);
    return { upcomingAdded, picksAdded };
}

/** Remove the demo league and every fictional player. */
export async function removeDemoLeague() {
    const { rowCount: leagues } = await db.query('DELETE FROM tournaments WHERE is_demo = true');
    await db.query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE is_demo = true)');
    const { rowCount: players } = await db.query('DELETE FROM users WHERE is_demo = true');
    return { leaguesRemoved: leagues ?? 0, playersRemoved: players ?? 0 };
}
