import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { makeApp, client } from './helpers.js';
import { totp, decrypt } from '../src/lib/security.js';

let app, admin;
const ADMIN_ORIGIN = 'http://localhost:4000';
const H = { 'x-admin': '1' };
before(async () => {
  app = await makeApp();
  const site = client(app);
  for (const [i, size] of ['1–50 employees', '1,000+ employees', '51–250 employees'].entries()) {
    await site.post('/api/leads', { first_name: `P${i}`, last_name: 'Test', email: `p${i}@corp${i}.in`, company: `Corp ${i}`, company_size: size, modules: ['finance'], consent: 'yes', message: 'Formula =HYPERLINK("x")' });
  }
  admin = client(app, ADMIN_ORIGIN);
});
after(async () => { await app.close(); });

test('admin login, dashboard stats and lead list', async () => {
  assert.equal((await admin.get('/api/admin/stats')).status, 401);
  assert.equal((await admin.post('/api/admin/login', { email: 'owner@quantinox.test', password: 'wrong' }, H)).status, 401);
  const login = await admin.post('/api/admin/login', { email: 'owner@quantinox.test', password: 'owner-password-123' }, H);
  assert.equal(login.status, 200);
  assert.match([].concat(login.headers['set-cookie'])[0], /SameSite=Strict/);
  const s = (await admin.get('/api/admin/stats')).json;
  assert.equal(s.leads.total, 3);
  assert.equal(s.leads.newOpen, 3);
  const list = (await admin.get('/api/admin/leads?sort=score&pageSize=2')).json;
  assert.equal(list.total, 3);
  assert.equal(list.items.length, 2);
  assert.ok(list.items[0].score >= list.items[1].score);
  assert.equal((await admin.get('/api/admin/leads?q=Corp%201')).json.total, 1);
});

test('changes need the X-Admin header and the dashboard origin', async () => {
  const id = app.db.get('SELECT id FROM leads LIMIT 1').id;
  assert.equal((await admin.patch(`/api/admin/leads/${id}`, { status: 'contacted' })).status, 403, 'no header');
  const evil = client(app, 'https://evil.example'); Object.assign(evil.jar, admin.jar);
  assert.equal((await evil.patch(`/api/admin/leads/${id}`, { status: 'contacted' }, H)).status, 403, 'wrong origin');
  const site = client(app, 'http://localhost:8080'); Object.assign(site.jar, admin.jar);
  assert.equal((await site.patch(`/api/admin/leads/${id}`, { status: 'contacted' }, H)).status, 403, 'website origin cannot use admin API');
});

test('update status, add a note, see history, export CSV safely', async () => {
  const id = app.db.get('SELECT id FROM leads ORDER BY id LIMIT 1').id;
  const r = await admin.patch(`/api/admin/leads/${id}`, { status: 'qualified', note: 'Called, wants a demo next week' }, H);
  assert.equal(r.status, 200);
  assert.equal(r.json.lead.status, 'qualified');
  const detail = (await admin.get(`/api/admin/leads/${id}`)).json;
  assert.deepEqual(detail.events.map((e) => e.kind).sort(), ['created', 'note', 'status']);
  const csv = await admin.get('/api/admin/leads/export.csv');
  assert.equal(csv.status, 200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.ok(csv.body.includes('Formula =HYPERLINK'), 'message kept');
  assert.ok(!/,=HYPERLINK/.test(csv.body), 'no cell starts with =');
  assert.ok(app.db.get("SELECT COUNT(*) n FROM audit_log WHERE action = 'leads.export'").n === 1, 'export is audited');
});

test('roles: a viewer can read but not change', async () => {
  assert.equal((await admin.post('/api/admin/admins', { email: 'viewer@quantinox.test', name: 'Viewer', role: 'viewer', password: 'viewer-password-123' }, H)).status, 200);
  const v = client(app, ADMIN_ORIGIN);
  await v.post('/api/admin/login', { email: 'viewer@quantinox.test', password: 'viewer-password-123' }, H);
  assert.equal((await v.get('/api/admin/leads')).status, 200);
  const id = app.db.get('SELECT id FROM leads LIMIT 1').id;
  assert.equal((await v.patch(`/api/admin/leads/${id}`, { status: 'won' }, H)).status, 403);
  assert.equal((await v.get('/api/admin/audit')).status, 403);
});

test('two-factor sign-in', async () => {
  const setup = await admin.post('/api/admin/totp/setup', {}, H);
  assert.match(setup.json.otpauth, /^otpauth:\/\/totp\//);
  assert.equal((await admin.post('/api/admin/totp/enable', { code: '000000' }, H)).status, 400);
  assert.equal((await admin.post('/api/admin/totp/enable', { code: totp(setup.json.secret) }, H)).status, 200);
  const stored = app.db.get("SELECT totp_secret FROM admins WHERE email = 'owner@quantinox.test'").totp_secret;
  assert.notEqual(stored, setup.json.secret, 'secret is encrypted at rest');
  assert.equal(decrypt('test-secret-test-secret-test-secret-123', stored), setup.json.secret);
  const c = client(app, ADMIN_ORIGIN);
  const step1 = await c.post('/api/admin/login', { email: 'owner@quantinox.test', password: 'owner-password-123' }, H);
  assert.equal(step1.json.code, 'totp_required');
  assert.equal((await c.post('/api/admin/login', { email: 'owner@quantinox.test', password: 'owner-password-123', code: totp(setup.json.secret) }, H)).status, 200);
});

test('admin UI and API docs are served', async () => {
  const ui = await app.inject({ method: 'GET', url: '/admin/' });
  assert.equal(ui.statusCode, 200);
  assert.match(ui.body, /admin\.js/);
  assert.match(ui.headers['content-security-policy'], /script-src 'self'/);
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/ready' })).statusCode, 200);
});

const SITE_DIR = new URL('../../quantinox-site/', import.meta.url).pathname;
test('single-server mode: the website is served with a CSP that allows its inline theme script', { skip: !existsSync(SITE_DIR + 'index.html') && 'quantinox-site folder not next to the backend' }, async () => {
  const site = await makeApp({ SERVE_SITE_DIR: SITE_DIR });
  const r = await site.inject({ method: 'GET', url: '/' });
  assert.equal(r.statusCode, 200);
  const inline = /<script>([\s\S]*?)<\/script>/.exec(r.body)[1];
  const hash = (await import('node:crypto')).createHash('sha256').update(inline).digest('base64');
  assert.ok(r.headers['content-security-policy'].includes(`'sha256-${hash}'`));
  assert.equal((await site.inject({ method: 'GET', url: '/hi/pricing' })).statusCode, 200, 'clean URLs work');
  const nf = await site.inject({ method: 'GET', url: '/no-such-page' });
  assert.equal(nf.statusCode, 404);
  assert.match(nf.body, /<html/);
  await site.close();
});
