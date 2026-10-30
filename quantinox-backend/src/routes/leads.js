// POST /api/leads — every form on the website posts here.
// lead_type: demo (default) | callback | contact | event | trial | download | assistant_demo | newsletter
import { z } from 'zod';
import { parse, str, optional, email, consent, lang, ipHash, audit, issueToken, useToken } from '../lib/http.js';
import { scoreLead } from '../lib/scoring.js';
import { now } from '../db/index.js';

const MODULES = ['finance', 'supply-chain', 'manufacturing', 'procurement', 'sales', 'services', 'assets', 'hr', 'ai'];
const modules = z.preprocess((v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',') : []),
  z.array(z.string()).max(12).transform((a) => [...new Set(a.filter((m) => MODULES.includes(m)))]));

const base = {
  email, consent, lang,
  phone: optional(40),
  page: optional(200), source: optional(60),
  website: optional(200), // honeypot: real people never fill this in
  utm_source: optional(80), utm_medium: optional(80), utm_campaign: optional(120),
};
const person = { first_name: str(80, 1), last_name: str(80, 1), company: str(160, 1) };

const SCHEMAS = {
  demo: z.object({ ...base, ...person, country: optional(80), company_size: optional(40), modules, message: optional(4000) }),
  assistant_demo: z.object({ ...base, first_name: str(120, 1), company: str(160, 1), message: optional(4000) }),
  callback: z.object({ ...base, first_name: str(120, 1), phone: str(40, 6), call_time: optional(60) }),
  contact: z.object({ ...base, ...person, topic: optional(60), message: str(4000, 2) }),
  event: z.object({ ...base, ...person, event: str(80, 1) }),
  trial: z.object({ ...base, ...person, modules }),
  download: z.object({ ...base, ...person, resource: optional(120) }),
  newsletter: z.object({ ...base }),
};

export default async function leadRoutes(app) {
  const { db, config, jobs } = app;

  app.post('/api/leads', {
    config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
    schema: { tags: ['Website forms'], summary: 'Submit any website form (demo, call back, contact, event, trial, download, newsletter)' },
  }, async (req, reply) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const type = Object.hasOwn(SCHEMAS, body.lead_type) ? body.lead_type : 'demo';
    const d = parse(SCHEMAS[type], body);
    if (d.website) { req.log.info({ type }, 'honeypot filled: ignored'); return reply.code(201).send({ ok: true }); }

    if (type === 'newsletter') return subscribe(d, req, reply);

    const details = {};
    for (const k of ['call_time', 'topic', 'event', 'resource']) if (d[k]) details[k] = d[k];
    const lead = {
      type, first_name: d.first_name || null, last_name: d.last_name || null, email: d.email, phone: d.phone || null,
      company: d.company || null, country: d.country || null, company_size: d.company_size || null,
      modules: d.modules || [], message: d.message || null,
    };
    const { score, grade, reasons } = scoreLead(lead);
    const utm = d.utm_source || d.utm_medium || d.utm_campaign ? JSON.stringify({ source: d.utm_source, medium: d.utm_medium, campaign: d.utm_campaign }) : null;
    const t = now();

    // Same person, same form, within 10 minutes: update instead of creating a duplicate.
    const recent = db.get('SELECT id FROM leads WHERE email = ? AND type = ? AND created_at > ? ORDER BY id DESC LIMIT 1',
      d.email, type, new Date(Date.now() - 10 * 60e3).toISOString());
    if (recent) {
      db.run('UPDATE leads SET message = COALESCE(?, message), phone = COALESCE(?, phone), modules = ?, details = ?, updated_at = ? WHERE id = ?',
        lead.message, lead.phone, JSON.stringify(lead.modules), JSON.stringify(details), t, recent.id);
      db.run('INSERT INTO lead_events (lead_id, kind, body, created_at) VALUES (?, ?, ?, ?)', recent.id, 'repeat', 'Submitted the form again', t);
      return reply.code(201).send({ ok: true });
    }

    const id = db.tx(() => {
      const r = db.run(`INSERT INTO leads (type, status, score, grade, first_name, last_name, email, phone, company, country, company_size, modules, message, details,
        lang, page, source, utm, ip_hash, user_agent, consent_at, created_at, updated_at) VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        type, score, grade, lead.first_name, lead.last_name, lead.email, lead.phone, lead.company, lead.country, lead.company_size,
        JSON.stringify(lead.modules), lead.message, JSON.stringify(details), d.lang, d.page || null, d.source || null, utm,
        ipHash(config, req.ip), String(req.headers['user-agent'] || '').slice(0, 200), t, t, t);
      const leadId = Number(r.lastInsertRowid);
      db.run('INSERT INTO lead_events (lead_id, kind, body, created_at) VALUES (?, ?, ?, ?)', leadId, 'created', `Score ${score} (${reasons.join(', ')})`, t);
      return leadId;
    });
    const saved = db.get('SELECT * FROM leads WHERE id = ?', id);

    // Follow-up work runs in the background with retries
    jobs.email('lead_confirm', d.email, d.lang, { type, firstName: d.first_name, event: details.event, callTime: details.call_time });
    if (config.SALES_EMAIL) jobs.email('sales_lead', config.SALES_EMAIL, 'en', { lead: saved });
    if (config.LEAD_WEBHOOK_URL) jobs.enqueue('webhook', { url: config.LEAD_WEBHOOK_URL, body: webhookBody(config, saved) });
    req.log.info({ lead: id, type, grade }, 'new lead');
    return reply.code(201).send({ ok: true });
  });

  async function subscribe(d, req, reply) {
    const t = now();
    const existing = db.get('SELECT * FROM subscribers WHERE email = ?', d.email);
    if (existing?.status === 'active') return reply.code(201).send({ ok: true });
    let id = existing?.id;
    if (existing) db.run("UPDATE subscribers SET status = 'pending', lang = ?, consent_at = ?, updated_at = ? WHERE id = ?", d.lang, t, t, id);
    else id = Number(db.run("INSERT INTO subscribers (email, status, lang, source, consent_at, created_at, updated_at) VALUES (?, 'pending', ?, ?, ?, ?, ?)", d.email, d.lang, d.page || null, t, t, t).lastInsertRowid);
    const token = issueToken(db, 'newsletter_confirm', id, 7 * 864e5);
    jobs.email('newsletter_confirm', d.email, d.lang, { token });
    return reply.code(201).send({ ok: true });
  }

  // Double opt-in confirmation link from the email
  app.get('/api/newsletter/confirm', { schema: { tags: ['Newsletter'], summary: 'Confirm a newsletter subscription (link in email)' } }, async (req, reply) => {
    const row = useToken(db, 'newsletter_confirm', req.query?.token);
    let ok = false, sub = null;
    if (row) {
      sub = db.get('SELECT * FROM subscribers WHERE id = ?', row.subject_id);
      if (sub) { db.run("UPDATE subscribers SET status = 'active', confirmed_at = ?, updated_at = ? WHERE id = ?", now(), now(), sub.id); ok = true; }
    }
    const unsubToken = ok ? issueToken(db, 'newsletter_unsub', sub.id, 3650 * 864e5) : null;
    return reply.type('text/html; charset=utf-8').send(page(config, sub?.lang || 'en', ok ? 'confirmed' : 'invalid', unsubToken));
  });

  app.get('/api/newsletter/unsubscribe', { schema: { tags: ['Newsletter'], summary: 'Unsubscribe (link in email)' } }, async (req, reply) => {
    const row = useToken(db, 'newsletter_unsub', req.query?.token);
    const sub = row && db.get('SELECT * FROM subscribers WHERE id = ?', row.subject_id);
    if (sub) { db.run("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ? WHERE id = ?", now(), now(), sub.id); audit(db, 'subscriber', 'newsletter.unsubscribe', sub.email); }
    return reply.type('text/html; charset=utf-8').send(page(config, sub?.lang || 'en', sub ? 'unsubscribed' : 'invalid'));
  });
}

function webhookBody(config, l) {
  const name = `${l.first_name || ''} ${l.last_name || ''}`.trim();
  const url = `${config.PUBLIC_URL}/admin/#/leads/${l.id}`;
  if (config.LEAD_WEBHOOK_FORMAT === 'slack') {
    return { text: `New ${l.type} lead (grade ${l.grade}, score ${l.score}): *${name || l.email}*${l.company ? ` at ${l.company}` : ''} · ${l.email}${l.phone ? ` · ${l.phone}` : ''}\n<${url}|Open in admin>` };
  }
  return { event: 'lead.created', lead: { ...l, modules: JSON.parse(l.modules), details: JSON.parse(l.details), ip_hash: undefined, user_agent: undefined }, admin_url: url };
}

// Tiny bilingual confirmation page for newsletter links
function page(config, lang, state, unsubToken) {
  const T = {
    en: { confirmed: ['You’re subscribed', 'Thanks! You will receive Quantinox product news and event invitations.'], unsubscribed: ['You’re unsubscribed', 'You will not receive any more newsletter emails from us.'], invalid: ['This link has expired', 'The link was already used or is too old. You can subscribe again from the footer of our website.'], back: 'Back to the website', unsub: 'Unsubscribe' },
    hi: { confirmed: ['आपने सब्सक्राइब कर लिया है', 'धन्यवाद! आपको Quantinox के प्रोडक्ट समाचार और इवेंट निमंत्रण मिलेंगे।'], unsubscribed: ['आपने अनसब्सक्राइब कर लिया है', 'अब आपको हमारी ओर से न्यूज़लेटर ईमेल नहीं मिलेंगे।'], invalid: ['यह लिंक समाप्त हो चुका है', 'लिंक पहले ही इस्तेमाल हो चुका है या बहुत पुराना है। आप वेबसाइट के फ़ुटर से फिर से सब्सक्राइब कर सकते हैं।'], back: 'वेबसाइट पर वापस जाएँ', unsub: 'अनसब्सक्राइब करें' },
  }[lang === 'hi' ? 'hi' : 'en'];
  const [h, p] = T[state];
  const site = config.SITE_URL + (lang === 'hi' ? '/hi/index.html' : '/index.html');
  const unsub = unsubToken ? `<p style="margin-top:24px;font-size:13px"><a href="${config.PUBLIC_URL}/api/newsletter/unsubscribe?token=${unsubToken}">${T.unsub}</a></p>` : '';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${h} · Quantinox</title>
<style>body{margin:0;font-family:Inter,'Noto Sans Devanagari',Arial,sans-serif;background:#F5F7FB;color:#0B1020;display:grid;place-items:center;min-height:100vh;padding:16px}main{max-width:480px;background:#fff;border:1px solid #E3E7EF;border-radius:16px;padding:32px}h1{font-size:24px;margin:0 0 12px}p{color:#3A4256;line-height:1.6}a.b{display:inline-block;margin-top:12px;background:#2F54EB;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600}</style></head>
<body><main><h1>${h}</h1><p>${p}</p><a class="b" href="${site}">${T.back}</a>${unsub}</main></body></html>`;
}
