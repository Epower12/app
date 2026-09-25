const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, '..', 'data', 'predictions.db');
    const db = new Database(dbPath);

    console.log('--- TOURNAMENTS SCHEMA ---');
    const tInfo = db.prepare("PRAGMA table_info(tournaments)").all();
    console.log(tInfo.map(i => `${i.name}: ${i.type}`).join(', '));

    console.log('\n--- MATCHS SCHEMA ---');
    const mInfo = db.prepare("PRAGMA table_info(matches)").all();
    console.log(mInfo.map(i => `${i.name}: ${i.type}`).join(', '));

    console.log('\n--- DATA VERIFICATION ---');
    const tournament = db.prepare("SELECT name, sport FROM tournaments LIMIT 1").get();
    console.log('Tournament:', tournament);

    const match = db.prepare("SELECT team_a, team_b, sport FROM matches LIMIT 1").get();
    console.log('Match:', match);

    db.close();
} catch (e) {
    console.error('VERIFICATION FAILED:', e.message);
}
