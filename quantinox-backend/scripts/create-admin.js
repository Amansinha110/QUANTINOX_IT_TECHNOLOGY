// Create (or reset) an admin account:
//   npm run create-admin -- --email you@company.com --name "Your Name" [--role owner|editor|viewer]
// You will be asked for the password (or set ADMIN_NEW_PASSWORD for scripted use).
import readline from 'node:readline';
import { loadConfig } from '../src/config.js';
import { openDatabase, now } from '../src/db/index.js';
import { hashPassword } from '../src/lib/security.js';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split(/\s*--/).filter(Boolean).map((p) => { const [k, ...v] = p.split(' '); return [k, v.join(' ').replace(/^"|"$/g, '')]; }));
if (!args.email) { console.error('Usage: npm run create-admin -- --email you@company.com --name "Your Name" [--role owner]'); process.exit(1); }
const role = args.role || 'owner';
if (!['owner', 'editor', 'viewer'].includes(role)) { console.error('Role must be owner, editor or viewer'); process.exit(1); }

function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); else rl.output.write('*'); };
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
const password = process.env.ADMIN_NEW_PASSWORD || await ask('Password (12+ characters): ');
if (password.length < 12) { console.error('Use at least 12 characters.'); process.exit(1); }

const config = loadConfig();
const db = openDatabase(config.DATABASE_FILE);
const hash = await hashPassword(password);
const t = now();
const existing = db.get('SELECT id FROM admins WHERE email = ?', args.email.toLowerCase());
if (existing) {
  db.run('UPDATE admins SET password_hash = ?, role = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?', hash, role, t, existing.id);
  db.run("DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?", existing.id);
  console.log(`Updated admin ${args.email} (role: ${role}). Other sessions were signed out.`);
} else {
  db.run('INSERT INTO admins (email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', args.email.toLowerCase(), args.name || args.email, role, hash, t, t);
  console.log(`Created admin ${args.email} (role: ${role}). Sign in at ${config.PUBLIC_URL}/admin`);
}
db.run('INSERT INTO audit_log (actor, action, target, created_at) VALUES (?, ?, ?, ?)', 'cli', existing ? 'admin.reset' : 'admin.create', args.email.toLowerCase(), t);
db.close();
