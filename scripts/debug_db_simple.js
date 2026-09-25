const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'predictions.db');
const db = new Database(dbPath);

const tournaments = db.prepare("SELECT id, name, sport FROM tournaments WHERE name LIKE '%Olympics Hockey%'").all();
tournaments.forEach(t => {
    console.log(`Tournament: ${t.name} (ID: ${t.id}), Sport: ${t.sport}`);
    const matches = db.prepare("SELECT id, team_a, team_b, sport FROM matches WHERE tournament_id = ?").all(t.id);
    matches.forEach(m => {
        console.log(`  Match: ${m.team_a} vs ${m.team_b}, Sport: ${m.sport}`);
    });
});
