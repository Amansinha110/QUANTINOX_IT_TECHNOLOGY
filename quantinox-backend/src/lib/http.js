// Shared HTTP helpers: errors in the format the website expects, validation, sessions, audit.
import { z } from 'zod';
import { hmac, randomToken, sha256 } from './security.js';
import { now, addMs } from '../db/index.js';

export class HttpError extends Error {
  constructor(status, body) { super(body?.error || 'error'); this.status = status; this.body = body; }
}
export const fail = (status, error, extra = {}) => { throw new HttpError(status, { error, ...extra }); };

// Validate with zod and answer 400 { error: 'invalid', fields: [{ field, message }] }
export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  const fields = r.error.issues.map((i) => ({ field: String(i.path[0] ?? ''), message: i.message }));
  throw new HttpError(400, { error: 'invalid', fields });
}

// Common field types
export const str = (max, min = 0) => z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(min).max(max));
export const optional = (max) => z.preprocess((v) => (typeof v === 'string' ? (v.trim() === '' ? undefined : v.trim()) : v), z.string().max(max).optional());
export const email = z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.email().max(254));
export const consent = z.preprocess((v) => (v === true || v === 'yes' || v === 'on' || v === 'true'), z.literal(true, { message: 'Consent is required' }));
export const lang = z.preprocess((v) => (v === 'hi' ? 'hi' : 'en'), z.enum(['en', 'hi']));

export const ipHash = (config, ip) => (ip ? hmac(config.SECRET, 'ip:' + ip).slice(0, 32) : null);

export function audit(db, actor, action, target = null, details = null, ip = null) {
  db.run('INSERT INTO audit_log (actor, action, target, details, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    actor, action, target, details ? JSON.stringify(details).slice(0, 2000) : null, ip, now());
}

// ---- Sessions (customer and admin). The cookie holds a random token; the database stores its hash.
export const SESSION = {
  customer: { cookie: 'qx_session', ttl: 30 * 864e5, sameSite: 'lax' },
  admin: { cookie: 'qx_admin', ttl: 12 * 3600e3, sameSite: 'strict' },
};
export function startSession(app, reply, kind, subjectId, req) {
  const token = randomToken(32);
  const t = now();
  app.db.run('INSERT INTO sessions (token_hash, kind, subject_id, ip_hash, user_agent, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    sha256(token), kind, subjectId, ipHash(app.config, req.ip), String(req.headers['user-agent'] || '').slice(0, 200), t, t, addMs(SESSION[kind].ttl));
  setSessionCookie(app, reply, kind, token);
  return token;
}
export function setSessionCookie(app, reply, kind, token, maxAgeMs = SESSION[kind].ttl) {
  reply.setCookie(SESSION[kind].cookie, token, {
    path: '/', httpOnly: true, secure: app.config.cookieSecure, sameSite: SESSION[kind].sameSite,
    domain: kind === 'customer' ? app.config.COOKIE_DOMAIN : undefined, maxAge: Math.floor(maxAgeMs / 1000),
  });
}
export function clearSessionCookie(app, reply, kind) {
  reply.clearCookie(SESSION[kind].cookie, { path: '/', domain: kind === 'customer' ? app.config.COOKIE_DOMAIN : undefined });
}
export function readSession(app, req, kind) {
  const token = req.cookies?.[SESSION[kind].cookie];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const s = app.db.get('SELECT * FROM sessions WHERE token_hash = ? AND kind = ?', sha256(token), kind);
  if (!s || s.expires_at < now()) return null;
  // sliding expiry: refresh at most once an hour
  if (Date.now() - Date.parse(s.last_seen_at) > 3600e3) {
    app.db.run('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?', now(), addMs(SESSION[kind].ttl), s.id);
  }
  return s;
}
export function endSession(app, req, kind) {
  const token = req.cookies?.[SESSION[kind].cookie];
  if (token) app.db.run('DELETE FROM sessions WHERE token_hash = ? AND kind = ?', sha256(token), kind);
}

// ---- One-time tokens (email verification, password reset, newsletter)
export function issueToken(db, purpose, subjectId, ttlMs) {
  const token = randomToken(32);
  db.run('INSERT INTO tokens (token_hash, purpose, subject_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)', sha256(token), purpose, subjectId, addMs(ttlMs), now());
  return token;
}
export function useToken(db, purpose, token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
  const row = db.get('SELECT * FROM tokens WHERE token_hash = ? AND purpose = ?', sha256(token), purpose);
  if (!row || row.used_at || row.expires_at < now()) return null;
  db.run('UPDATE tokens SET used_at = ? WHERE id = ?', now(), row.id);
  return row;
}

// ---- Daily counters (e.g. assistant usage cap)
export function bump(db, name, by = 1) {
  const day = now().slice(0, 10);
  db.run('INSERT INTO counters (name, day, value) VALUES (?, ?, ?) ON CONFLICT(name, day) DO UPDATE SET value = value + excluded.value', name, day, by);
  return db.get('SELECT value FROM counters WHERE name = ? AND day = ?', name, day).value;
}

// ---- Admin guard shared by admin route files: signed-in admin with at least this role.
// Changes (POST/PATCH/DELETE) must also carry the X-Admin: 1 header (cross-site request forgery guard).
const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };
export function requireAdmin(app, req, role = 'viewer') {
  if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-admin'] !== '1') fail(403, 'forbidden');
  const s = readSession(app, req, 'admin');
  if (!s) fail(401, 'unauthorized');
  const a = app.db.get('SELECT * FROM admins WHERE id = ?', s.subject_id);
  if (!a) fail(401, 'unauthorized');
  if (ROLE_RANK[a.role] < ROLE_RANK[role]) fail(403, 'forbidden');
  req.admin = a;
  return a;
}
