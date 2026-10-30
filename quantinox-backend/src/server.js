// Start the backend:  npm start   (or: node src/server.js)
import { buildApp } from './app.js';

let app;
try {
  app = await buildApp();
} catch (e) {
  console.error(`\n${e.message}\n`);
  process.exit(1);
}
const { HOST, PORT, PUBLIC_URL, SITE_URL, MAIL_TRANSPORT, docsEnabled } = app.config;
app.jobs.start();
await app.listen({ host: HOST, port: PORT });
app.log.info(`Quantinox backend ready on ${PUBLIC_URL} (website: ${SITE_URL}, email: ${MAIL_TRANSPORT}${docsEnabled ? `, API docs: ${PUBLIC_URL}/docs` : ''}, admin: ${PUBLIC_URL}/admin)`);
if (!app.db.get('SELECT id FROM admins LIMIT 1')) app.log.warn('No admin account yet. Run: npm run create-admin');

// Graceful shutdown: finish requests in flight, stop the job runner, close the database.
let closing = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (closing) return; closing = true;
    app.log.info(`${sig} received, shutting down`);
    const force = setTimeout(() => process.exit(1), 10000); force.unref();
    try { await app.close(); process.exit(0); } catch (e) { app.log.error(e); process.exit(1); }
  });
}
