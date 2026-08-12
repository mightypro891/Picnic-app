import { Router } from 'express';
import { runBackup } from '../services/backupService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * POST /api/system/backup/trigger
 *
 * Deliberately outside the admin-cookie auth used everywhere else: this is
 * the endpoint an external scheduler (cron-job.org, UptimeRobot's "webhook"
 * monitor type, etc.) hits once a day. That's also *why* it exists as a
 * separate HTTP call an outside service makes, rather than relying only on
 * the in-process node-cron schedule in server.js — on Render's free tier
 * the app spins down after inactivity, so an internal cron job simply won't
 * be running at noon unless something external wakes the instance up
 * first. This request IS that wake-up call.
 *
 * Authenticated with a shared secret header (BACKUP_TRIGGER_SECRET), not an
 * admin login, since the caller is a script/service, not a person.
 */
router.post(
  '/trigger',
  asyncHandler(async (req, res) => {
    const providedSecret = req.get('X-Backup-Secret') || '';

    if (!env.backup.triggerSecret) {
      return res.status(503).json({ error: 'Backup trigger is not configured (BACKUP_TRIGGER_SECRET is unset).' });
    }
    if (providedSecret !== env.backup.triggerSecret) {
      return res.status(401).json({ error: 'Invalid backup trigger secret.' });
    }

    const result = await runBackup();
    res.json({ message: 'Backup completed.', ...result });
  })
);

export default router;
