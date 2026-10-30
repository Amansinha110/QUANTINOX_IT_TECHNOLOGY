// Safe online backup of the database (works while the server is running):
//   npm run backup                 -> data/backups/quantinox-YYYY-MM-DD-HHMM.db
//   BACKUP_KEEP=14 npm run backup  -> keep the 14 newest backups (default 30)
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadConfig } from '../src/config.js';

const config = loadConfig();
const dir = process.env.BACKUP_DIR || path.join(path.dirname(config.DATABASE_FILE), 'backups');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const file = path.join(dir, `quantinox-${stamp}.db`);
const db = new DatabaseSync(config.DATABASE_FILE);
db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
db.close();
const check = new DatabaseSync(file);
const ok = check.prepare('PRAGMA integrity_check').get();
check.close();
console.log(`Backup written: ${file} (${Math.round(fs.statSync(file).size / 1024)} KB, integrity: ${Object.values(ok)[0]})`);
const keep = Number(process.env.BACKUP_KEEP || 30);
const old = fs.readdirSync(dir).filter((f) => /^quantinox-.*\.db$/.test(f)).sort().reverse().slice(keep);
for (const f of old) fs.unlinkSync(path.join(dir, f));
if (old.length) console.log(`Removed ${old.length} old backup(s).`);
