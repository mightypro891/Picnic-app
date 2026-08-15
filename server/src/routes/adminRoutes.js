import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getStats,
  listRegistrations,
  getRegistrationDetail,
  getPaymentEvidence,
  approveRegistration,
  rejectRegistration,
  resendTicket,
  deleteRegistration,
  exportAttendeesCsv,
  listAuditLog,
  exportAuditLogCsv,
} from '../controllers/adminController.js';
import { listBackups, runBackupNow } from '../controllers/backupController.js';
import { listAttendance, listGateStats } from '../controllers/checkinController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(asyncHandler(requireAdmin));

router.get('/stats', asyncHandler(getStats));
router.get('/registrations', asyncHandler(listRegistrations));
router.get('/registrations/:id', asyncHandler(getRegistrationDetail));
router.get('/registrations/:id/evidence', asyncHandler(getPaymentEvidence));
router.post('/registrations/:id/approve', asyncHandler(approveRegistration));
router.post('/registrations/:id/reject', asyncHandler(rejectRegistration));
router.post('/registrations/:id/resend-ticket', asyncHandler(resendTicket));
router.delete('/registrations/:id', asyncHandler(deleteRegistration));
router.get('/attendees', asyncHandler(listAttendance));
router.get('/gate-stats', asyncHandler(listGateStats));
router.get('/export/attendees.csv', asyncHandler(exportAttendeesCsv));
router.get('/audit-log', asyncHandler(listAuditLog));
router.get('/audit-log/export.csv', asyncHandler(exportAuditLogCsv));
router.get('/backups', asyncHandler(listBackups));
router.post('/backups/run', asyncHandler(runBackupNow));

export default router;
