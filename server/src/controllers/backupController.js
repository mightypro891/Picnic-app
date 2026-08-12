import { runBackup } from '../services/backupService.js';
import { listBackupFiles, getSignedBackupUrl } from '../services/storageService.js';

/** Admin-only: list available daily backups with a signed download link for each. */
export async function listBackups(req, res) {
  const files = await listBackupFiles();
  const withUrls = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      sizeBytes: f.metadata?.size ?? null,
      createdAt: f.created_at,
      downloadUrl: await getSignedBackupUrl(f.name),
    }))
  );
  res.json({ backups: withUrls });
}

/** Admin-only: manual "Backup Now" button on the Backups page. */
export async function runBackupNow(req, res) {
  const result = await runBackup();
  res.json({ message: 'Backup completed.', ...result });
}
