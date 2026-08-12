import cron from 'node-cron';
import { env, assertCriticalEnv } from './config/env.js';
import { initDb } from './config/db.js';
import { seedFirstAdmin } from './config/seedAdmin.js';
import { buildApp } from './app.js';
import { runBackup } from './services/backupService.js';

async function start() {
  assertCriticalEnv();
  await initDb();
  await seedFirstAdmin();

  const app = buildApp();

  app.listen(env.port, () => {
    console.log(`Picnic API server listening on port ${env.port} (${env.nodeEnv})`);
  });

  // Best-effort in-process daily backup for whenever the server happens to
  // already be awake at noon. On a free-tier host that spins down when
  // idle, this alone isn't reliable — see routes/systemRoutes.js for the
  // externally-triggered backup that's the real guarantee.
  cron.schedule(
    '0 12 * * *',
    () => {
      runBackup().catch((err) => console.error('[cron] Scheduled backup failed:', err));
    },
    { timezone: env.backup.timezone }
  );
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
