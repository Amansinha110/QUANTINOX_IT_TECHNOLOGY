# Quantinox backend

The server behind the Quantinox website. One small Node.js app that handles:

- **Every website form**: demo requests, contact, call back, events, trials, downloads, Quanta AI demo requests. Each lead is saved, scored A/B/C, emailed to your sales inbox and (optionally) pushed to Slack, Teams, Zapier, Make or your CRM.
- **Newsletter** with double opt-in (confirm link by email) and one-click unsubscribe.
- **Customer accounts**: sign up, email confirmation, log in, forgot/reset password, My account, data download and account deletion (India DPDP Act and GDPR friendly).
- **Quanta AI**: full AI answers (Claude) grounded in your website's pages, streamed live. Without an API key the assistant keeps working as the free "site guide".
- **Admin dashboard** at `/admin`: leads pipeline with notes and history, customers, newsletter, AI feedback, email queue, audit log, team members with roles, two-factor sign-in.
- **API documentation** at `/docs` (OpenAPI).
- **Emails in English and Hindi**, sent through any SMTP provider, with automatic retries if the mail server is down.

No separate database server: data lives in one SQLite file (built into Node.js), so it runs on a ₹500/month VPS, Render, Railway, or a cPanel host with Node.js.

---

## 1. Try it on your computer (5 minutes)

You need **Node.js 22.13 or newer** (`node -v`).

```bash
cd quantinox-backend
npm ci                       # installs the exact tested versions
cp .env.example .env
```

Edit `.env` for local testing:

```ini
NODE_ENV=development
PUBLIC_URL=http://localhost:4000
SITE_URL=http://localhost:8080
COOKIE_DOMAIN=
MAIL_TRANSPORT=log           # emails are saved as files in data/outbox instead of being sent
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=choose-a-long-password
```

Then:

```bash
npm run dev                  # backend on http://localhost:4000
```

In another terminal, serve the website and point it at the backend:

```bash
cd ../quantinox-site
# in assets/js/config.js set:  apiBase: "http://localhost:4000"
python3 -m http.server 8080  # website on http://localhost:8080
```

Now fill in the demo form or sign up: the emails appear in `quantinox-backend/data/outbox/` (open them in a browser, click the confirm link), and the lead appears at http://localhost:4000/admin.

## AI features (v7)

All of these use the same `ANTHROPIC_API_KEY` and `ASSISTANT_MODEL`, and share the `ASSISTANT_DAILY_CAP` budget (an advisor plan counts as 3 messages). Without a key, the endpoints answer `503 not_configured`; the website then uses its built-in rule-based advisor and the dashboard explains how to switch AI on.

| Endpoint | Who | What it does |
|---|---|---|
| `POST /api/ai/advisor` | website | AI Solution Advisor: tailored plan (package, modules now/next/later, agents, phases, quick wins, risks, demo questions) from the visitor's description, grounded in your website text. 6 per minute per visitor. |
| `POST /api/assistant/log` | website | Records a site-guide question (contact details removed) for AI insights. AI-mode questions are recorded automatically. |
| `GET/POST /api/admin/leads/:id/ai-brief` | editor | AI sales brief and a draft reply in the lead's language; saved and shown in the lead history. |
| `GET /api/admin/ai/insights?days=30` | viewer | Question volume, languages, pages, top words, unanswered questions (content gaps). |
| `POST /api/admin/ai/insights/summary` | editor | AI report: themes, content gaps with the page to fix, FAQ ideas, next actions. Needs 5+ questions. |

Every AI answer is requested as structured data (a forced tool call), then checked: only known packages and modules are kept, links must be pages of your site, and text is length-limited. Email addresses, phone numbers and PAN/Aadhaar-style numbers are removed before questions are stored or sent for analysis. Stored questions are deleted after 180 days, reports after a year (daily clean-up job). New tables come from `src/db/migrations/002_ai.sql`, applied automatically on start.

Tests: `test/ai.test.js` (7 tests, with a stand-in for the Claude API).

## 2. Settings (`.env`)

| Setting | What it does |
|---|---|
| `PUBLIC_URL` | Where this backend is reachable, e.g. `https://api.yourdomain.com` |
| `SITE_URL` | Your website, e.g. `https://www.yourdomain.com`. Only this site (plus `ALLOWED_ORIGINS`) may call the API. |
| `ALLOWED_ORIGINS` | Other addresses of your site, comma separated, e.g. `https://yourdomain.com` |
| `COOKIE_DOMAIN` | `.yourdomain.com` when the site and API are on different subdomains, so login works on both |
| `SECRET` | 64 random characters. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Required in production.** |
| `DATABASE_FILE` | Where the SQLite file lives (default `data/quantinox.db`) |
| `MAIL_TRANSPORT` | `smtp` (real email) or `log` (save to `data/outbox`) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | Your email provider: Zoho Mail, Google Workspace, Amazon SES, Brevo, Mailgun, etc. |
| `MAIL_FROM` | Sender, e.g. `Quantinox <no-reply@yourdomain.com>` |
| `SALES_EMAIL` | Gets an email for every new lead (Reply goes straight to the customer) |
| `SUPPORT_EMAIL` | Shown in emails as the contact address |
| `LEAD_WEBHOOK_URL` `LEAD_WEBHOOK_FORMAT` | Optional: POST every lead to Slack/Teams (`slack`) or Zapier/Make/CRM (`json`) |
| `HIBP_CHECK` | Refuse passwords that appear in known data breaches (only 5 characters of a hash leave your server) |
| `ANTHROPIC_API_KEY` | Turns on full AI answers in Quanta AI. Get a key at console.anthropic.com. |
| `ASSISTANT_MODEL` | Default `claude-haiku-5-5` (fast and low cost) |
| `KNOWLEDGE_URL` | Your live `https://www.yourdomain.com/assets/data/assistant-knowledge.json`, so the AI always knows your latest pages. Without it, the copy in `knowledge/` is used. |
| `ASSISTANT_RATE_PER_MIN` `ASSISTANT_DAILY_CAP` | Cost protection: questions per visitor per minute, and per day in total |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` | Creates the first admin on first start. Remove the password from `.env` afterwards. |
| `SERVE_SITE_DIR` | Optional single-server mode: also serve the website from this backend |
| `DOCS_ENABLED` | API docs at `/docs` (on in development, off in production unless `true`) |
| `TRUST_PROXY` | Leave `true` behind Nginx/Caddy/Render so visitor IPs are correct |

## 3. Connect the website

In `quantinox-site/assets/js/config.js`:

```js
apiBase: "https://api.yourdomain.com",
assistantEndpoint: "",
```

That is all. Every form, Sign up, Log in, My account and Quanta AI now talk to the backend. Quanta AI asks the backend whether an AI key is set and switches from "Site guide" to "AI" by itself.

## 4. Put it online

Pick one.

### A. VPS with Docker (recommended: DigitalOcean, Hetzner, AWS Lightsail, any Ubuntu server)

```bash
cp .env.example .env         # fill it in
docker compose up -d --build
```

Then put HTTPS in front. With [Caddy](https://caddyserver.com) it is one file (see `Caddyfile.example`), and certificates renew automatically. With Nginx, proxy to `127.0.0.1:4000` and add `proxy_buffering off;` so AI answers stream.

### B. VPS without Docker

```bash
npm ci --omit=dev
NODE_ENV=production node --disable-warning=ExperimentalWarning src/server.js
```

Keep it running with `pm2 start "npm start" --name quantinox` (then `pm2 save && pm2 startup`), or a systemd service.

### C. Render / Railway / Fly.io

- Build command `npm ci --omit=dev`, start command `npm start`.
- **Add a persistent disk** mounted at `/app/data` (Render: "Disks"), and set `DATABASE_FILE=/app/data/quantinox.db`. Without a disk your data is lost on every deploy.
- Add the `.env` values in the dashboard's Environment section.

### D. cPanel / Hostinger with "Setup Node.js App"

Choose Node.js 22, application root `quantinox-backend`, startup file `src/server.js`. Click "Run NPM Install", add the environment variables, and start. Map a subdomain such as `api.yourdomain.com`.

### E. Single server for both website and backend

Set `SERVE_SITE_DIR=../quantinox-site` (or `/site` in Docker) and `SITE_URL` = `PUBLIC_URL` = your domain. The backend then serves the website too, with a strict Content-Security-Policy that already allows the site's own scripts and Google Analytics. Set `apiBase` in config.js to the same domain.

## 5. Everyday tasks

```bash
npm run create-admin -- --email anita@yourdomain.com --name "Anita" --role editor   # add a team member
npm run backup                                                                       # safe copy of the database
npm test                                                                             # 26 automated tests
```

Roles: **owner** (everything, including team, audit log and deleting leads), **editor** (work on leads, retry emails), **viewer** (read only).

Backups: run `npm run backup` every night with cron, e.g. `0 2 * * * cd /path/quantinox-backend && npm run backup`. Copies go to `data/backups/` (keeps the newest 30; set `BACKUP_KEEP` to change). Copy them off the server too.

After you change website content, rebuild the assistant knowledge (`python3 tools/build-assistant-kb.py` in the site folder), upload the site, then click **Settings → Reload Quanta AI knowledge** in the admin.

## 6. API

Full interactive docs at `/docs`. The website uses:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/leads` | Any website form (`lead_type`: demo, contact, callback, event, trial, download, newsletter, assistant_demo) |
| GET | `/api/newsletter/confirm?token=` · `/api/newsletter/unsubscribe?token=` | Links in newsletter emails |
| POST | `/api/account/signup` · `/verify` · `/resend-verification` | Create account and confirm email |
| POST | `/api/account/login` · `/logout` | Session cookie (HttpOnly) |
| POST | `/api/account/forgot-password` · `/reset-password` | Password reset by email |
| GET | `/api/account/me` · `/export` | Account details and data download |
| POST | `/api/account/delete` | Delete account (needs password) |
| GET | `/api/assistant/status` | Is AI on? |
| POST | `/api/assistant` | Ask Quanta AI (Server-Sent Events stream) |
| POST | `/api/assistant/feedback` | Thumbs up/down |
| GET | `/health` · `/ready` | For uptime monitors and load balancers |

The admin dashboard uses `/api/admin/*` (leads, CSV export, customers, subscribers, feedback, jobs, audit, team, 2FA, system).

Errors always look like `{ "error": "invalid", "fields": [{ "field": "email", "message": "..." }] }`, so the website can show the right message.

## 7. Security built in

- Passwords hashed with scrypt; breached passwords refused (optional); accounts lock for 15 minutes after 8 wrong passwords.
- Sessions are random tokens stored only as hashes; cookies are HttpOnly, Secure in production, SameSite. Resetting a password signs out every other device.
- Only your website may call the API (CORS allow-list plus an Origin check on every change). The admin API accepts only the dashboard itself and needs an extra header, so other sites cannot trigger admin actions.
- Two-factor sign-in for admins (any authenticator app); the 2FA secret is encrypted in the database.
- Rate limits on every form and on the AI; daily AI spending cap.
- Visitor IP addresses are stored only as keyed hashes. Spam bots are caught by a hidden field.
- Security headers (CSP, HSTS, frame blocking) via Helmet. CSV exports are protected against spreadsheet formula injection.
- Every admin action is written to the audit log.
- Unconfirmed accounts and unconfirmed newsletter sign-ups are removed after 30 days.

## 8. Folder map

```
src/server.js           start-up and graceful shutdown
src/app.js              security, CORS, routes, admin and docs
src/config.js           reads and checks .env
src/db/                 SQLite connection and migrations (run automatically)
src/routes/             leads, account, assistant, admin
src/lib/                security, email templates, job queue, lead scoring
src/assistant/          website knowledge search for Quanta AI
admin/                  admin dashboard (plain HTML/CSS/JS)
knowledge/              Quanta AI knowledge file (copy of the website's)
scripts/                create-admin, backup
test/                   automated tests (npm test)
```

This backend replaces the separate `quantinox-ai-server` from v5. You only need that folder if you want to keep running the AI on a different server.
