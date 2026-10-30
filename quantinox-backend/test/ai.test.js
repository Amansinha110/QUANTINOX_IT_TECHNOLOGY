import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { makeApp, client } from './helpers.js';
import { redact } from '../src/lib/claude.js';
import { createKnowledge, buildSynonyms } from '../src/assistant/knowledge.js';

// A stand-in for the Claude API: answers a forced tool call with a canned result for that tool.
let mock, mockUrl, calls = [];
const ANSWERS = {
  erp_plan: {
    summary: 'A 120-person textile maker struggling with stock and GST.', package: 'business-suite', package_reason: 'Operations heavy.',
    modules: [{ id: 'finance', priority: 'now', why: 'GST returns' }, { id: 'manufacturing', priority: 'now', why: 'Plans' }, { id: 'crm-x', priority: 'now', why: 'not a module' }, { id: 'finance', priority: 'later', why: 'dupe' }],
    agents: [{ name: 'Reconciliation agent', benefit: 'Bank matching' }], phases: [{ title: 'Foundation', weeks: '4-6 weeks', items: ['Ledger'] }, { title: 'Operations', weeks: '6-8 weeks', items: ['MRP'] }],
    quick_wins: ['e-invoices'], risks: ['Data quality: clean masters early'], questions: ['How many plants?'],
  },
  lead_brief: {
    summary: 'Asha runs a textile firm.', intent: 'high', intent_reason: 'Asked for a demo with modules.', fit: ['Business Suite'], next_step: 'Call within 24 hours',
    talking_points: ['GST'], questions_to_ask: ['Users?'], reply_subject: 'Your Quantinox demo', reply_body: 'Hi Asha,\n\nThanks for your interest.\n\n[Your name], Quantinox',
  },
  insights_report: {
    headline: 'Pricing dominates.', themes: [{ title: 'Pricing', share: 140, examples: ['How much?'] }], gaps: [{ topic: 'Tally migration', suggestion: 'Add a section', page: 'javascript:alert(1)' }],
    faq: [{ q: 'Do you migrate from Tally?', hint: 'Steps' }], actions: ['Publish prices'],
  },
};
before(async () => {
  mock = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const body = JSON.parse(b); calls.push({ headers: req.headers, body });
      const name = body.tool_choice?.name;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ content: [{ type: 'tool_use', id: 't', name, input: ANSWERS[name] }] }));
    });
  });
  await new Promise((r) => mock.listen(0, r));
  mockUrl = `http://127.0.0.1:${mock.address().port}`;
});
after(() => mock.close());
const ADMIN = 'http://localhost:4000', H = { 'x-admin': '1' };
async function adminClient(app) {
  const a = client(app, ADMIN);
  assert.equal((await a.post('/api/admin/login', { email: 'owner@quantinox.test', password: 'owner-password-123' }, H)).status, 200);
  return a;
}

test('advisor is off without a key (the website then uses its rule-based plan)', async () => {
  const app = await makeApp();
  assert.equal((await client(app).post('/api/ai/advisor', { description: 'We are a textile manufacturer with 120 staff', lang: 'en' })).status, 503);
  await app.close();
});

test('advisor returns a cleaned, grounded plan and removes contact details', async () => {
  const app = await makeApp({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: mockUrl });
  calls = [];
  const r = await client(app).post('/api/ai/advisor', { description: 'Textile maker, GST is painful, email me at asha@rao.in or 9876543210', industry: 'Manufacturing', size: '51–250 employees', priorities: ['tax'], lang: 'hi' });
  assert.equal(r.status, 200);
  assert.equal(r.json.mode, 'ai');
  assert.deepEqual(r.json.plan.modules.map((m) => m.id), ['finance', 'manufacturing'], 'unknown and duplicate modules removed');
  assert.equal(r.json.plan.package, 'business-suite');
  const sent = calls[0].body;
  assert.equal(sent.tool_choice.name, 'erp_plan');
  assert.match(sent.system, /Hindi/);
  assert.match(sent.system, /\[finance\.html#finance-panel-4\]/, 'website passage about tax is in the context');
  assert.doesNotMatch(sent.messages[0].content, /asha@rao\.in|9876543210/, 'contact details are not sent to the AI');
  assert.equal(app.db.get('SELECT intent FROM assistant_questions').intent, 'advisor');
  assert.equal((await client(app).post('/api/ai/advisor', { description: 'short', lang: 'en' })).status, 400);
  await app.close();
});

test('site-guide questions are logged without contact details', async () => {
  const app = await makeApp();
  const r = await client(app).post('/api/assistant/log', { question: 'Call me on +91 98765 43210 about pricing', page: 'pricing.html', lang: 'en', matched: 0 });
  assert.equal(r.status, 200);
  const row = app.db.get('SELECT * FROM assistant_questions');
  assert.equal(row.mode, 'guide'); assert.equal(row.matched, 0);
  assert.doesNotMatch(row.question, /98765/);
  assert.equal((await client(app, 'https://evil.example').post('/api/assistant/log', { question: 'x', lang: 'en' })).status, 403);
  await app.close();
});

test('AI lead brief: editors only, saved, shown in history', async () => {
  const app = await makeApp({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: mockUrl });
  await client(app).post('/api/leads', { first_name: 'Asha', last_name: 'Rao', email: 'asha@rao.in', company: 'Rao Textiles', modules: ['finance'], consent: 'yes', lang: 'hi', message: 'GST pain' });
  const id = app.db.get('SELECT id FROM leads').id;
  const anon = client(app, ADMIN);
  assert.equal((await anon.post(`/api/admin/leads/${id}/ai-brief`, {}, H)).status, 401);
  const a = await adminClient(app);
  assert.equal((await a.post(`/api/admin/leads/${id}/ai-brief`, {})).status, 403, 'X-Admin header required');
  calls = [];
  const r = await a.post(`/api/admin/leads/${id}/ai-brief`, {}, H);
  assert.equal(r.status, 200);
  assert.equal(r.json.brief.intent, 'high');
  assert.match(calls[0].body.system, /reply_body in Hindi/);
  assert.match(calls[0].body.messages[0].content, /Rao Textiles/);
  assert.equal((await a.get(`/api/admin/leads/${id}/ai-brief`)).json.brief.next_step, 'Call within 24 hours');
  assert.match(app.db.get("SELECT body FROM lead_events WHERE kind = 'ai_brief'").body, /high intent/);
  assert.equal((await a.post('/api/admin/leads/9999/ai-brief', {}, H)).status, 404);
  await app.close();
});

test('AI insights: numbers, gaps and an AI report', async () => {
  const app = await makeApp({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: mockUrl });
  const site = client(app);
  for (const [q, m] of [['How much does it cost?', 3], ['Pricing for 50 users', 2], ['Do you migrate from Tally?', 0], ['Do you migrate from Tally?', 0], ['GST returns?', 4], ['क्या पेरोल है?', 2]]) {
    await site.post('/api/assistant/log', { question: q, page: 'pricing.html', lang: /[ऀ-ॿ]/.test(q) ? 'hi' : 'en', matched: m });
  }
  const a = await adminClient(app);
  const g = (await a.get('/api/admin/ai/insights?days=30')).json;
  assert.equal(g.total, 6); assert.equal(g.unansweredCount, 2);
  assert.equal(g.unanswered[0].question, 'Do you migrate from Tally?'); assert.equal(g.unanswered[0].n, 2);
  assert.ok(g.topTerms.some((t) => t.term === 'migrat'));
  const r = await a.post('/api/admin/ai/insights/summary', { days: 30 }, H);
  assert.equal(r.status, 200);
  assert.equal(r.json.report.themes[0].share, 100, 'share clamped');
  assert.equal(r.json.report.gaps[0].page, '', 'unsafe page link dropped');
  assert.equal((await a.get('/api/admin/ai/insights')).json.report.headline, 'Pricing dominates.');
  await app.close();
});

test('insights report needs enough questions', async () => {
  const app = await makeApp({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: mockUrl });
  const a = await adminClient(app);
  assert.equal((await a.post('/api/admin/ai/insights/summary', {}, H)).json.error, 'not_enough_data');
  await app.close();
});

test('redaction and synonym search', () => {
  assert.equal(redact('mail a@b.co, PAN ABCDE1234F, aadhaar 1234 5678 9012, call +91 98765-43210'), 'mail [email], PAN [PAN], aadhaar [number], call [phone]');
  const log = { info() {}, warn() {}, error() {} };
  const k = createKnowledge({ KNOWLEDGE_FILE: '/nonexistent' }, log);
  assert.deepEqual(buildSynonyms({ GST: ['tax', 'invoices'], _about: 'x' }), { gst: ['tax', 'invoic'] });
  assert.equal(typeof k.search, 'function');
});
