const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'predictions.db');
const db = new Database(dbPath);

console.log('--- Tournaments Table ---');
const tournaments = db.prepare('PRAGMA table_info(tournaments)').all();
console.log(tournaments.map(c => `${c.name} (${c.type})`).join(', '));

console.log('\n--- Matches Table ---');
const matches = db.prepare('PRAGMA table_info(matches)').all();
console.log(matches.map(c => `${c.name} (${c.type})`).join(', '));

console.log('\n--- Sample Data ---');
const tSample = db.prepare('SELECT name, sport FROM tournaments LIMIT 1').get();
console.log('Tournament Sport:', tSample);

const mSample = db.prepare('SELECT team_a, team_b, sport FROM matches LIMIT 1').get();
console.log('Match Sport:', mSample);

db.close();
