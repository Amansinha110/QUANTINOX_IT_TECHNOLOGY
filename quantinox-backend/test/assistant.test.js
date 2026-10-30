import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { makeApp, client } from './helpers.js';

// A stand-in for the Claude API that streams the same event format
let mock, mockUrl, lastBody;
before(async () => {
  mock = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      lastBody = { headers: req.headers, body: JSON.parse(b) };
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const ev = (o) => res.write(`event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`);
      ev({ type: 'message_start', message: { id: 'm', content: [] } });
      ev({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
      ev({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'GST is handled ' } });
      ev({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'in Finance.' } });
      ev({ type: 'content_block_stop', index: 0 });
      ev({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 't1', name: 'suggest_link', input: {} } });
      ev({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"url":"finance.html#finance-panel-4","label":"Tax"}' } });
      ev({ type: 'content_block_stop', index: 1 });
      ev({ type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 't2', name: 'suggest_link', input: {} } });
      ev({ type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"url":"https://evil.example","label":"x"}' } });
      ev({ type: 'content_block_stop', index: 2 });
      ev({ type: 'content_block_start', index: 3, content_block: { type: 'tool_use', id: 't3', name: 'show_card', input: {} } });
      ev({ type: 'content_block_delta', index: 3, delta: { type: 'input_json_delta', partial_json: '{"card":"demo"}' } });
      ev({ type: 'content_block_stop', index: 3 });
      ev({ type: 'message_stop' });
      res.end();
    });
  });
  await new Promise((r) => mock.listen(0, r));
  mockUrl = `http://127.0.0.1:${mock.address().port}`;
});
after(() => mock.close());

test('status says AI is off without a key, and chat refuses', async () => {
  const app = await makeApp();
  assert.deepEqual((await client(app).get('/api/assistant/status')).json, { enabled: false, model: null });
  assert.equal((await client(app).post('/api/assistant', { messages: [{ role: 'user', content: 'hi' }] })).status, 503);
  await app.close();
});

test('streams answers grounded in website knowledge, filters unsafe links', async () => {
  const app = await makeApp({ ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: mockUrl });
  const c = client(app);
  assert.equal((await c.get('/api/assistant/status')).json.enabled, true);
  const r = await c.post('/api/assistant', { messages: [{ role: 'user', content: 'Does Quantinox handle GST?' }], lang: 'en', page: { file: 'pricing.html', title: 'Pricing' } });
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/event-stream/);
  assert.equal(r.headers['access-control-allow-origin'], 'http://localhost:8080', 'CORS headers survive streaming');
  const events = r.body.split('\n\n').filter(Boolean).map((e) => JSON.parse(e.replace(/^data: /, '')));
  assert.equal(events.filter((e) => e.type === 'text').map((e) => e.text).join(''), 'GST is handled in Finance.');
  const actions = events.filter((e) => e.type === 'action').map((e) => e.action);
  assert.deepEqual(actions, [{ url: 'finance.html#finance-panel-4', label: 'Tax' }, { card: 'demo' }]);
  assert.equal(events.at(-1).type, 'done');
  assert.equal(lastBody.headers['x-api-key'], 'test-key');
  assert.equal(lastBody.headers['anthropic-version'], '2023-06-01');
  assert.equal(lastBody.body.model, 'claude-haiku-5-5');
  assert.match(lastBody.body.system, /\[finance\.html#finance-panel-4\]/, 'relevant website passage is in the prompt');
  await app.close();
});

test('feedback is stored for the dashboard', async () => {
  const app = await makeApp();
  assert.equal((await client(app).post('/api/assistant/feedback', { rating: 'bad', question: 'q', answer: 'a', page: 'index.html', lang: 'en' })).status, 200);
  assert.equal(app.db.get('SELECT rating FROM assistant_feedback').rating, 'bad');
  await app.close();
});
