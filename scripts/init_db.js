const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'predictions.db');
// Delete existing db if it exists to start fresh? 
// For now, let's just connect. If we want a fresh start, we can delete the file manually or add a flag.
const db = new Database(dbPath);

console.log('Initializing database at:', dbPath);

db.pragma('foreign_keys = ON');

// Schema Definition (Copying from lib/db.ts to ensure sync, but in a scriptable way)
// In a real production app, we might use a migration tool.
const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'premium', 'user')),
      is_paid INTEGER NOT NULL DEFAULT 0,
      avatar_url TEXT,
      bio TEXT,
      best_streak INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_url TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    )`,
    `CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      join_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      sport TEXT NOT NULL DEFAULT 'Football',
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      team_a TEXT NOT NULL,
      team_b TEXT NOT NULL,
      scheduled_time INTEGER NOT NULL,
      team_a_score INTEGER,
      team_b_score INTEGER,
      is_finished INTEGER NOT NULL DEFAULT 0,
      sport TEXT NOT NULL DEFAULT 'Football',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      team_a_score INTEGER NOT NULL,
      team_b_score INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(match_id, user_id),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tournament_participants (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(tournament_id, user_id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS sports (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id)`,
    `CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id)`,
    `CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_participants_tournament ON tournament_participants(tournament_id)`,
    `CREATE INDEX IF NOT EXISTS idx_participants_user ON tournament_participants(user_id)`
];

db.transaction(() => {
    for (const stmt of schema) {
        db.exec(stmt);
    }

    // Seed Sports
    const sportsCount = db.prepare('SELECT COUNT(*) as count FROM sports').get();
    if (sportsCount.count === 0) {
        console.log('Seeding sports...');
        const defaultSports = [
            'Football', 'Basketball', 'Tennis', 'Volleyball', 'Ice Hockey',
            'Formula 1', 'MotoGP', 'League of Legends', 'Counter-Strike',
            'Dota 2', 'Valorant'
        ];
        const insert = db.prepare('INSERT INTO sports (id, name) VALUES (?, ?)');
        const { v4: uuidv4 } = require('uuid');
        defaultSports.forEach(sport => {
            insert.run(uuidv4(), sport);
        });
    }

    // Ensure columns exist (for migration)
    try {
        db.exec("ALTER TABLE tournaments ADD COLUMN sport TEXT NOT NULL DEFAULT 'Football'");
        console.log('Migrated: Added sport to tournaments');
    } catch (e) { }
    try {
        db.exec("ALTER TABLE matches ADD COLUMN sport TEXT NOT NULL DEFAULT 'Football'");
        console.log('Migrated: Added sport to matches');
    } catch (e) { }

})();

console.log('Database initialized successfully.');
db.close();
