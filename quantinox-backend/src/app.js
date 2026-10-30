// Builds the Fastify application: security, CORS, rate limits, API docs, routes, admin UI,
// and (optionally) the website itself so everything can run on one server.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { loadConfig } from './config.js';
import { openDatabase, now } from './db/index.js';
import { createMailer } from './lib/mailer.js';
import { createJobs } from './lib/jobs.js';
import { HttpError, audit } from './lib/http.js';
import { hashPassword } from './lib/security.js';
import { createKnowledge } from './assistant/knowledge.js';
import { createClaude } from './lib/claude.js';
import leadRoutes from './routes/leads.js';
import accountRoutes from './routes/account.js';
import assistantRoutes from './routes/assistant.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

export async function buildApp(overrides = {}) {
  const config = overrides.config || loadConfig(overrides.env || {});
  const app = Fastify({
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    genReqId: (req) => String(req.headers['x-request-id'] || '').slice(0, 64) || `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    logger: config.isTest ? false : {
      level: config.LOG_LEVEL || (config.isProd ? 'info' : 'debug'),
      redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
      transport: config.isProd || !hasPrettyLogs() ? undefined : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
  });
  app.decorate('config', config);
  app.decorate('appVersion', pkg.version);

  // ---- data, email, background jobs, assistant knowledge
  const db = openDatabase(config.DATABASE_FILE);
  const mailer = overrides.mailer || createMailer(config, app.log);
  const jobs = createJobs({ db, mailer, config, log: app.log });
  const knowledge = createKnowledge(config, app.log);
  app.decorate('db', db); app.decorate('mailer', mailer); app.decorate('jobs', jobs); app.decorate('knowledge', knowledge);
  app.decorate('claude', createClaude(config, app.log));
  await knowledge.refresh();

  // First admin account from ADMIN_EMAIL / ADMIN_PASSWORD
  if (config.ADMIN_EMAIL && config.ADMIN_PASSWORD && !db.get('SELECT id FROM admins LIMIT 1')) {
    const t = now();
    db.run("INSERT INTO admins (email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, 'owner', ?, ?, ?)", config.ADMIN_EMAIL.toLowerCase(), config.ADMIN_NAME, await hashPassword(config.ADMIN_PASSWORD), t, t);
    audit(db, 'system', 'admin.bootstrap', config.ADMIN_EMAIL);
    app.log.info({ email: config.ADMIN_EMAIL }, 'created the first admin account');
  }

  // ---- security headers. When this server also serves the website (SERVE_SITE_DIR), the policy
  // allows the site's small inline theme script (by its hash) and Google Analytics (loaded only after consent).
  const site = config.SERVE_SITE_DIR ? siteCspSources(config.SERVE_SITE_DIR) : { scripts: [], analytics: false };
  const ga = site.analytics ? ['https://www.googletagmanager.com'] : [];
  const gaConnect = site.analytics ? ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'] : [];
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'", ...site.scripts, ...ga], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', ...(site.analytics ? ['https://*.google-analytics.com', 'https://www.googletagmanager.com'] : [])], connectSrc: ["'self'", ...gaConnect],
        frameAncestors: ["'none'"], formAction: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    strictTransportSecurity: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
  await app.register(cookie);

  // ---- CORS for the website (credentials allowed so login cookies work across www. and api.)
  await app.register(cors, {
    delegator: (req, cb) => {
      const origin = req.headers.origin;
      const isAdmin = (req.url || '').startsWith('/api/admin');
      cb(null, { origin: !isAdmin && origin && config.origins.includes(origin) ? origin : false, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Accept'], maxAge: 600 });
    },
  });

  // ---- Cross-site request protection: browsers always send Origin on POST/PATCH/DELETE.
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
    const origin = req.headers.origin;
    const isAdmin = req.url.startsWith('/api/admin');
    const allowed = isAdmin ? [config.PUBLIC_URL] : config.origins.concat(config.SERVE_SITE_DIR ? [config.PUBLIC_URL] : []);
    if (origin && !allowed.includes(origin)) throw new HttpError(403, { error: 'origin_not_allowed' });
    // Cookie-based endpoints must come from a browser on an allowed origin.
    if (!origin && (isAdmin || req.url.startsWith('/api/account'))) throw new HttpError(403, { error: 'origin_required' });
  });

  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ statusCode: 429, error: 'rate_limited' }),
  });

  // ---- API documentation (OpenAPI) at /docs
  if (config.docsEnabled) {
    const swagger = (await import('@fastify/swagger')).default;
    const swaggerUi = (await import('@fastify/swagger-ui')).default;
    await app.register(swagger, { openapi: { info: { title: 'Quantinox backend API', version: pkg.version, description: 'Website forms, accounts, Quanta AI assistant and admin API.' }, servers: [{ url: config.PUBLIC_URL }] } });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }
  // Request bodies are validated with zod inside each route.
  app.setValidatorCompiler(() => () => true);

  // ---- errors in the format the website understands
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send(err.body);
    if (err.statusCode === 429) return reply.code(429).send({ error: 'rate_limited' });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ? 'unsupported_media_type' : 'bad_request' });
    req.log.error(err);
    return reply.code(500).send({ error: 'server_error' });
  });

  // ---- health checks (for Docker, uptime monitors and load balancers)
  app.get('/health', { schema: { tags: ['System'], summary: 'Liveness' } }, async () => ({ ok: true, version: pkg.version }));
  app.get('/ready', { schema: { tags: ['System'], summary: 'Readiness (database reachable)' } }, async (req, reply) => {
    try { db.get('SELECT 1 AS ok'); return { ok: true }; } catch { return reply.code(503).send({ ok: false }); }
  });

  await app.register(leadRoutes);
  await app.register(accountRoutes);
  await app.register(assistantRoutes);
  await app.register(adminRoutes);
  await app.register(aiRoutes);

  // ---- admin dashboard UI
  await app.register(fastifyStatic, { root: path.join(here, '..', 'admin'), prefix: '/admin/', decorateReply: false, index: ['index.html'] });
  app.get('/admin', (req, reply) => reply.redirect('/admin/'));

  // ---- optional: serve the website from this server too (single-server deployment)
  if (config.SERVE_SITE_DIR) {
    await app.register(fastifyStatic, { root: config.SERVE_SITE_DIR, prefix: '/', decorateReply: false, index: ['index.html'], extensions: ['html'] });
    const notFound = path.join(config.SERVE_SITE_DIR, '404.html');
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.method !== 'GET' || !fs.existsSync(notFound)) return reply.code(404).send({ error: 'not_found' });
      return reply.code(404).type('text/html; charset=utf-8').send(fs.readFileSync(notFound));
    });
  } else {
    app.setNotFoundHandler((req, reply) => reply.code(404).send({ error: 'not_found' }));
  }

  app.addHook('onClose', async () => { jobs.stop(); mailer.close?.(); db.close(); });
  return app;
}

// Hashes of every inline <script> in the website, so a strict Content-Security-Policy still lets them run.
function siteCspSources(dir) {
  const hashes = new Set();
  let analytics = false;
  const walk = (d, depth) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory() && depth < 3 && !e.name.startsWith('.') && e.name !== 'node_modules') walk(f, depth + 1);
      else if (e.isFile() && e.name.endsWith('.html')) {
        const html = fs.readFileSync(f, 'utf8');
        for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
          const attrs = m[1] || '';
          if (/\ssrc=/i.test(attrs) || /type=["']?application\/(ld\+)?json/i.test(attrs) || !m[2].trim()) continue;
          hashes.add(`'sha256-${crypto.createHash('sha256').update(m[2]).digest('base64')}'`);
        }
      }
    }
  };
  try { walk(dir, 0); } catch { /* folder missing: reported elsewhere */ }
  try { analytics = /ga4Id:\s*["']G-/.test(fs.readFileSync(path.join(dir, 'assets/js/config.js'), 'utf8')); } catch { /* no config */ }
  return { scripts: [...hashes], analytics };
}

// Readable coloured logs in development, plain JSON lines when pino-pretty is not installed.
function hasPrettyLogs() {
  try { import.meta.resolve('pino-pretty'); return true; } catch { return false; }
}
