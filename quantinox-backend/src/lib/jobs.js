// A small, durable job queue stored in SQLite. Emails and webhooks are never lost if the
// mail server or webhook is down: they are retried with increasing delays.
import { now, addMs } from '../db/index.js';
import { buildEmail } from './emails.js';

const BACKOFF = [30e3, 2 * 60e3, 10 * 60e3, 30 * 60e3, 2 * 3600e3, 6 * 3600e3];

export function createJobs({ db, mailer, config, log }) {
  let timer = null, running = false;

  function enqueue(type, payload, delayMs = 0) {
    const t = now();
    db.run('INSERT INTO jobs (type, payload, status, run_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', type, JSON.stringify(payload), 'pending', addMs(delayMs), t, t);
  }
  // Convenience: queue an email from a template
  function email(kind, to, lang, data = {}) {
    if (!to) return;
    enqueue('email', { kind, to, lang, data });
  }

  const handlers = {
    async email(p) {
      const e = buildEmail(p.kind, p.lang, p.data, config);
      await mailer.send({ to: p.to, subject: e.subject, html: e.html, text: e.text, replyTo: e.replyTo });
    },
    async webhook(p) {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(p.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Quantinox-Backend/1.0' }, body: JSON.stringify(p.body), signal: ctrl.signal });
        if (!r.ok) throw new Error(`webhook HTTP ${r.status}`);
      } finally { clearTimeout(t); }
    },
    async cleanup() {
      const t = now();
      db.run('DELETE FROM sessions WHERE expires_at < ?', t);
      db.run('DELETE FROM tokens WHERE expires_at < ? OR used_at IS NOT NULL AND used_at < ?', addMs(-7 * 864e5), addMs(-7 * 864e5));
      db.run('DELETE FROM customers WHERE email_verified_at IS NULL AND created_at < ?', addMs(-30 * 864e5));
      db.run("DELETE FROM subscribers WHERE status = 'pending' AND created_at < ?", addMs(-30 * 864e5));
      db.run("DELETE FROM jobs WHERE status = 'done' AND updated_at < ?", addMs(-30 * 864e5));
      db.run('DELETE FROM counters WHERE day < ?', addMs(-90 * 864e5).slice(0, 10));
      db.run('DELETE FROM assistant_questions WHERE created_at < ?', addMs(-180 * 864e5));
      db.run('DELETE FROM ai_reports WHERE created_at < ?', addMs(-365 * 864e5));
    },
  };

  async function runDue(limit = 20) {
    if (running) return 0;
    running = true;
    let count = 0;
    try {
      const due = db.all("SELECT * FROM jobs WHERE status = 'pending' AND run_at <= ? ORDER BY run_at LIMIT ?", now(), limit);
      for (const job of due) {
        db.run("UPDATE jobs SET status = 'running', updated_at = ? WHERE id = ? AND status = 'pending'", now(), job.id);
        try {
          await handlers[job.type](JSON.parse(job.payload));
          db.run("UPDATE jobs SET status = 'done', attempts = attempts + 1, last_error = NULL, updated_at = ? WHERE id = ?", now(), job.id);
        } catch (e) {
          const attempts = job.attempts + 1;
          const failed = attempts > BACKOFF.length;
          db.run('UPDATE jobs SET status = ?, attempts = ?, last_error = ?, run_at = ?, updated_at = ? WHERE id = ?',
            failed ? 'failed' : 'pending', attempts, String(e.message).slice(0, 500), addMs(failed ? 0 : BACKOFF[attempts - 1]), now(), job.id);
          log.warn({ job: job.id, type: job.type, attempts, err: e.message }, failed ? 'job failed permanently' : 'job failed, will retry');
        }
        count++;
      }
    } finally { running = false; }
    return count;
  }

  function start(intervalMs = 3000) {
    if (timer) return;
    // jobs left "running" by a crash go back to the queue
    db.run("UPDATE jobs SET status = 'pending' WHERE status = 'running'");
    timer = setInterval(() => { runDue().catch((e) => log.error(e, 'job runner error')); }, intervalMs);
    timer.unref();
    // daily housekeeping
    const daily = setInterval(() => enqueue('cleanup', {}), 24 * 3600e3); daily.unref();
    enqueue('cleanup', {}, 60e3);
    stop.daily = daily;
  }
  function stop() { clearInterval(timer); timer = null; if (stop.daily) clearInterval(stop.daily); }
  // For tests: run everything that is due now
  async function drain() { let n = 0, k; do { k = await runDue(100); n += k; } while (k > 0); return n; }

  return { enqueue, email, runDue, start, stop, drain, handlers };
}
