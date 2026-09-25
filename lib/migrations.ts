import db from './db';

/**
 * Run all schema migrations idempotently.
 * Called at startup from the API routes that depend on new columns/tables.
 */
export async function runMigrations() {
    // matches: multi-format fields
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'score'`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS series_format TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS race_session TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN DEFAULT FALSE`).catch(() => {});

    // race_drivers: driver roster per tournament
    await db.query(`
        CREATE TABLE IF NOT EXISTS race_drivers (
            id UUID PRIMARY KEY,
            tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            driver_name TEXT NOT NULL,
            team_name TEXT,
            number INTEGER,
            created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        )
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_race_drivers_tournament ON race_drivers(tournament_id)`).catch(() => {});

    // race_predictions: P1/P2/P3 podium picks
    await db.query(`
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
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_race_preds_match ON race_predictions(match_id)`).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_race_preds_user ON race_predictions(user_id)`).catch(() => {});

    // race results on matches: p1_driver, p2_driver, p3_driver (actual podium)
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS p1_driver TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS p2_driver TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS p3_driver TEXT`).catch(() => {});

    // OAuth accounts: no password, and track which provider created the account
    await db.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT`).catch(() => {});

    // api_leagues/api_matches: original unique constraints didn't scope by sport/league,
    // so a hockey and football external_id collision would silently overwrite each other's
    // synced data once a second sport was added. Widen the uniqueness key.
    // Note: Postgres has no "ADD CONSTRAINT IF NOT EXISTS" -- idempotency here comes from
    // .catch(() => {}) swallowing the "already exists" error on repeat runs, same as elsewhere
    // in this file. Do not add IF NOT EXISTS to ADD CONSTRAINT -- it's a syntax error there,
    // which silently no-ops via the same .catch() and masks the constraint never being created.
    await db.query(`ALTER TABLE api_leagues DROP CONSTRAINT IF EXISTS api_leagues_external_id_season_key`).catch(() => {});
    await db.query(`ALTER TABLE api_matches DROP CONSTRAINT IF EXISTS api_matches_external_id_key`).catch(() => {});
    await db.query(`ALTER TABLE api_matches ADD CONSTRAINT api_matches_league_external_id_key UNIQUE (api_league_id, external_id)`).catch(() => {});

    // api_leagues: now tracks sources from multiple providers (api-sports, nhl, jolpica-f1),
    // not just api-sports. Widen uniqueness to include provider (supersedes the sport-only
    // constraint from directly above, which is dropped again here in case it was ever created).
    await db.query(`ALTER TABLE api_leagues ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'api-sports'`).catch(() => {});
    await db.query(`ALTER TABLE api_leagues DROP CONSTRAINT IF EXISTS api_leagues_sport_external_id_season_key`).catch(() => {});
    await db.query(`ALTER TABLE api_leagues ADD CONSTRAINT api_leagues_provider_sport_external_id_season_key UNIQUE (provider, sport, external_id, season)`).catch(() => {});

    // api_races: staging table for Formula 1 race calendar sync (Jolpica-F1).
    // Separate from api_matches because races are podium (P1/P2/P3 driver) predictions,
    // not team-vs-team score predictions -- a structurally different shape.
    await db.query(`
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
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_api_races_league ON api_races(api_league_id)`).catch(() => {});

    // matches: track which api_races row a race-type match was imported from, for import dedup
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_race_id INTEGER`).catch(() => {});

    // Race weekend v2: full Top 10 order + bonus-question predictions, replacing the
    // P1/P2/P3-only flow above (race_predictions / race_drivers.p1_driver etc are left
    // in place, unused, rather than dropped — no data migration risk).
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS top10_result JSONB`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS pole_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS fastest_lap_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS first_retirement_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS safety_car_result BOOLEAN`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS positions_gained_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS positions_lost_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS winning_margin_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS retirements_result TEXT`).catch(() => {});
    await db.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_season_finale BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});

    await db.query(`
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
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_race_weekend_preds_match ON race_weekend_predictions(match_id)`).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_race_weekend_preds_user ON race_weekend_predictions(user_id)`).catch(() => {});

    // tournaments: per-league toggle for which race bonus questions are active.
    // NULL means "use the suggested defaults" (see defaultRaceBonusConfig in lib/types.ts).
    await db.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS race_bonus_config JSONB`).catch(() => {});
}

let migrationRan = false;
export async function ensureMigrations() {
    if (migrationRan) return;
    await runMigrations();
    migrationRan = true;
}
