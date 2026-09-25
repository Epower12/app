const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, '..', 'data', 'predictions.db');
const db = new Database(dbPath);

const data = {
    tournaments: db.prepare("SELECT * FROM tournaments").all(),
    matches: db.prepare("SELECT * FROM matches").all()
};

fs.writeFileSync('db_audit.json', JSON.stringify(data, null, 2));
console.log('Audit complete. Read db_audit.json');
