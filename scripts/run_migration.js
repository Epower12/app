const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'predictions.db');
const db = new Database(dbPath);

console.log('Running migrations...');

try {
    db.exec("ALTER TABLE tournaments ADD COLUMN sport TEXT NOT NULL DEFAULT 'Football'");
    console.log('Added sport to tournaments');
} catch (e) {
    console.log('tournaments sport column might already exist:', e.message);
}

try {
    db.exec("ALTER TABLE matches ADD COLUMN sport TEXT NOT NULL DEFAULT 'Football'");
    console.log('Added sport to matches');
} catch (e) {
    console.log('matches sport column might already exist:', e.message);
}

// Verify
const tInfo = db.prepare("PRAGMA table_info(tournaments)").all();
console.log('Tournaments structure:', tInfo.map(i => i.name).join(', '));

const mInfo = db.prepare("PRAGMA table_info(matches)").all();
console.log('Matches structure:', mInfo.map(i => i.name).join(', '));

db.close();
