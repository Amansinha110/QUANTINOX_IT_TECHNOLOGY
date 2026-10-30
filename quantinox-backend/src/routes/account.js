// Customer accounts: sign up, confirm email, log in/out, forgot/reset password, my account,
// plus data export and account deletion (India's DPDP Act: access and erasure rights).
import { z } from 'zod';
import { parse, str, optional, email, consent, lang, fail, audit, ipHash, startSession, readSession, endSession, clearSessionCookie, issueToken, useToken } from '../lib/http.js';
import { hashPassword, verifyPassword, fakeVerify, isBreachedPassword } from '../lib/security.js';
import { now, addMs } from '../db/index.js';

const password = z.string().min(10, 'Password must be at least 10 characters').max(200);
const SignupSchema = z.object({
  first_name: str(80, 1), last_name: str(80, 1), email, company: str(160, 1), phone: optional(40),
  country: optional(80), company_size: optional(40), password, consent, lang, website: optional(200),
});
const LoginSchema = z.object({ email, password: z.string().min(1).max(200) });
const EmailSchema = z.object({ email, lang });
const TokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid link') });
const ResetSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid link'), password });
const DeleteSchema = z.object({ password: z.string().min(1).max(200) });

const LOCK_AFTER = 8, LOCK_MS = 15 * 60e3;

export default async function accountRoutes(app) {
  const { db, config, jobs } = app;
  const tags = ['Accounts'];

  async function checkBreached(pw) {
    if (!config.HIBP_CHECK || config.isTest) return;
    if (await isBreachedPassword(pw)) fail(400, 'invalid', { fields: [{ field: 'password', code: 'breached', message: 'This password has appeared in a data breach. Please choose a different one.' }] });
  }
  function sendVerification(c) {
    db.run("UPDATE tokens SET used_at = ? WHERE purpose = 'verify' AND subject_id = ? AND used_at IS NULL", now(), c.id);
    const token = issueToken(db, 'verify', c.id, 24 * 3600e3);
    jobs.email('verify', c.email, c.lang, { token, firstName: c.first_name });
  }

  app.post('/api/account/signup', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } }, schema: { tags, summary: 'Create an account (sends a confirmation email)' } }, async (req, reply) => {
    const d = parse(SignupSchema, req.body);
    if (d.website) return reply.code(201).send({ ok: true });
    const existing = db.get('SELECT * FROM customers WHERE email = ?', d.email);
    if (existing) {
      // Same answer either way, so nobody can find out which emails have accounts.
      if (existing.email_verified_at) jobs.email('signup_exists', existing.email, d.lang, {});
      else sendVerification(existing);
      await fakeVerify();
      return reply.code(201).send({ ok: true });
    }
    await checkBreached(d.password);
    const hash = await hashPassword(d.password);
    const t = now();
    const id = Number(db.run(`INSERT INTO customers (email, password_hash, first_name, last_name, company, phone, country, company_size, lang, consent_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, d.email, hash, d.first_name, d.last_name, d.company, d.phone || null, d.country || null, d.company_size || null, d.lang, t, t, t).lastInsertRowid);
    const c = db.get('SELECT * FROM customers WHERE id = ?', id);
    sendVerification(c);
    audit(db, `customer:${id}`, 'account.signup', d.email, null, ipHash(config, req.ip));
    return reply.code(201).send({ ok: true });
  });

  app.post('/api/account/resend-verification', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } }, schema: { tags, summary: 'Send a new confirmation link' } }, async (req, reply) => {
    const d = parse(EmailSchema, req.body);
    const c = db.get('SELECT * FROM customers WHERE email = ?', d.email);
    if (c && !c.email_verified_at) sendVerification(c);
    return reply.send({ ok: true });
  });

  app.post('/api/account/verify', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } }, schema: { tags, summary: 'Confirm email from the link (signs the customer in)' } }, async (req, reply) => {
    const d = parse(TokenSchema, req.body);
    const row = useToken(db, 'verify', d.token);
    if (!row) fail(400, 'invalid_link', { code: 'invalid_link' });
    const c = db.get('SELECT * FROM customers WHERE id = ?', row.subject_id);
    if (!c) fail(400, 'invalid_link', { code: 'invalid_link' });
    db.run('UPDATE customers SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?', now(), now(), c.id);
    startSession(app, reply, 'customer', c.id, req);
    audit(db, `customer:${c.id}`, 'account.verified', c.email, null, ipHash(config, req.ip));
    return reply.send({ ok: true });
  });

  app.post('/api/account/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, schema: { tags, summary: 'Log in (sets an HttpOnly session cookie)' } }, async (req, reply) => {
    const d = parse(LoginSchema, req.body);
    const c = db.get('SELECT * FROM customers WHERE email = ?', d.email);
    if (!c) { await fakeVerify(); fail(401, 'invalid_credentials'); }
    if (c.locked_until && c.locked_until > now()) { await fakeVerify(); fail(429, 'rate_limited'); }
    const ok = await verifyPassword(d.password, c.password_hash);
    if (!ok) {
      const n = c.failed_logins + 1;
      db.run('UPDATE customers SET failed_logins = ?, locked_until = ?, updated_at = ? WHERE id = ?', n >= LOCK_AFTER ? 0 : n, n >= LOCK_AFTER ? addMs(LOCK_MS) : null, now(), c.id);
      if (n >= LOCK_AFTER) audit(db, `customer:${c.id}`, 'account.locked', c.email, { minutes: 15 }, ipHash(config, req.ip));
      fail(401, 'invalid_credentials');
    }
    if (!c.email_verified_at) fail(403, 'unverified', { code: 'unverified' });
    db.run('UPDATE customers SET failed_logins = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?', now(), now(), c.id);
    startSession(app, reply, 'customer', c.id, req);
    audit(db, `customer:${c.id}`, 'account.login', c.email, null, ipHash(config, req.ip));
    return reply.send({ ok: true });
  });

  app.post('/api/account/logout', { schema: { tags, summary: 'Log out of this device' } }, async (req, reply) => {
    endSession(app, req, 'customer');
    clearSessionCookie(app, reply, 'customer');
    return reply.send({ ok: true });
  });

  app.post('/api/account/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } }, schema: { tags, summary: 'Email a password reset link (valid 1 hour)' } }, async (req, reply) => {
    const d = parse(EmailSchema, req.body);
    const c = db.get('SELECT * FROM customers WHERE email = ?', d.email);
    if (c) {
      db.run("UPDATE tokens SET used_at = ? WHERE purpose = 'reset' AND subject_id = ? AND used_at IS NULL", now(), c.id);
      const token = issueToken(db, 'reset', c.id, 3600e3);
      jobs.email('reset', c.email, d.lang || c.lang, { token, firstName: c.first_name });
    }
    return reply.send({ ok: true });
  });

  app.post('/api/account/reset-password', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }, schema: { tags, summary: 'Set a new password from the reset link (signs out every other device)' } }, async (req, reply) => {
    const d = parse(ResetSchema, req.body);
    await checkBreached(d.password);
    const row = useToken(db, 'reset', d.token);
    if (!row) fail(400, 'invalid_link', { code: 'invalid_link' });
    const c = db.get('SELECT * FROM customers WHERE id = ?', row.subject_id);
    if (!c) fail(400, 'invalid_link', { code: 'invalid_link' });
    const hash = await hashPassword(d.password);
    db.tx(() => {
      db.run('UPDATE customers SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?', hash, now(), now(), c.id);
      db.run("DELETE FROM sessions WHERE kind = 'customer' AND subject_id = ?", c.id);
    });
    startSession(app, reply, 'customer', c.id, req);
    jobs.email('password_changed', c.email, c.lang, { firstName: c.first_name });
    audit(db, `customer:${c.id}`, 'account.password_reset', c.email, null, ipHash(config, req.ip));
    return reply.send({ ok: true });
  });

  const requireCustomer = (req) => {
    const s = readSession(app, req, 'customer');
    if (!s) fail(401, 'unauthorized');
    const c = db.get('SELECT * FROM customers WHERE id = ?', s.subject_id);
    if (!c) fail(401, 'unauthorized');
    return c;
  };
  const publicCustomer = (c) => ({
    firstName: c.first_name, lastName: c.last_name, fullName: `${c.first_name} ${c.last_name}`.trim(), email: c.email,
    company: c.company, phone: c.phone, country: c.country, companySize: c.company_size, lang: c.lang,
    createdAt: c.created_at, emailVerified: !!c.email_verified_at,
  });

  app.get('/api/account/me', { schema: { tags, summary: 'The signed-in customer' } }, async (req) => ({ customer: publicCustomer(requireCustomer(req)) }));

  app.get('/api/account/export', { schema: { tags, summary: 'Download all personal data we hold (JSON)' } }, async (req, reply) => {
    const c = requireCustomer(req);
    const data = {
      exported_at: now(),
      account: publicCustomer(c),
      sessions: db.all("SELECT created_at, last_seen_at, expires_at, user_agent FROM sessions WHERE kind = 'customer' AND subject_id = ?", c.id),
      requests: db.all('SELECT type, status, company, phone, country, company_size, modules, message, details, lang, page, created_at FROM leads WHERE email = ?', c.email)
        .map((l) => ({ ...l, modules: JSON.parse(l.modules), details: JSON.parse(l.details) })),
      newsletter: db.get('SELECT status, lang, consent_at, confirmed_at, unsubscribed_at FROM subscribers WHERE email = ?', c.email) || null,
    };
    audit(db, `customer:${c.id}`, 'account.export', c.email, null, ipHash(config, req.ip));
    reply.header('Content-Disposition', 'attachment; filename="quantinox-my-data.json"');
    return reply.type('application/json; charset=utf-8').send(JSON.stringify(data, null, 2));
  });

  app.post('/api/account/delete', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }, schema: { tags, summary: 'Delete the account and linked personal data (needs the password)' } }, async (req, reply) => {
    const c = requireCustomer(req);
    const d = parse(DeleteSchema, req.body);
    if (!(await verifyPassword(d.password, c.password_hash))) fail(401, 'invalid_credentials', { fields: [{ field: 'password', message: 'Incorrect password' }] });
    db.tx(() => {
      db.run("DELETE FROM sessions WHERE kind = 'customer' AND subject_id = ?", c.id);
      db.run("DELETE FROM tokens WHERE subject_id = ? AND purpose IN ('verify', 'reset')", c.id);
      db.run('DELETE FROM leads WHERE email = ?', c.email);
      db.run('DELETE FROM subscribers WHERE email = ?', c.email);
      db.run('DELETE FROM customers WHERE id = ?', c.id);
    });
    jobs.email('account_deleted', c.email, c.lang, { firstName: c.first_name });
    audit(db, `customer:${c.id}`, 'account.deleted', null, null, ipHash(config, req.ip));
    clearSessionCookie(app, reply, 'customer');
    return reply.send({ ok: true });
  });
}
