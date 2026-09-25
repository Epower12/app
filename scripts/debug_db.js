const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'predictions.db');
const db = new Database(dbPath);

try {
    console.log('--- Tournaments ---');
    const tournaments = db.prepare("SELECT id, name, sport FROM tournaments WHERE name LIKE '%Olympics Hockey%'").all();
    console.log(JSON.stringify(tournaments, null, 2));

    console.log('\n--- Matches for these tournaments ---');
    const tournamentIds = tournaments.map(t => t.id);
    if (tournamentIds.length > 0) {
        // SQLITE doesn't support array parameters directly in this way easily without mapping
        const placeholders = tournamentIds.map(() => '?').join(',');
        const query = `SELECT id, team_a, team_b, sport, tournament_id FROM matches WHERE tournament_id IN (${placeholders})`;
        const matches = db.prepare(query).all(...tournamentIds);
        console.log(JSON.stringify(matches, null, 2));
    } else {
        console.log('No matches found because no tournaments matched.');
    }
} catch (error) {
    console.error('DATABASE ERROR:', error.message);
}
