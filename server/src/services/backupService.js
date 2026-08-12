import { db } from '../config/db.js';
import { recordAudit } from '../utils/audit.js';
import { uploadBackup } from './storageService.js';

/**
 * Exports the tables that actually matter to recover from — registrations,
 * tickets, and the audit log. Admin rows are deliberately excluded (they're
 * recreated by the permanent-admin seed on boot / or admins can be re-added
 * by hand) so a backup file is never a copy of anyone's password hash sitting
 * in storage.
 */
export async function runBackup() {
  const [registrations, tickets, auditLog] = await Promise.all([
    db.query('SELECT * FROM registrations ORDER BY created_at'),
    db.query('SELECT * FROM tickets ORDER BY generated_at'),
    db.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000'),
  ]);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    counts: {
      registrations: registrations.rowCount,
      tickets: tickets.rowCount,
      auditLogEntries: auditLog.rowCount,
    },
    registrations: registrations.rows,
    tickets: tickets.rows,
    auditLog: auditLog.rows,
  };

  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;
  const path = await uploadBackup(filename, JSON.stringify(snapshot, null, 2));

  recordAudit({
    actorType: 'system',
    action: 'BACKUP_CREATED',
    metadata: { filename, counts: snapshot.counts },
  });

  console.log(`[backupService] Backup written to ${path} (${snapshot.counts.registrations} registrations, ${snapshot.counts.tickets} tickets).`);

  return { filename, counts: snapshot.counts };
}
