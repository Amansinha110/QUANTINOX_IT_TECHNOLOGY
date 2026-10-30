// All settings come from environment variables (or a .env file next to package.json).
// Every setting is validated at start-up so a typo fails fast with a clear message.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadDotEnv(file = path.join(ROOT, '.env')) {
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const bool = (def) => z.preprocess((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())), z.boolean());
const list = z.preprocess((v) => String(v || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean), z.array(z.string()));
const url = z.string().url().transform((s) => s.replace(/\/+$/, ''));
const optStr = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  PUBLIC_URL: url.default('http://localhost:4000'),
  SITE_URL: url.default('http://localhost:8080'),
  ALLOWED_ORIGINS: list.default([]),
  TRUST_PROXY: bool(true),
  SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(32, 'SECRET must be at least 32 characters (run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")').optional()),
  COOKIE_DOMAIN: optStr,
  COOKIE_SECURE: z.preprocess((v) => (v === undefined || v === '' ? undefined : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())), z.boolean().optional()),
  DATABASE_FILE: z.string().default(path.join(ROOT, 'data', 'quantinox.db')),
  SERVE_SITE_DIR: optStr,
  DOCS_ENABLED: z.preprocess((v) => (v === undefined || v === '' ? undefined : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())), z.boolean().optional()),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  // Email
  MAIL_TRANSPORT: z.enum(['log', 'smtp', 'memory']).default('log'),
  SMTP_HOST: optStr,
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: optStr,
  SMTP_PASS: optStr,
  MAIL_FROM: z.string().default('Quantinox <no-reply@yourdomain.com>'),
  SALES_EMAIL: optStr,
  SUPPORT_EMAIL: optStr,

  // Integrations
  LEAD_WEBHOOK_URL: optStr,
  LEAD_WEBHOOK_FORMAT: z.enum(['json', 'slack']).default('json'),
  HIBP_CHECK: bool(true),

  // Quanta AI assistant
  ANTHROPIC_API_KEY: optStr,
  ANTHROPIC_BASE_URL: z.string().default('https://api.anthropic.com'),
  ASSISTANT_MODEL: z.string().default('claude-haiku-5-5'),
  KNOWLEDGE_URL: optStr,
  KNOWLEDGE_FILE: z.string().default(path.join(ROOT, 'knowledge', 'assistant-knowledge.json')),
  ASSISTANT_RATE_PER_MIN: z.coerce.number().int().default(12),
  ASSISTANT_DAILY_CAP: z.coerce.number().int().default(3000),

  // First admin account (created on start-up if there is no admin yet)
  ADMIN_EMAIL: optStr,
  ADMIN_PASSWORD: optStr,
  ADMIN_NAME: z.string().default('Owner'),
});

export function loadConfig(overrides = {}) {
  if (!overrides.__noDotEnv) loadDotEnv();
  const env = { ...process.env, ...overrides };
  const parsed = Schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${msg}`);
  }
  const c = parsed.data;
  const prod = c.NODE_ENV === 'production';
  if (!c.SECRET) {
    if (prod) throw new Error('Invalid configuration:\n  - SECRET is required in production (at least 32 random characters).');
    c.SECRET = 'dev-only-secret-change-me-dev-only-secret-change-me';
  }
  if (prod && c.MAIL_TRANSPORT === 'smtp' && !c.SMTP_HOST) throw new Error('Invalid configuration:\n  - SMTP_HOST is required when MAIL_TRANSPORT=smtp.');
  c.isProd = prod;
  c.isTest = c.NODE_ENV === 'test';
  c.cookieSecure = c.COOKIE_SECURE ?? prod;
  c.docsEnabled = c.DOCS_ENABLED ?? !prod;
  c.origins = Array.from(new Set([c.SITE_URL, ...c.ALLOWED_ORIGINS]));
  c.adminOrigin = c.PUBLIC_URL;
  if (c.SERVE_SITE_DIR) c.SERVE_SITE_DIR = path.resolve(ROOT, c.SERVE_SITE_DIR);
  if (c.DATABASE_FILE !== ':memory:' && !path.isAbsolute(c.DATABASE_FILE)) c.DATABASE_FILE = path.resolve(ROOT, c.DATABASE_FILE);
  if (!path.isAbsolute(c.KNOWLEDGE_FILE)) c.KNOWLEDGE_FILE = path.resolve(ROOT, c.KNOWLEDGE_FILE);
  return c;
}
