import { db } from '../config/db.js';
import { recordAudit } from '../utils/audit.js';
import { issueTicket } from '../services/ticketService.js';
import { generateQrBuffer } from '../services/qrService.js';
import { sendApprovedTicketEmail, sendRejectedEmail } from '../services/emailService.js';
import { getSignedEvidenceUrl, deleteEvidence } from '../services/storageService.js';
import { env } from '../config/env.js';

const ALLOWED_STATUS_FILTERS = new Set(['PENDING', 'APPROVED', 'REJECTED']);

export async function getStats(req, res) {
  const { rows: totalsRows } = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
     FROM registrations`
  );
  const totals = totalsRows[0];

  const { rows: checkinRows } = await db.query(
    `SELECT
       SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) AS "checkedIn",
       SUM(CASE WHEN status = 'VALID' THEN 1 ELSE 0 END) AS "notCheckedIn"
     FROM tickets`
  );
  const checkins = checkinRows[0];

  res.json({
    totalRegistrations: Number(totals.total) || 0,
    pending: Number(totals.pending) || 0,
    approved: Number(totals.approved) || 0,
    rejected: Number(totals.rejected) || 0,
    checkedIn: Number(checkins.checkedIn) || 0,
    notCheckedIn: Number(checkins.notCheckedIn) || 0,
  });
}

export async function listRegistrations(req, res) {
  const { search = '', status, level, checkin, page = '1', pageSize = '20' } = req.query;

  const conditions = [];
  const params = [];

  function addParam(value) {
    params.push(value);
    return `$${params.length}`;
  }

  if (status && ALLOWED_STATUS_FILTERS.has(status)) {
    conditions.push(`r.status = ${addParam(status)}`);
  }
  if (level) {
    conditions.push(`r.level = ${addParam(level)}`);
  }
  if (search) {
    const p = addParam(`%${search}%`);
    conditions.push(
      `(r.full_name ILIKE ${p} OR r.matric_number ILIKE ${p} OR r.email ILIKE ${p} OR t.ticket_code ILIKE ${p})`
    );
  }
  if (checkin === 'CHECKED_IN' || checkin === 'VALID') {
    conditions.push(`t.status = ${addParam(checkin)}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const offset = (pageNum - 1) * size;

  const limitParam = addParam(size);
  const offsetParam = addParam(offset);

  const { rows } = await db.query(
    `SELECT r.id, r.full_name, r.matric_number, r.level, r.email, r.phone, r.status,
            r.rejection_reason, r.created_at, r.approved_at, r.duplicate_of_registration_id,
            t.ticket_code, t.status AS ticket_status, t.checked_in_at
     FROM registrations r
     LEFT JOIN tickets t ON t.registration_id = r.id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS count
     FROM registrations r
     LEFT JOIN tickets t ON t.registration_id = r.id
     ${where}`,
    countParams
  );

  res.json({
    registrations: rows,
    pagination: { page: pageNum, pageSize: size, total: Number(countRows[0].count) },
  });
}

export async function getRegistrationDetail(req, res) {
  const { rows } = await db.query(
    `SELECT r.*, t.ticket_code, t.status AS ticket_status, t.checked_in_at
     FROM registrations r
     LEFT JOIN tickets t ON t.registration_id = r.id
     WHERE r.id = $1`,
    [req.params.id]
  );
  const registration = rows[0];
  if (!registration) return res.status(404).json({ error: 'Registration not found.' });

  const { payment_evidence_path, ...safe } = registration;
  res.json({
    ...safe,
    paymentEvidenceUrl: `/api/admin/registrations/${registration.id}/evidence`,
  });
}

/** Redirects to a short-lived signed URL for the evidence file. Admin-only. */
export async function getPaymentEvidence(req, res) {
  const { rows } = await db.query('SELECT payment_evidence_path FROM registrations WHERE id = $1', [
    req.params.id,
  ]);
  const registration = rows[0];
  if (!registration) return res.status(404).json({ error: 'Registration not found.' });

  try {
    const signedUrl = await getSignedEvidenceUrl(registration.payment_evidence_path, 120);
    res.redirect(302, signedUrl);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not load the evidence file.' });
  }
}

export async function approveRegistration(req, res) {
  const { rows } = await db.query('SELECT * FROM registrations WHERE id = $1', [req.params.id]);
  const registration = rows[0];
  if (!registration) return res.status(404).json({ error: 'Registration not found.' });
  if (registration.status !== 'PENDING') {
    return res.status(409).json({ error: `Registration is already ${registration.status}.` });
  }

  await db.query(
    `UPDATE registrations
     SET status = 'APPROVED', approved_at = now(), approved_by = $1, updated_at = now()
     WHERE id = $2`,
    [req.admin.id, registration.id]
  );

  const ticket = await issueTicket(registration.id);

  recordAudit({
    actorType: 'admin',
    actorId: req.admin.id,
    action: 'REGISTRATION_APPROVED',
    targetType: 'registration',
    targetId: registration.id,
    metadata: { ticketCode: ticket.ticket_code },
  });
  recordAudit({
    actorType: 'admin',
    actorId: req.admin.id,
    action: 'TICKET_GENERATED',
    targetType: 'ticket',
    targetId: ticket.id,
  });

  res.json({ message: 'Registration approved.', ticketCode: ticket.ticket_code });

  try {
    const ticketUrl = `${env.clientBaseUrl}/ticket/${registration.access_token}`;
    const qrBuffer = await generateQrBuffer(ticketUrl);
    await sendApprovedTicketEmail({
      to: registration.email,
      fullName: registration.full_name,
      level: registration.level,
      ticketCode: ticket.ticket_code,
      qrCodeBuffer: qrBuffer,
      ticketUrl,
    });
  } catch (err) {
    console.error('Failed to send approval email:', err);
  }
}

/**
 * Re-sends the ticket email for an already-approved registration — for
 * students whose email got lost, went to spam, or (for anyone approved
 * before the QR-code fix) whose ticket has the old broken QR format. This
 * regenerates the QR fresh each time, so it also silently repairs any
 * old-format tickets without needing to re-approve them.
 */
export async function resendTicket(req, res) {
  const { rows } = await db.query(
    `SELECT r.*, t.id AS ticket_id, t.ticket_code
     FROM registrations r
     JOIN tickets t ON t.registration_id = r.id
     WHERE r.id = $1`,
    [req.params.id]
  );
  const registration = rows[0];

  if (!registration) return res.status(404).json({ error: 'Registration not found.' });
  if (registration.status !== 'APPROVED') {
    return res.status(409).json({ error: 'Only approved registrations have a ticket to resend.' });
  }

  const ticketUrl = `${env.clientBaseUrl}/ticket/${registration.access_token}`;

  try {
    const qrBuffer = await generateQrBuffer(ticketUrl);
    await sendApprovedTicketEmail({
      to: registration.email,
      fullName: registration.full_name,
      level: registration.level,
      ticketCode: registration.ticket_code,
      qrCodeBuffer: qrBuffer,
      ticketUrl,
    });
  } catch (err) {
    console.error('Failed to resend ticket email:', err);
    return res.status(502).json({ error: 'Could not send the email. Check SMTP configuration and try again.' });
  }

  recordAudit({
    actorType: 'admin',
    actorId: req.admin.id,
    action: 'TICKET_RESENT',
    targetType: 'registration',
    targetId: registration.id,
    metadata: { ticketCode: registration.ticket_code },
  });

  res.json({ message: 'Ticket email resent.' });
}

/**
 * Permanently deletes a registration (and, via ON DELETE CASCADE, its
 * ticket if one was issued) along with its uploaded payment evidence file.
 * Meant for cleaning up test submissions — this is irreversible, so the
 * client requires the admin to type the person's name to confirm.
 */
export async function deleteRegistration(req, res) {
  const { rows } = await db.query('SELECT * FROM registrations WHERE id = $1', [req.params.id]);
  const registration = rows[0];
  if (!registration) return res.status(404).json({ error: 'Registration not found.' });

  await db.query('DELETE FROM registrations WHERE id = $1', [registration.id]);

  if (registration.payment_evidence_path) {
    deleteEvidence(registration.payment_evidence_path); // best-effort, never blocks the response
  }

  recordAudit({
    actorType: 'admin',
    actorId: req.admin.id,
    action: 'REGISTRATION_DELETED',
    targetType: 'registration',
    targetId: registration.id,
    metadata: { fullName: registration.full_name, matricNumber: registration.matric_number },
  });

  res.json({ message: 'Registration deleted.' });
}

export async function rejectRegistration(req, res) {
  const reason = (req.body.reason || '').trim().slice(0, 500);
  const { rows } = await db.query('SELECT * FROM registrations WHERE id = $1', [req.params.id]);
  const registration = rows[0];
  if (!registration) return res.status(404).json({ error: 'Registration not found.' });
  if (registration.status !== 'PENDING') {
    return res.status(409).json({ error: `Registration is already ${registration.status}.` });
  }

  await db.query(
    `UPDATE registrations
     SET status = 'REJECTED', rejection_reason = $1, rejected_at = now(), rejected_by = $2, updated_at = now()
     WHERE id = $3`,
    [reason || null, req.admin.id, registration.id]
  );

  recordAudit({
    actorType: 'admin',
    actorId: req.admin.id,
    action: 'REGISTRATION_REJECTED',
    targetType: 'registration',
    targetId: registration.id,
    metadata: { reason },
  });

  res.json({ message: 'Registration rejected.' });

  sendRejectedEmail({ to: registration.email, fullName: registration.full_name, reason }).catch((err) =>
    console.error('Failed to send rejection email:', err)
  );
}

export async function exportAttendeesCsv(req, res) {
  const { rows } = await db.query(
    `SELECT r.full_name, r.matric_number, r.level, r.email, r.phone, r.status,
            t.ticket_code, t.status AS ticket_status, t.checked_in_at
     FROM registrations r
     LEFT JOIN tickets t ON t.registration_id = r.id
     ORDER BY r.created_at ASC`
  );

  const header = [
    'Name', 'Matric Number', 'Level', 'Email', 'Phone',
    'Registration Status', 'Ticket ID', 'Check-in Status', 'Check-in Time',
  ];

  const csvRows = rows.map((r) =>
    [
      r.full_name, r.matric_number, r.level, r.email, r.phone, r.status,
      r.ticket_code || '',
      r.ticket_status === 'CHECKED_IN' ? 'CHECKED_IN' : r.ticket_status ? 'NOT_CHECKED_IN' : '',
      r.checked_in_at || '',
    ].map(csvEscape).join(',')
  );

  const csv = [header.join(','), ...csvRows].join('\n');

  recordAudit({ actorType: 'admin', actorId: req.admin.id, action: 'ATTENDEES_EXPORTED' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendees.csv"');
  res.send(csv);
}

const ALLOWED_AUDIT_ACTIONS = new Set([
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'RATE_LIMIT_EXCEEDED',
  'REGISTRATION_APPROVED',
  'REGISTRATION_REJECTED',
  'TICKET_GENERATED',
  'CHECK_IN',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'ATTENDEES_EXPORTED',
  'BACKUP_CREATED',
  'BOT_REGISTRATION_BLOCKED',
  'DUPLICATE_RECEIPT_DETECTED',
  'TICKET_RESENT',
  'REGISTRATION_DELETED',
]);

/** Security/audit log for review — who did what, and every rate-limit trip. */
export async function listAuditLog(req, res) {
  const { action, page = '1', pageSize = '50' } = req.query;

  const conditions = [];
  const params = [];
  function addParam(value) {
    params.push(value);
    return `$${params.length}`;
  }

  if (action && ALLOWED_AUDIT_ACTIONS.has(action)) {
    conditions.push(`action = ${addParam(action)}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 200);
  const offset = (pageNum - 1) * size;

  const limitParam = addParam(size);
  const offsetParam = addParam(offset);

  const { rows } = await db.query(
    `SELECT id, actor_type, actor_id, action, target_type, target_id, metadata, created_at
     FROM audit_log ${where}
     ORDER BY created_at DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: countRows } = await db.query(`SELECT COUNT(*) AS count FROM audit_log ${where}`, countParams);

  res.json({ entries: rows, pagination: { page: pageNum, pageSize: size, total: Number(countRows[0].count) } });
}

export async function exportAuditLogCsv(req, res) {
  const { rows } = await db.query(
    `SELECT actor_type, actor_id, action, target_type, target_id, metadata, created_at
     FROM audit_log ORDER BY created_at DESC LIMIT 5000`
  );

  const header = ['Timestamp', 'Actor Type', 'Actor ID', 'Action', 'Target Type', 'Target ID', 'Metadata'];
  const csvRows = rows.map((r) =>
    [r.created_at, r.actor_type, r.actor_id || '', r.action, r.target_type || '', r.target_id || '', r.metadata ? JSON.stringify(r.metadata) : '']
      .map(csvEscape)
      .join(',')
  );
  const csv = [header.join(','), ...csvRows].join('\n');

  recordAudit({ actorType: 'admin', actorId: req.admin.id, action: 'AUDIT_LOG_EXPORTED' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
  res.send(csv);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
