-- Customers who created an account on the website
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  company_size TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  email_verified_at TEXT,
  consent_at TEXT NOT NULL,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Login sessions (only a hash of the cookie token is stored)
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('customer', 'admin')),
  subject_id INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_subject ON sessions (kind, subject_id);

-- One-time links: email verification, password reset, newsletter confirm/unsubscribe
CREATE TABLE tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tokens_subject ON tokens (purpose, subject_id);

-- Every form on the website (demo, call back, contact, event, trial, download, assistant)
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')),
  score INTEGER NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'C',
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT,
  company TEXT,
  country TEXT,
  company_size TEXT,
  modules TEXT NOT NULL DEFAULT '[]',
  message TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  lang TEXT NOT NULL DEFAULT 'en',
  page TEXT,
  source TEXT,
  utm TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  consent_at TEXT NOT NULL,
  assigned_to INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_leads_created ON leads (created_at);
CREATE INDEX idx_leads_email ON leads (email);
CREATE INDEX idx_leads_status ON leads (status, type);

-- Timeline of a lead: created, status changes, notes, repeats
CREATE TABLE lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  body TEXT,
  admin_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_lead_events_lead ON lead_events (lead_id);

-- Newsletter with double opt-in
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  lang TEXT NOT NULL DEFAULT 'en',
  source TEXT,
  consent_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Background work: emails and webhooks, retried with back-off
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  run_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_jobs_due ON jobs (status, run_at);

-- Admin dashboard users
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Who did what, for security and accountability
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_created ON audit_log (created_at);

-- Thumbs up/down from the Quanta AI assistant
CREATE TABLE assistant_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
  question TEXT,
  answer TEXT,
  page TEXT,
  lang TEXT,
  created_at TEXT NOT NULL
);

-- Daily usage counters (assistant messages, etc.)
CREATE TABLE counters (
  name TEXT NOT NULL,
  day TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, day)
);
