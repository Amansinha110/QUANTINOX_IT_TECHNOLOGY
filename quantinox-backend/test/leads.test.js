import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, client, lastMail, tokenFrom } from './helpers.js';

let app;
before(async () => { app = await makeApp(); });
after(async () => { await app.close(); });

const demo = { first_name: 'Asha', last_name: 'Rao', email: 'asha@acme.in', phone: '9876543210', company: 'Acme Pvt Ltd', country: 'India', company_size: '251–1,000 employees', modules: ['finance', 'supply-chain', 'nope'], message: 'We run 3 plants and want to move off our old ERP this year.', consent: 'yes', lang: 'en', page: '/demo.html' };

test('demo form is saved, scored and triggers emails', async () => {
  const c = client(app);
  const r = await c.post('/api/leads', demo);
  assert.equal(r.status, 201);
  const lead = app.db.get('SELECT * FROM leads WHERE email = ?', 'asha@acme.in');
  assert.equal(lead.type, 'demo');
  assert.deepEqual(JSON.parse(lead.modules), ['finance', 'supply-chain'], 'unknown modules are dropped');
  assert.equal(lead.grade, 'A');
  assert.ok(lead.ip_hash && lead.ip_hash !== '127.0.0.1', 'IP is stored only as a hash');
  await app.jobs.drain();
  assert.match(lastMail(app, 'asha@acme.in').subject, /demo request/i);
  const sales = lastMail(app, 'sales@quantinox.test');
  assert.match(sales.subject, /Acme Pvt Ltd/);
  assert.equal(sales.replyTo, 'asha@acme.in');
});

test('repeat submission within 10 minutes updates instead of duplicating', async () => {
  const c = client(app);
  await c.post('/api/leads', { ...demo, message: 'Second message' });
  assert.equal(app.db.get('SELECT COUNT(*) n FROM leads WHERE email = ?', 'asha@acme.in').n, 1);
  assert.equal(app.db.get('SELECT message FROM leads WHERE email = ?', 'asha@acme.in').message, 'Second message');
});

test('validation errors use the format the website expects', async () => {
  const r = await client(app).post('/api/leads', { first_name: 'A', email: 'not-an-email', consent: 'no' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'invalid');
  const fields = r.json.fields.map((f) => f.field);
  for (const f of ['email', 'consent', 'last_name', 'company']) assert.ok(fields.includes(f), `missing ${f}`);
});

test('every lead type is accepted', async () => {
  const c = client(app);
  const base = { first_name: 'Ravi', last_name: 'K', company: 'Beta', consent: 'yes', lang: 'hi' };
  const cases = [
    { lead_type: 'callback', first_name: 'Ravi', email: 'ravi1@beta.in', phone: '+91 98765 43210', call_time: 'Morning (9–12)', consent: 'yes' },
    { ...base, lead_type: 'contact', email: 'ravi2@beta.in', topic: 'Support', message: 'Need help' },
    { ...base, lead_type: 'event', email: 'ravi3@beta.in', event: 'webinar-gst' },
    { ...base, lead_type: 'trial', email: 'ravi4@beta.in', modules: ['finance'] },
    { ...base, lead_type: 'download', email: 'ravi5@beta.in', resource: "ERP buyer's checklist" },
    { lead_type: 'assistant_demo', first_name: 'Ravi', email: 'ravi6@beta.in', company: 'Beta', consent: 'yes', message: 'Asked Quanta AI: pricing' },
  ];
  for (const body of cases) { const r = await c.post('/api/leads', body); assert.equal(r.status, 201, `${body.lead_type}: ${JSON.stringify(r.json)}`); }
  assert.equal(app.db.get("SELECT details FROM leads WHERE type = 'event'").details, '{"event":"webinar-gst"}');
  await app.jobs.drain();
  const dl = lastMail(app, 'ravi5@beta.in');
  assert.match(dl.html, /erp-buyers-checklist-hi\.pdf/, 'Hindi visitors get the Hindi PDF');
});

test('honeypot submissions are accepted but not stored', async () => {
  const r = await client(app).post('/api/leads', { ...demo, email: 'bot@spam.example', website: 'http://spam' });
  assert.equal(r.status, 201);
  assert.equal(app.db.get('SELECT COUNT(*) n FROM leads WHERE email = ?', 'bot@spam.example').n, 0);
});

test('requests from other websites are refused', async () => {
  const r = await client(app, 'https://evil.example').post('/api/leads', demo);
  assert.equal(r.status, 403);
});

test('newsletter uses double opt-in and unsubscribe links work', async () => {
  const c = client(app);
  assert.equal((await c.post('/api/leads', { lead_type: 'newsletter', email: 'news@acme.in', consent: 'yes', lang: 'en' })).status, 201);
  assert.equal(app.db.get('SELECT status FROM subscribers WHERE email = ?', 'news@acme.in').status, 'pending');
  await app.jobs.drain();
  const token = tokenFrom(lastMail(app, 'news@acme.in'));
  const page = await c.get(`/api/newsletter/confirm?token=${token}`);
  assert.match(page.body, /subscribed/i);
  assert.equal(app.db.get('SELECT status FROM subscribers WHERE email = ?', 'news@acme.in').status, 'active');
  const unsub = /unsubscribe\?token=([a-f0-9]{64})/.exec(page.body)[1];
  await c.get(`/api/newsletter/unsubscribe?token=${unsub}`);
  assert.equal(app.db.get('SELECT status FROM subscribers WHERE email = ?', 'news@acme.in').status, 'unsubscribed');
  assert.match((await c.get(`/api/newsletter/confirm?token=${token}`)).body, /expired/i, 'links work only once');
});

test('rate limit answers 429 after too many submissions', async () => {
  const fresh = await makeApp();
  const c = client(fresh, undefined, '10.200.0.1');
  let last;
  for (let i = 0; i < 10; i++) last = await c.post('/api/leads', { ...demo, email: `r${i}@acme.in` });
  assert.equal(last.status, 429);
  assert.equal(last.json.error, 'rate_limited');
  await fresh.close();
});

test('failed emails stay queued for a retry with backoff', async () => {
  const fresh = await makeApp();
  let calls = 0;
  fresh.mailer.send = async () => { calls++; throw new Error('SMTP down'); };
  await client(fresh).post('/api/leads', { ...demo, email: 'retry@acme.in' });
  await fresh.jobs.drain();
  const job = fresh.db.get("SELECT * FROM jobs WHERE type = 'email' ORDER BY id LIMIT 1");
  assert.equal(job.status, 'pending');
  assert.equal(job.attempts, 1);
  assert.match(job.last_error, /SMTP down/);
  assert.ok(calls >= 1);
  await fresh.close();
});
