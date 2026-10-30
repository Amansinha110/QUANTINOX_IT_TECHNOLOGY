// Sends email through SMTP (any provider: Zoho, Google Workspace, Amazon SES, Brevo, Mailgun...).
// MAIL_TRANSPORT=log saves each email as an .html file in data/outbox (great for testing),
// MAIL_TRANSPORT=memory keeps them in memory (automated tests).
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { ROOT } from '../config.js';

export function createMailer(config, log) {
  const sent = [];
  let transport = null;
  if (config.MAIL_TRANSPORT === 'smtp') {
    transport = nodemailer.createTransport({
      host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
      pool: true, maxConnections: 3,
    });
  }
  const outbox = config.DATABASE_FILE === ':memory:' ? path.join(ROOT, 'data', 'outbox') : path.join(path.dirname(config.DATABASE_FILE), 'outbox');

  async function send(msg) {
    const mail = { from: config.MAIL_FROM, ...msg };
    if (config.MAIL_TRANSPORT === 'memory') { sent.push(mail); return { id: `mem-${sent.length}` }; }
    if (config.MAIL_TRANSPORT === 'log') {
      fs.mkdirSync(outbox, { recursive: true });
      const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${String(mail.to).replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.html`;
      const header = `<!-- To: ${mail.to}\n     Subject: ${mail.subject}\n     Reply-To: ${mail.replyTo || ''} -->\n`;
      fs.writeFileSync(path.join(outbox, name), header + mail.html);
      log.info({ to: mail.to, subject: mail.subject, file: path.relative(ROOT, path.join(outbox, name)) }, 'email saved to outbox (MAIL_TRANSPORT=log)');
      return { id: name };
    }
    const info = await transport.sendMail(mail);
    return { id: info.messageId };
  }
  async function verify() { if (transport) await transport.verify(); }
  return { send, verify, sent, close: () => transport && transport.close() };
}
