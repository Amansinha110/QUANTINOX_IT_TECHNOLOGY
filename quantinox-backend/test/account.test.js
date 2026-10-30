import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, client, lastMail, tokenFrom } from './helpers.js';

let app;
before(async () => { app = await makeApp(); });
after(async () => { await app.close(); });

const signup = { first_name: 'Meera', last_name: 'Shah', email: 'Meera@Shah.co', company: 'Shah Traders', phone: '9999999999', country: 'India', company_size: '1–50 employees', password: 'a-long-password-1', consent: 'yes', lang: 'hi' };

test('full account journey: sign up, confirm, my account, log out, log in', async () => {
  const c = client(app);
  assert.equal((await c.post('/api/account/signup', signup)).status, 201);
  // cannot log in before confirming
  const early = await c.post('/api/account/login', { email: 'meera@shah.co', password: 'a-long-password-1' });
  assert.equal(early.status, 403);
  assert.equal(early.json.code, 'unverified');

  await app.jobs.drain();
  const mail = lastMail(app, 'meera@shah.co');
  assert.match(mail.subject, /ईमेल कन्फ़र्म/, 'email in the visitor’s language');
  assert.match(mail.html, /\/hi\/verify\.html\?token=/);
  const verify = await c.post('/api/account/verify', { token: tokenFrom(mail) });
  assert.equal(verify.status, 200);
  const cookie = [].concat(verify.headers['set-cookie'])[0];
  assert.match(cookie, /qx_session=[a-f0-9]{64}/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);

  const me = await c.get('/api/account/me');
  assert.equal(me.status, 200);
  assert.deepEqual({ fullName: me.json.customer.fullName, email: me.json.customer.email, companySize: me.json.customer.companySize },
    { fullName: 'Meera Shah', email: 'meera@shah.co', companySize: '1–50 employees' });

  assert.equal((await c.post('/api/account/logout')).status, 200);
  assert.equal((await c.get('/api/account/me')).status, 401);
  assert.equal((await c.post('/api/account/login', { email: 'meera@shah.co', password: 'wrong-password-xx' })).status, 401);
  assert.equal((await c.post('/api/account/login', { email: 'MEERA@shah.co', password: 'a-long-password-1' })).status, 200);
  assert.equal((await c.get('/api/account/me')).status, 200);
});

test('signing up again with the same email does not reveal the account', async () => {
  const r = await client(app).post('/api/account/signup', { ...signup, password: 'another-password-2' });
  assert.equal(r.status, 201);
  await app.jobs.drain();
  assert.match(lastMail(app, 'meera@shah.co').subject, /खाता पहले से/);
});

test('short passwords are refused with a password field error', async () => {
  const r = await client(app).post('/api/account/signup', { ...signup, email: 'x@y.co', password: 'short' });
  assert.equal(r.status, 400);
  assert.ok(r.json.fields.some((f) => f.field === 'password'));
});

test('forgot and reset password signs out other devices and signs in this one', async () => {
  const phone = client(app);
  await phone.post('/api/account/login', { email: 'meera@shah.co', password: 'a-long-password-1' });
  assert.equal((await phone.get('/api/account/me')).status, 200);

  const laptop = client(app);
  assert.equal((await laptop.post('/api/account/forgot-password', { email: 'meera@shah.co', lang: 'en' })).status, 200);
  assert.equal((await laptop.post('/api/account/forgot-password', { email: 'nobody@nowhere.co' })).status, 200, 'same answer for unknown emails');
  await app.jobs.drain();
  const token = tokenFrom(lastMail(app, 'meera@shah.co'));
  const reset = await laptop.post('/api/account/reset-password', { token, password: 'brand-new-password-3' });
  assert.equal(reset.status, 200);
  assert.equal((await laptop.get('/api/account/me')).status, 200, 'reset signs in');
  assert.equal((await phone.get('/api/account/me')).status, 401, 'other devices signed out');
  const again = await laptop.post('/api/account/reset-password', { token, password: 'brand-new-password-4' });
  assert.equal(again.json.code, 'invalid_link', 'reset links work once');
  await app.jobs.drain();
  assert.match(lastMail(app, 'meera@shah.co').subject, /पासवर्ड बदल/, 'uses the language the customer signed up in');
});

test('account locks for 15 minutes after repeated wrong passwords', async () => {
  const fresh = await makeApp();
  const c = client(fresh);
  await c.post('/api/account/signup', { ...signup, email: 'lock@me.co' });
  fresh.db.run("UPDATE customers SET email_verified_at = '2026-01-01T00:00:00Z' WHERE email = 'lock@me.co'");
  for (let i = 0; i < 8; i++) await fresh.inject({ method: 'POST', url: '/api/account/login', headers: { origin: 'http://localhost:8080', 'x-forwarded-for': `10.0.0.${i}` }, payload: { email: 'lock@me.co', password: 'nope-nope-nope' } });
  const r = await fresh.inject({ method: 'POST', url: '/api/account/login', headers: { origin: 'http://localhost:8080', 'x-forwarded-for': '10.0.1.1' }, payload: { email: 'lock@me.co', password: 'a-long-password-1' } });
  assert.equal(r.statusCode, 429, 'even the right password waits while locked');
  await fresh.close();
});

test('cookie endpoints need a browser Origin', async () => {
  const r = await app.inject({ method: 'POST', url: '/api/account/login', payload: { email: 'meera@shah.co', password: 'x' } });
  assert.equal(r.statusCode, 403);
});

test('data export and account deletion (DPDP)', async () => {
  const c = client(app);
  await c.post('/api/account/login', { email: 'meera@shah.co', password: 'brand-new-password-3' });
  await c.post('/api/leads', { first_name: 'Meera', last_name: 'Shah', email: 'meera@shah.co', company: 'Shah Traders', consent: 'yes' });
  const exp = await c.get('/api/account/export');
  assert.equal(exp.status, 200);
  assert.match(exp.headers['content-disposition'], /attachment/);
  assert.equal(exp.json.account.email, 'meera@shah.co');
  assert.equal(exp.json.requests.length, 1);
  assert.equal((await c.post('/api/account/delete', { password: 'wrong' })).status, 401);
  assert.equal((await c.post('/api/account/delete', { password: 'brand-new-password-3' })).status, 200);
  assert.equal(app.db.get('SELECT COUNT(*) n FROM customers WHERE email = ?', 'meera@shah.co').n, 0);
  assert.equal(app.db.get('SELECT COUNT(*) n FROM leads WHERE email = ?', 'meera@shah.co').n, 0);
  assert.equal((await c.get('/api/account/me')).status, 401);
});
