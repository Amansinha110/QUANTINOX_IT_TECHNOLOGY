// Test helpers: a fresh app with an in-memory database and in-memory email for every test file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMailer } from '../src/lib/mailer.js';

export const SITE = 'http://localhost:8080';
export const KB = path.join(os.tmpdir(), 'qx-test-kb.json');
fs.writeFileSync(KB, JSON.stringify({
  v: 1,
  pages: [{ p: 'finance.html', l: 'en', t: 'Finance' }, { p: 'pricing.html', l: 'en', t: 'Pricing' }],
  chunks: [
    { u: 'finance.html#finance-panel-4', p: 'finance.html', l: 'en', pt: 'Quantinox Finance', t: 'Global tax and compliance', x: 'Calculate indirect taxes, GST returns and send e-invoices with country versions built in.' },
    { u: 'pricing.html', p: 'pricing.html', l: 'en', pt: 'Pricing', t: 'Modular pricing', x: 'Start with the modules you need and pay per user per month.' },
  ],
}));

export async function makeApp(env = {}) {
  const config = loadConfig({
    __noDotEnv: true, NODE_ENV: 'test', DATABASE_FILE: ':memory:', MAIL_TRANSPORT: 'memory', SITE_URL: SITE, PUBLIC_URL: 'http://localhost:4000',
    SECRET: 'test-secret-test-secret-test-secret-123', KNOWLEDGE_FILE: KB, KNOWLEDGE_URL: '', SALES_EMAIL: 'sales@quantinox.test',
    ANTHROPIC_API_KEY: '', LEAD_WEBHOOK_URL: '', ADMIN_EMAIL: 'owner@quantinox.test', ADMIN_PASSWORD: 'owner-password-123', HIBP_CHECK: 'false', ...env,
  });
  const mailer = createMailer(config, { info() {} });
  const app = await buildApp({ config, mailer });
  await app.ready();
  return app;
}

// Inject a request the way the website's browser would (Origin header, cookies)
let ipSeq = 0;
export function client(app, origin = SITE, ip = `10.9.${Math.floor(++ipSeq / 250)}.${ipSeq % 250 + 1}`) {
  const jar = {};
  async function req(method, url, body, headers = {}) {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await app.inject({ method, url, payload: body, remoteAddress: ip, headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers } });
    for (const c of [].concat(res.headers['set-cookie'] || [])) {
      const [pair] = c.split(';'); const [k, v] = pair.split('=');
      if (!v || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c)) delete jar[k]; else jar[k] = v;
    }
    let json = null; try { json = res.json(); } catch { /* not json */ }
    return { status: res.statusCode, json, headers: res.headers, body: res.body };
  }
  return { jar, get: (u, h) => req('GET', u, undefined, h), post: (u, b, h) => req('POST', u, b ?? {}, h), patch: (u, b, h) => req('PATCH', u, b, h), del: (u, h) => req('DELETE', u, undefined, h) };
}

export const lastMail = (app, to) => [...app.mailer.sent].reverse().find((m) => m.to === to);
export const tokenFrom = (mail) => (/token=([a-f0-9]{64})/.exec(mail.html) || [])[1];
