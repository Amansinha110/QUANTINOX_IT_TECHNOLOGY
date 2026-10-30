// Admin dashboard API (/api/admin/*). Same-origin only, SameSite=Strict cookie, X-Admin header on
// every change (blocks cross-site request forgery), roles: owner > editor > viewer, optional 2FA.
import fs from 'node:fs';
import { z } from 'zod';
import { parse, str, email, fail, audit, ipHash, startSession, readSession, endSession, clearSessionCookie } from '../lib/http.js';
import { hashPassword, verifyPassword, fakeVerify, newTotpSecret, verifyTotp, encrypt, decrypt } from '../lib/security.js';
import { now, addMs } from '../db/index.js';

const RANK = { viewer: 1, editor: 2, owner: 3 };
const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'];
const TYPES = ['demo', 'assistant_demo', 'callback', 'contact', 'event', 'trial', 'download'];
const started = Date.now();

export default async function adminRoutes(app) {
  const { db, config, jobs, knowledge } = app;
  const tags = ['Admin'];

  // ---- guards
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/admin')) return;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-admin'] !== '1') fail(403, 'forbidden');
  });
  function requireAdmin(req, role = 'viewer') {
    const s = readSession(app, req, 'admin');
    if (!s) fail(401, 'unauthorized');
    const a = db.get('SELECT * FROM admins WHERE id = ?', s.subject_id);
    if (!a) fail(401, 'unauthorized');
    if (RANK[a.role] < RANK[role]) fail(403, 'forbidden');
    req.admin = a;
    return a;
  }
  const who = (req) => `admin:${req.admin.id}`;
  const me = (a) => ({ id: a.id, email: a.email, name: a.name, role: a.role, totpEnabled: !!a.totp_enabled, lastLoginAt: a.last_login_at });

  // ---- auth
  app.post('/api/admin/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, schema: { tags, summary: 'Admin login (password + optional 2FA code)' } }, async (req, reply) => {
    const d = parse(z.object({ email, password: z.string().min(1).max(200), code: z.string().max(10).optional() }), req.body);
    const a = db.get('SELECT * FROM admins WHERE email = ?', d.email);
    if (!a) { await fakeVerify(); fail(401, 'invalid_credentials'); }
    if (a.locked_until && a.locked_until > now()) fail(429, 'rate_limited');
    if (!(await verifyPassword(d.password, a.password_hash))) {
      const n = a.failed_logins + 1;
      db.run('UPDATE admins SET failed_logins = ?, locked_until = ? WHERE id = ?', n >= 6 ? 0 : n, n >= 6 ? addMs(30 * 60e3) : null, a.id);
      audit(db, `admin:${a.id}`, 'admin.login_failed', a.email, null, ipHash(config, req.ip));
      fail(401, 'invalid_credentials');
    }
    if (a.totp_enabled) {
      if (!d.code) fail(401, 'totp_required', { code: 'totp_required' });
      if (!verifyTotp(decrypt(config.SECRET, a.totp_secret), d.code)) fail(401, 'invalid_code', { code: 'invalid_code' });
    }
    db.run('UPDATE admins SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?', now(), a.id);
    startSession(app, reply, 'admin', a.id, req);
    audit(db, `admin:${a.id}`, 'admin.login', a.email, null, ipHash(config, req.ip));
    return { admin: me(a) };
  });
  app.post('/api/admin/logout', { schema: { tags } }, async (req, reply) => { endSession(app, req, 'admin'); clearSessionCookie(app, reply, 'admin'); return { ok: true }; });
  app.get('/api/admin/me', { schema: { tags } }, async (req) => ({ admin: me(requireAdmin(req)) }));

  // ---- dashboard numbers
  app.get('/api/admin/stats', { schema: { tags, summary: 'Dashboard statistics' } }, async (req) => {
    requireAdmin(req);
    const since = (days) => addMs(-days * 864e5);
    const count = (sql, ...p) => db.get(sql, ...p).n;
    const byDay = db.all("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM leads WHERE created_at >= ? AND status != 'spam' GROUP BY day ORDER BY day", since(30));
    const modules = {};
    for (const r of db.all("SELECT modules FROM leads WHERE created_at >= ? AND status != 'spam'", since(90))) for (const m of JSON.parse(r.modules)) modules[m] = (modules[m] || 0) + 1;
    return {
      leads: {
        total: count("SELECT COUNT(*) n FROM leads WHERE status != 'spam'"),
        last7: count("SELECT COUNT(*) n FROM leads WHERE created_at >= ? AND status != 'spam'", since(7)),
        prev7: count("SELECT COUNT(*) n FROM leads WHERE created_at >= ? AND created_at < ? AND status != 'spam'", since(14), since(7)),
        last30: count("SELECT COUNT(*) n FROM leads WHERE created_at >= ? AND status != 'spam'", since(30)),
        newOpen: count("SELECT COUNT(*) n FROM leads WHERE status = 'new'"),
        gradeA: count("SELECT COUNT(*) n FROM leads WHERE grade = 'A' AND status IN ('new', 'contacted', 'qualified')"),
        byDay, byType: db.all("SELECT type, COUNT(*) n FROM leads WHERE status != 'spam' GROUP BY type ORDER BY n DESC"),
        byStatus: db.all('SELECT status, COUNT(*) n FROM leads GROUP BY status'),
        byLang: db.all("SELECT lang, COUNT(*) n FROM leads WHERE status != 'spam' GROUP BY lang"),
        topModules: Object.entries(modules).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([module, n]) => ({ module, n })),
        won: count("SELECT COUNT(*) n FROM leads WHERE status = 'won'"),
      },
      customers: { total: count('SELECT COUNT(*) n FROM customers'), verified: count('SELECT COUNT(*) n FROM customers WHERE email_verified_at IS NOT NULL'), last30: count('SELECT COUNT(*) n FROM customers WHERE created_at >= ?', since(30)) },
      subscribers: { active: count("SELECT COUNT(*) n FROM subscribers WHERE status = 'active'"), pending: count("SELECT COUNT(*) n FROM subscribers WHERE status = 'pending'") },
      assistant: { good: count("SELECT COUNT(*) n FROM assistant_feedback WHERE rating = 'good'"), bad: count("SELECT COUNT(*) n FROM assistant_feedback WHERE rating = 'bad'"),
        messagesToday: db.get("SELECT value FROM counters WHERE name = 'assistant_messages' AND day = ?", now().slice(0, 10))?.value || 0 },
      jobs: { pending: count("SELECT COUNT(*) n FROM jobs WHERE status IN ('pending', 'running')"), failed: count("SELECT COUNT(*) n FROM jobs WHERE status = 'failed'") },
    };
  });

  // ---- leads
  const LeadQuery = z.object({
    q: z.string().max(100).optional(), status: z.enum(STATUSES).optional(), type: z.enum(TYPES).optional(), grade: z.enum(['A', 'B', 'C']).optional(),
    from: z.string().max(10).optional(), to: z.string().max(10).optional(),
    sort: z.enum(['newest', 'oldest', 'score']).default('newest'),
    page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(25),
  });
  function leadWhere(f) {
    const w = [], p = [];
    if (f.q) { w.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR company LIKE ? OR phone LIKE ? OR message LIKE ?)'); const like = `%${f.q.replace(/[%_]/g, '')}%`; p.push(like, like, like, like, like, like); }
    if (f.status) { w.push('status = ?'); p.push(f.status); } else { w.push("status != 'spam'"); }
    if (f.type) { w.push('type = ?'); p.push(f.type); }
    if (f.grade) { w.push('grade = ?'); p.push(f.grade); }
    if (f.from) { w.push('created_at >= ?'); p.push(f.from); }
    if (f.to) { w.push('created_at < ?'); p.push(new Date(Date.parse(f.to) + 864e5).toISOString()); }
    const order = { newest: 'created_at DESC', oldest: 'created_at ASC', score: 'score DESC, created_at DESC' }[f.sort];
    return { where: w.length ? `WHERE ${w.join(' AND ')}` : '', params: p, order };
  }
  const leadOut = (l) => ({ ...l, modules: JSON.parse(l.modules), details: JSON.parse(l.details), utm: l.utm ? JSON.parse(l.utm) : null });

  app.get('/api/admin/leads', { schema: { tags, summary: 'Search and filter leads' } }, async (req) => {
    requireAdmin(req);
    const f = parse(LeadQuery, req.query);
    const { where, params, order } = leadWhere(f);
    const total = db.get(`SELECT COUNT(*) n FROM leads ${where}`, ...params).n;
    const items = db.all(`SELECT id, type, status, score, grade, first_name, last_name, email, phone, company, country, company_size, modules, lang, created_at FROM leads ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      ...params, f.pageSize, (f.page - 1) * f.pageSize).map((l) => ({ ...l, modules: JSON.parse(l.modules) }));
    return { items, total, page: f.page, pageSize: f.pageSize };
  });

  app.get('/api/admin/leads/export.csv', { schema: { tags, summary: 'Export leads as CSV (same filters as the list)' } }, async (req, reply) => {
    requireAdmin(req);
    const f = parse(LeadQuery, req.query);
    const { where, params, order } = leadWhere(f);
    const rows = db.all(`SELECT * FROM leads ${where} ORDER BY ${order} LIMIT 50000`, ...params);
    const cols = ['id', 'created_at', 'type', 'status', 'grade', 'score', 'first_name', 'last_name', 'email', 'phone', 'company', 'country', 'company_size', 'modules', 'message', 'details', 'lang', 'page', 'source'];
    audit(db, who(req), 'leads.export', null, { rows: rows.length, filters: f }, ipHash(config, req.ip));
    reply.header('Content-Disposition', `attachment; filename="quantinox-leads-${now().slice(0, 10)}.csv"`);
    return reply.type('text/csv; charset=utf-8').send(toCsv(cols, rows));
  });

  app.get('/api/admin/leads/:id', { schema: { tags } }, async (req) => {
    requireAdmin(req);
    const l = db.get('SELECT * FROM leads WHERE id = ?', Number(req.params.id));
    if (!l) fail(404, 'not_found');
    const events = db.all('SELECT e.*, a.name AS admin_name FROM lead_events e LEFT JOIN admins a ON a.id = e.admin_id WHERE lead_id = ? ORDER BY e.id DESC', l.id);
    const others = db.all('SELECT id, type, status, created_at FROM leads WHERE email = ? AND id != ? ORDER BY id DESC LIMIT 20', l.email, l.id);
    const customer = db.get('SELECT id, created_at, email_verified_at FROM customers WHERE email = ?', l.email) || null;
    return { lead: leadOut(l), events, others, customer };
  });

  app.patch('/api/admin/leads/:id', { schema: { tags, summary: 'Change status, add a note, assign' } }, async (req) => {
    requireAdmin(req, 'editor');
    const d = parse(z.object({ status: z.enum(STATUSES).optional(), note: str(4000, 1).optional(), assigned_to: z.number().int().nullable().optional() }), req.body);
    const l = db.get('SELECT * FROM leads WHERE id = ?', Number(req.params.id));
    if (!l) fail(404, 'not_found');
    const t = now();
    db.tx(() => {
      if (d.status && d.status !== l.status) {
        db.run('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?', d.status, t, l.id);
        db.run('INSERT INTO lead_events (lead_id, kind, body, admin_id, created_at) VALUES (?, ?, ?, ?, ?)', l.id, 'status', `${l.status} → ${d.status}`, req.admin.id, t);
      }
      if (d.note) db.run('INSERT INTO lead_events (lead_id, kind, body, admin_id, created_at) VALUES (?, ?, ?, ?, ?)', l.id, 'note', d.note, req.admin.id, t);
      if (d.assigned_to !== undefined) {
        db.run('UPDATE leads SET assigned_to = ?, updated_at = ? WHERE id = ?', d.assigned_to, t, l.id);
        db.run('INSERT INTO lead_events (lead_id, kind, body, admin_id, created_at) VALUES (?, ?, ?, ?, ?)', l.id, 'assigned', d.assigned_to ? `Assigned to #${d.assigned_to}` : 'Unassigned', req.admin.id, t);
      }
    });
    audit(db, who(req), 'lead.update', `lead:${l.id}`, { status: d.status, note: !!d.note }, ipHash(config, req.ip));
    return { lead: leadOut(db.get('SELECT * FROM leads WHERE id = ?', l.id)) };
  });

  app.delete('/api/admin/leads/:id', { schema: { tags, summary: 'Delete a lead (owner only)' } }, async (req) => {
    requireAdmin(req, 'owner');
    const r = db.run('DELETE FROM leads WHERE id = ?', Number(req.params.id));
    if (!r.changes) fail(404, 'not_found');
    audit(db, who(req), 'lead.delete', `lead:${req.params.id}`, null, ipHash(config, req.ip));
    return { ok: true };
  });

  // ---- other lists
  const Paging = z.object({ q: z.string().max(100).optional(), status: z.string().max(20).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(25) });
  function list(table, cols, searchCols, req, extraWhere = '') {
    const f = parse(Paging, req.query);
    const w = extraWhere ? [extraWhere] : [], p = [];
    if (f.q) { w.push('(' + searchCols.map((c) => `${c} LIKE ?`).join(' OR ') + ')'); searchCols.forEach(() => p.push(`%${f.q.replace(/[%_]/g, '')}%`)); }
    if (f.status && table !== 'customers') { w.push('status = ?'); p.push(f.status); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return { items: db.all(`SELECT ${cols} FROM ${table} ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, ...p, f.pageSize, (f.page - 1) * f.pageSize), total: db.get(`SELECT COUNT(*) n FROM ${table} ${where}`, ...p).n, page: f.page, pageSize: f.pageSize };
  }
  app.get('/api/admin/customers', { schema: { tags } }, async (req) => { requireAdmin(req); return list('customers', 'id, email, first_name, last_name, company, phone, country, company_size, lang, email_verified_at, last_login_at, created_at', ['email', 'first_name', 'last_name', 'company'], req); });
  app.get('/api/admin/subscribers', { schema: { tags } }, async (req) => { requireAdmin(req); return list('subscribers', 'id, email, status, lang, source, consent_at, confirmed_at, unsubscribed_at, created_at', ['email'], req); });
  app.get('/api/admin/subscribers/export.csv', { schema: { tags } }, async (req, reply) => {
    requireAdmin(req);
    const rows = db.all("SELECT email, lang, confirmed_at, source FROM subscribers WHERE status = 'active' ORDER BY id");
    audit(db, who(req), 'subscribers.export', null, { rows: rows.length }, ipHash(config, req.ip));
    reply.header('Content-Disposition', `attachment; filename="quantinox-subscribers-${now().slice(0, 10)}.csv"`);
    return reply.type('text/csv; charset=utf-8').send(toCsv(['email', 'lang', 'confirmed_at', 'source'], rows));
  });
  app.get('/api/admin/feedback', { schema: { tags } }, async (req) => { requireAdmin(req); return list('assistant_feedback', 'id, rating, question, answer, page, lang, created_at', ['question', 'answer'], req); });
  app.get('/api/admin/audit', { schema: { tags } }, async (req) => { requireAdmin(req, 'owner'); return list('audit_log', 'id, actor, action, target, details, created_at', ['actor', 'action', 'target'], req); });
  app.get('/api/admin/jobs', { schema: { tags } }, async (req) => { requireAdmin(req); return list('jobs', 'id, type, status, attempts, run_at, last_error, created_at, updated_at, payload', ['type', 'last_error'], req); });
  app.post('/api/admin/jobs/:id/retry', { schema: { tags } }, async (req) => {
    requireAdmin(req, 'editor');
    const r = db.run("UPDATE jobs SET status = 'pending', run_at = ?, updated_at = ? WHERE id = ? AND status = 'failed'", now(), now(), Number(req.params.id));
    if (!r.changes) fail(404, 'not_found');
    return { ok: true };
  });

  // ---- admins and security
  app.get('/api/admin/admins', { schema: { tags } }, async (req) => { requireAdmin(req, 'owner'); return { items: db.all('SELECT id, email, name, role, totp_enabled, last_login_at, created_at FROM admins ORDER BY id') }; });
  app.post('/api/admin/admins', { schema: { tags, summary: 'Invite another admin (owner only)' } }, async (req) => {
    requireAdmin(req, 'owner');
    const d = parse(z.object({ email, name: str(80, 1), role: z.enum(['owner', 'editor', 'viewer']), password: z.string().min(12, 'Use at least 12 characters').max(200) }), req.body);
    if (db.get('SELECT id FROM admins WHERE email = ?', d.email)) fail(409, 'exists', { fields: [{ field: 'email', message: 'An admin with this email already exists' }] });
    const t = now();
    const id = Number(db.run('INSERT INTO admins (email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', d.email, d.name, d.role, await hashPassword(d.password), t, t).lastInsertRowid);
    audit(db, who(req), 'admin.create', d.email, { role: d.role }, ipHash(config, req.ip));
    return { id };
  });
  app.delete('/api/admin/admins/:id', { schema: { tags } }, async (req) => {
    requireAdmin(req, 'owner');
    const id = Number(req.params.id);
    if (id === req.admin.id) fail(400, 'cannot_delete_self');
    const r = db.run('DELETE FROM admins WHERE id = ?', id);
    if (!r.changes) fail(404, 'not_found');
    db.run("DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?", id);
    audit(db, who(req), 'admin.delete', `admin:${id}`, null, ipHash(config, req.ip));
    return { ok: true };
  });
  app.post('/api/admin/password', { schema: { tags, summary: 'Change my password' } }, async (req) => {
    const a = requireAdmin(req);
    const d = parse(z.object({ current: z.string().min(1).max(200), next: z.string().min(12, 'Use at least 12 characters').max(200) }), req.body);
    if (!(await verifyPassword(d.current, a.password_hash))) fail(401, 'invalid_credentials', { fields: [{ field: 'current', message: 'Incorrect password' }] });
    db.run('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?', await hashPassword(d.next), now(), a.id);
    audit(db, who(req), 'admin.password_change', a.email, null, ipHash(config, req.ip));
    return { ok: true };
  });
  app.post('/api/admin/totp/setup', { schema: { tags, summary: 'Start two-factor setup: returns a secret for your authenticator app' } }, async (req) => {
    const a = requireAdmin(req);
    const secret = newTotpSecret();
    db.run('UPDATE admins SET totp_secret = ?, totp_enabled = 0, updated_at = ? WHERE id = ?', encrypt(config.SECRET, secret), now(), a.id);
    const label = encodeURIComponent(`Quantinox Admin:${a.email}`);
    return { secret, otpauth: `otpauth://totp/${label}?secret=${secret}&issuer=Quantinox&algorithm=SHA1&digits=6&period=30` };
  });
  app.post('/api/admin/totp/enable', { schema: { tags } }, async (req) => {
    const a = requireAdmin(req);
    const d = parse(z.object({ code: z.string().max(10) }), req.body);
    if (!a.totp_secret || !verifyTotp(decrypt(config.SECRET, a.totp_secret), d.code)) fail(400, 'invalid_code', { fields: [{ field: 'code', message: 'That code is not right. Check the time on your phone and try again.' }] });
    db.run('UPDATE admins SET totp_enabled = 1, updated_at = ? WHERE id = ?', now(), a.id);
    audit(db, who(req), 'admin.2fa_enabled', a.email, null, ipHash(config, req.ip));
    return { ok: true };
  });
  app.post('/api/admin/totp/disable', { schema: { tags } }, async (req) => {
    const a = requireAdmin(req);
    const d = parse(z.object({ password: z.string().min(1).max(200) }), req.body);
    if (!(await verifyPassword(d.password, a.password_hash))) fail(401, 'invalid_credentials', { fields: [{ field: 'password', message: 'Incorrect password' }] });
    db.run('UPDATE admins SET totp_enabled = 0, totp_secret = NULL, updated_at = ? WHERE id = ?', now(), a.id);
    audit(db, who(req), 'admin.2fa_disabled', a.email, null, ipHash(config, req.ip));
    return { ok: true };
  });

  app.get('/api/admin/system', { schema: { tags, summary: 'Configuration and health overview' } }, async (req) => {
    requireAdmin(req);
    let dbSize = null; try { dbSize = fs.statSync(config.DATABASE_FILE).size; } catch { /* in-memory */ }
    return {
      version: app.appVersion, node: process.version, uptimeSeconds: Math.round((Date.now() - started) / 1000), environment: config.NODE_ENV,
      siteUrl: config.SITE_URL, publicUrl: config.PUBLIC_URL, allowedOrigins: config.origins, databaseBytes: dbSize,
      mail: { transport: config.MAIL_TRANSPORT, from: config.MAIL_FROM, salesEmail: config.SALES_EMAIL || null },
      webhook: !!config.LEAD_WEBHOOK_URL, assistant: { enabled: !!config.ANTHROPIC_API_KEY, model: config.ASSISTANT_MODEL, knowledge: knowledge.stats() },
      servesWebsite: !!config.SERVE_SITE_DIR, docs: config.docsEnabled ? `${config.PUBLIC_URL}/docs` : null,
    };
  });
  app.post('/api/admin/knowledge/refresh', { schema: { tags } }, async (req) => { requireAdmin(req, 'editor'); await knowledge.refresh(); return knowledge.stats(); });
  app.post('/api/admin/test-email', { schema: { tags, summary: 'Send a test email to yourself' } }, async (req) => {
    const a = requireAdmin(req, 'editor');
    jobs.email('lead_confirm', a.email, 'en', { type: 'contact', firstName: a.name });
    await jobs.runDue();
    const last = db.get("SELECT status, last_error FROM jobs WHERE type = 'email' ORDER BY id DESC LIMIT 1");
    return { ok: last?.status === 'done', status: last?.status, error: last?.last_error || null };
  });
}

// CSV with protection against spreadsheet formula injection
function toCsv(cols, rows) {
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}
