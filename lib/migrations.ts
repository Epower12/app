import db from './db';

/**
 * The single source of truth for the database schema. See docs/DATABASE.md
 * for what each table is for.
 *
 * Every statement is idempotent (IF NOT EXISTS / IF EXISTS), so this is safe to
 * run on every server start against the live database — on an existing
 * database it's a series of no-ops, on a fresh one it builds everything.
 */

// Postgres "already exists" error codes: expected on repeat runs of statements
// that have no IF NOT EXISTS form (e.g. ADD CONSTRAINT). Anything else is a
// real failure and gets logged instead of silently swallowed.
const ALREADY_EXISTS = new Set(['42P07', '42710', '42701']);

async function run(sql: string) {
    try {
        await db.query(sql);
    } catch (err) {
        const e = err as { code?: string; message?: string };
        if (!ALREADY_EXISTS.has(e?.code ?? '')) {
            console.warn('[migrations] statement failed:', e?.message ?? err, '\n', sql.trim().split('\n')[0]);
        }
    }
}

/**
 * Core tables. Originally created by scripts/init_pg.js, the owner-only
 * /api/owner/migrate route and a few API routes; consolidated here so a fresh
 * database gets the complete schema without any manual steps.
 */
async function baseSchema() {
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'premium', 'user')),
            is_paid BOOLEAN NOT NULL DEFAULT FALSE,
            avatar_url TEXT,
            bio TEXT,
            best_streak INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS achievements (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            icon_url TEXT NOT NULL
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS user_achievements (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
            unlocked_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
            UNIQUE(user_id, achievement_id)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS tournaments (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            join_code VARCHAR(255) UNIQUE NOT NULL,
            created_by UUID NOT NULL REFERENCES users(id),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
            sport VARCHAR(255) NOT NULL DEFAULT 'Football',
            league_type VARCHAR(50) NOT NULL DEFAULT 'open',
            description TEXT DEFAULT '',
            max_participants INTEGER NOT NULL DEFAULT 0
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS matches (
            id UUID PRIMARY KEY,
            tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            team_a VARCHAR(255) NOT NULL,
            team_b VARCHAR(255) NOT NULL,
            scheduled_time BIGINT NOT NULL,
            team_a_score INTEGER,
            team_b_score INTEGER,
            is_finished BOOLEAN NOT NULL DEFAULT FALSE,
            sport VARCHAR(255) NOT NULL DEFAULT 'Football',
            created_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS predictions (
            id UUID PRIMARY KEY,
            match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            team_a_score INTEGER NOT NULL,
            team_b_score INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
            updated_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
            UNIQUE(match_id, user_id)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS tournament_participants (
            id UUID PRIMARY KEY,
            tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            joined_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
            UNIQUE(tournament_id, user_id)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS sports (
            id UUID PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    `);
    // Seed the default sports list on a fresh database only.
    await run(`
        INSERT INTO sports (id, name)
        SELECT gen_random_uuid(), s FROM unnest(ARRAY[
            'Football', 'Basketball', 'Tennis', 'Volleyball', 'Ice Hockey', 'Formula 1',
            'MotoGP', 'League of Legends', 'Counter-Strike', 'Dota 2', 'Valorant'
        ]) AS s
        WHERE NOT EXISTS (SELECT 1 FROM sports)
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_participants_tournament ON tournament_participants(tournament_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_participants_user ON tournament_participants(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_tournaments_league_type ON tournaments(league_type)`);
    // New: the predictions/manage pages list a league's matches in kick-off order,
    // and the organiser dashboard looks leagues up by creator.
    await run(`CREATE INDEX IF NOT EXISTS idx_matches_tournament_time ON matches(tournament_id, scheduled_time)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by)`);

    // Synced fixture sources (was /api/owner/migrate).
    await run(`
        CREATE TABLE IF NOT EXISTS api_leagues (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sport TEXT NOT NULL DEFAULT 'Ice Hockey',
            external_id INTEGER NOT NULL,
            season INTEGER NOT NULL,
            country TEXT,
            logo_url TEXT,
            match_count INTEGER DEFAULT 0,
            synced_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
            UNIQUE(external_id, season)
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS api_matches (
            id SERIAL PRIMARY KEY,
            api_league_id INTEGER REFERENCES api_leagues(id) ON DELETE CASCADE,
            external_id BIGINT NOT NULL UNIQUE,
            home_team TEXT NOT NULL,
            away_team TEXT NOT NULL,
            match_time BIGINT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            home_score INTEGER,
            away_score INTEGER,
            synced_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        )
    `);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_match_id INTEGER REFERENCES api_matches(id) ON DELETE SET NULL`);

    // Stripe subscription fields (was lib/stripe.ts ensureStripeColumns).
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end BIGINT`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id)`);

    // In-app notifications (was /api/notifications + /api/matches/[id]).
    await run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            tournament_id UUID,
            match_id UUID,
            message TEXT NOT NULL,
            points_earned INTEGER,
            is_read BOOLEAN DEFAULT false,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)`);

    // Password reset tokens (was /api/auth/forgot-password; that route still
    // handles the legacy token → token_hash column rename itself).
    await run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at BIGINT NOT NULL,
            used BOOLEAN DEFAULT false,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        )
    `);
}

/**
 * Run all schema migrations idempotently: the core tables first, then the
 * incremental changes below (in the order they were introduced).
 */
export async function runMigrations() {
    await baseSchema();

    // matches: multi-format fields
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'score'`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS series_format TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS race_session TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN DEFAULT FALSE`);

    // race_drivers: driver roster per tournament
    await run(`
        CREATE TABLE IF NOT EXISTS race_drivers (
            id UUID PRIMARY KEY,
            tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            driver_name TEXT NOT NULL,
            team_name TEXT,
            number INTEGER,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_race_drivers_tournament ON race_drivers(tournament_id)`);

    // race_predictions: P1/P2/P3 podium picks
    await run(`
        CREATE TABLE IF NOT EXISTS race_predictions (
            id UUID PRIMARY KEY,
            match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            p1_driver TEXT NOT NULL,
            p2_driver TEXT NOT NULL,
            p3_driver TEXT NOT NULL,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
            updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
            UNIQUE(match_id, user_id)
        )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_race_preds_match ON race_predictions(match_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_race_preds_user ON race_predictions(user_id)`);

    // race results on matches: p1_driver, p2_driver, p3_driver (actual podium)
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS p1_driver TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS p2_driver TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS p3_driver TEXT`);

    // OAuth accounts: no password, and track which provider created the account
    await run(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT`);

    // api_leagues/api_matches: original unique constraints didn't scope by sport/league,
    // so a hockey and football external_id collision would silently overwrite each other's
    // synced data once a second sport was added. Widen the uniqueness key.
    // Note: Postgres has no "ADD CONSTRAINT IF NOT EXISTS" -- idempotency here comes from
    // .catch(() => {}) swallowing the "already exists" error on repeat runs, same as elsewhere
    // in this file. Do not add IF NOT EXISTS to ADD CONSTRAINT -- it's a syntax error there,
    // which silently no-ops via the same .catch() and masks the constraint never being created.
    await run(`ALTER TABLE api_leagues DROP CONSTRAINT IF EXISTS api_leagues_external_id_season_key`);
    await run(`ALTER TABLE api_matches DROP CONSTRAINT IF EXISTS api_matches_external_id_key`);
    await run(`ALTER TABLE api_matches ADD CONSTRAINT api_matches_league_external_id_key UNIQUE (api_league_id, external_id)`);

    // api_leagues: now tracks sources from multiple providers (api-sports, nhl, jolpica-f1),
    // not just api-sports. Widen uniqueness to include provider (supersedes the sport-only
    // constraint from directly above, which is dropped again here in case it was ever created).
    await run(`ALTER TABLE api_leagues ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'api-sports'`);
    await run(`ALTER TABLE api_leagues DROP CONSTRAINT IF EXISTS api_leagues_sport_external_id_season_key`);
    await run(`ALTER TABLE api_leagues ADD CONSTRAINT api_leagues_provider_sport_external_id_season_key UNIQUE (provider, sport, external_id, season)`);

    // api_races: staging table for Formula 1 race calendar sync (Jolpica-F1).
    // Separate from api_matches because races are podium (P1/P2/P3 driver) predictions,
    // not team-vs-team score predictions -- a structurally different shape.
    await run(`
        CREATE TABLE IF NOT EXISTS api_races (
            id SERIAL PRIMARY KEY,
            api_league_id INTEGER NOT NULL REFERENCES api_leagues(id) ON DELETE CASCADE,
            season INTEGER NOT NULL,
            round INTEGER NOT NULL,
            race_name TEXT NOT NULL,
            race_time BIGINT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            p1_driver TEXT,
            p2_driver TEXT,
            p3_driver TEXT,
            synced_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
            UNIQUE(season, round)
        )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_api_races_league ON api_races(api_league_id)`);

    // matches: track which api_races row a race-type match was imported from, for import dedup
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_race_id INTEGER`);

    // Race weekend v2: full Top 10 order + bonus-question predictions, replacing the
    // P1/P2/P3-only flow above (race_predictions / race_drivers.p1_driver etc are left
    // in place, unused, rather than dropped — no data migration risk).
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS top10_result JSONB`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS pole_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS fastest_lap_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS first_retirement_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS safety_car_result BOOLEAN`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS positions_gained_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS positions_lost_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS winning_margin_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS retirements_result TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_season_finale BOOLEAN NOT NULL DEFAULT FALSE`);

    await run(`
        CREATE TABLE IF NOT EXISTS race_weekend_predictions (
            id UUID PRIMARY KEY,
            match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            picks JSONB NOT NULL DEFAULT '[]',
            pole_pick TEXT,
            fastest_lap_pick TEXT,
            first_retirement_pick TEXT,
            safety_car_pick BOOLEAN,
            positions_gained_pick TEXT,
            positions_lost_pick TEXT,
            winning_margin_pick TEXT,
            retirements_pick TEXT,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
            updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
            UNIQUE(match_id, user_id)
        )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_race_weekend_preds_match ON race_weekend_predictions(match_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_race_weekend_preds_user ON race_weekend_predictions(user_id)`);

    // tournaments: per-league toggle for which race bonus questions are active.
    // NULL means "use the suggested defaults" (see defaultRaceBonusConfig in lib/types.ts).
    await run(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS race_bonus_config JSONB`);

    // Automatic results. matches.result_source says who entered the result
    // ('api' = filled in by the sync, 'manual' = the organiser; NULL = before this
    // existed, treated as manual). An organiser's result is never overwritten;
    // result_note explains anything the organiser should look at (a different
    // official score, a postponement, a bonus answer still to enter).
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_source TEXT`);
    await run(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_note TEXT`);
    await run(`CREATE INDEX IF NOT EXISTS idx_matches_api_match ON matches(api_match_id) WHERE api_match_id IS NOT NULL`);
    await run(`CREATE INDEX IF NOT EXISTS idx_matches_api_race ON matches(api_race_id) WHERE api_race_id IS NOT NULL`);
    // api_races: the full classification (not just the podium) and the pole sitter.
    await run(`ALTER TABLE api_races ADD COLUMN IF NOT EXISTS result_rows JSONB`);
    await run(`ALTER TABLE api_races ADD COLUMN IF NOT EXISTS pole_driver TEXT`);
    await run(`ALTER TABLE api_races ADD COLUMN IF NOT EXISTS pole_number TEXT`);
}

// One shared run per server process: the startup hook (instrumentation.ts) and
// any early requests all await the same promise instead of racing each other.
let migrationRun: Promise<void> | null = null;
export async function ensureMigrations() {
    if (!migrationRun) {
        migrationRun = runMigrations().catch(err => {
            migrationRun = null; // let a later call retry
            throw err;
        });
    }
    await migrationRun;
}
