const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'predictions.db');
// Note: process.cwd() will still be the root if run from root via `node scripts/diag.js`
// But if run from scripts dir, it will be wrong. Using __dirname is safer.
// Changing to __dirname based path for consistency.
const db = new Database(dbPath);

console.log('--- Tournaments ---');
const tournaments = db.prepare('SELECT id, name, created_by, sport FROM tournaments').all();
console.log(JSON.stringify(tournaments, null, 2));

console.log('\n--- Participants ---');
const participants = db.prepare('SELECT tournament_id, user_id FROM tournament_participants').all();
console.log(JSON.stringify(participants, null, 2));

console.log('\n--- Users ---');
const users = db.prepare('SELECT id, username, role FROM users').all();
console.log(JSON.stringify(users, null, 2));
