const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const useSsl = process.env.NODE_ENV === 'production' ||
    (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

async function initializeDatabase() {
    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    console.log('Connecting to PostgreSQL database...');

    try {
        // Users table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'premium', 'user')),
        is_paid BOOLEAN NOT NULL DEFAULT FALSE,
        avatar_url TEXT,
        bio TEXT,
        best_streak INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER)
      )
    `);

        // Achievements table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT NOT NULL
      )
    `);

        // User Achievements join table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
        UNIQUE(user_id, achievement_id)
      )
    `);

        // Tournaments table
        await pool.query(`
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

        // Matches table
        await pool.query(`
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

        // Predictions table
        await pool.query(`
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

        // Tournament participants table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id UUID PRIMARY KEY,
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at INTEGER NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS INTEGER),
        UNIQUE(tournament_id, user_id)
      )
    `);

        // Sports table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sports (
        id UUID PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      )
    `);

        // Seed sports if empty
        const { rows: sportsCount } = await pool.query('SELECT COUNT(*) as count FROM sports');
        if (parseInt(sportsCount[0].count, 10) === 0) {
            const defaultSports = [
                'Football', 'Basketball', 'Tennis', 'Volleyball', 'Ice Hockey',
                'Formula 1', 'MotoGP', 'League of Legends', 'Counter-Strike',
                'Dota 2', 'Valorant'
            ];

            const { v4: uuidv4 } = require('uuid');
            for (const sport of defaultSports) {
                await pool.query('INSERT INTO sports (id, name) VALUES ($1, $2)', [uuidv4(), sport]);
            }
            console.log('Seeded default sports.');
        }

        // Create indexes for better performance
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_participants_tournament ON tournament_participants(tournament_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_participants_user ON tournament_participants(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tournaments_league_type ON tournaments(league_type)');

        console.log('Database schema initialized successfully for PostgreSQL.');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
