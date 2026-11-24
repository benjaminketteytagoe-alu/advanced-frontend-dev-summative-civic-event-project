// Runs one SQL file on the database named in .env. npm runs it from the backend folder
import fs from 'fs';
import db from '../src/config/db.js';

const name = process.argv[2];

try {
    const sql = fs.readFileSync('migrations/' + name, 'utf8');
    await db.query(sql);
    console.log(`${name} done`);
} catch (err) {
    console.error(`${name} failed: ${err.message}`);
    process.exitCode = 1; // tells npm it failed
}

await db.end();
