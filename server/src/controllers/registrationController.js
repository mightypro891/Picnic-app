import path from 'path';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { validateRegistrationInput, normalizeMatric, normalizeEmail } from '../utils/validators.js';
import { generateId, generateAccessToken } from '../utils/tokens.js';
import { recordAudit } from '../utils/audit.js';
import { sendRegistrationReceivedEmail } from '../services/emailService.js';
import { generateQrDataUrl } from '../services/qrService.js';
import { uploadPaymentEvidence, deleteEvidence } from '../services/storageService.js';

export async function createRegistration(req, res) {
  // Honeypot check: a real visitor never sees or fills this field (it's
  // hidden off-screen), so a non-empty value means the request came from an
  // automated bot. We respond with the same success shape a real submission
  // gets — never inserting anything — so the bot has no signal to learn from
  // and adjust its behavior.
  if (req.body.website) {
    recordAudit({ actorType: 'system', action: 'BOT_REGISTRATION_BLOCKED', metadata: { ip: req.ip } });
    return res.status(201).json({ message: 'Registration submitted successfully.', accessToken: 'blocked' });
  }

  const { valid, errors, data } = validateRegistrationInput(req.body);

  if (!req.file) {
    errors.paymentEvidence = 'Upload your payment evidence.';
  }

  if (!valid || errors.paymentEvidence) {
    return res.status(400).json({ error: 'Please fix the errors in the form.', fields: errors });
  }

  const matricNormalized = normalizeMatric(data.matricNumber);
  const emailNormalized = normalizeEmail(data.email);

  const { rows: existingRows } = await db.query(
    `SELECT id FROM registrations
     WHERE status IN ('PENDING','APPROVED')
       AND (matric_number_normalized = $1 OR email_normalized = $2)`,
    [matricNormalized, emailNormalized]
  );

  if (existingRows[0]) {
    return res.status(409).json({
      error:
        'A registration already exists for this matric number or email address and is pending or approved. Contact an organizer if you believe this is a mistake.',
    });
  }

  // Upload to Supabase Storage first — if this fails we haven't touched the DB.
  let evidencePath;
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    evidencePath = await uploadPaymentEvidence(req.file.buffer, req.file.mimetype, ext);
  } catch (err) {
    console.error('Evidence upload failed:', err);
    return res.status(502).json({ error: 'Could not upload your payment evidence. Please try again.' });
  }

  // Duplicate-receipt check: an exact copy of a file someone else already
  // submitted is the single most common form of receipt fraud (reusing a
  // friend's proof of payment). This never blocks submission — it only
  // flags the registration for the admin to look at during review.
  const evidenceHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const { rows: duplicateRows } = await db.query(
    `SELECT id FROM registrations WHERE evidence_sha256 = $1 LIMIT 1`,
    [evidenceHash]
  );
  const duplicateOfId = duplicateRows[0]?.id || null;

  const registration = {
    id: generateId('reg'),
    full_name: data.fullName,
    matric_number: data.matricNumber,
    matric_number_normalized: matricNormalized,
    level: data.level,
    phone: data.phone,
    email: data.email,
    email_normalized: emailNormalized,
    payment_evidence_path: evidencePath,
    payment_evidence_original_name: req.file.originalname,
    payment_evidence_mime: req.file.mimetype,
    evidence_sha256: evidenceHash,
    duplicate_of_registration_id: duplicateOfId,
    access_token: generateAccessToken(),
  };

  try {
    await db.query(
      `INSERT INTO registrations
        (id, full_name, matric_number, matric_number_normalized, level, phone, email, email_normalized,
         payment_evidence_path, payment_evidence_original_name, payment_evidence_mime,
         evidence_sha256, duplicate_of_registration_id, access_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        registration.id,
        registration.full_name,
        registration.matric_number,
        registration.matric_number_normalized,
        registration.level,
        registration.phone,
        registration.email,
        registration.email_normalized,
        registration.payment_evidence_path,
        registration.payment_evidence_original_name,
        registration.payment_evidence_mime,
        registration.evidence_sha256,
        registration.duplicate_of_registration_id,
        registration.access_token,
      ]
    );
  } catch (err) {
    deleteEvidence(evidencePath);
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'A registration already exists for this matric number or email address.',
      });
    }
    throw err;
  }

  recordAudit({
    actorType: 'system',
    action: 'REGISTRATION_CREATED',
    targetType: 'registration',
    targetId: registration.id,
  });

  if (duplicateOfId) {
    recordAudit({
      actorType: 'system',
      action: 'DUPLICATE_RECEIPT_DETECTED',
      targetType: 'registration',
      targetId: registration.id,
      metadata: { matchesRegistrationId: duplicateOfId },
    });
  }

  sendRegistrationReceivedEmail({ to: registration.email, fullName: registration.full_name }).catch((err) =>
    console.error('Failed to send registration-received email:', err)
  );

  res.status(201).json({
    message: 'Registration submitted successfully.',
    accessToken: registration.access_token,
  });
}

/** Public, token-gated lookup — this is how a student checks status / views their ticket. */
export async function getMyRegistration(req, res) {
  const { accessToken } = req.params;

  const { rows } = await db.query(
    `SELECT r.id, r.full_name, r.level, r.matric_number, r.email, r.status, r.rejection_reason,
            r.created_at,
            t.ticket_code, t.token AS ticket_token, t.status AS ticket_status, t.checked_in_at
     FROM registrations r
     LEFT JOIN tickets t ON t.registration_id = r.id
     WHERE r.access_token = $1`,
    [accessToken]
  );
  const registration = rows[0];

  if (!registration) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  let qrCodeDataUrl = null;
  if (registration.status === 'APPROVED' && registration.ticket_token) {
    const ticketUrl = `${env.clientBaseUrl}/ticket/${accessToken}`;
    qrCodeDataUrl = await generateQrDataUrl(ticketUrl);
  }

  res.json({
    fullName: registration.full_name,
    level: registration.level,
    matricNumber: registration.matric_number,
    status: registration.status,
    rejectionReason: registration.rejection_reason,
    createdAt: registration.created_at,
    ticketCode: registration.ticket_code || null,
    ticketStatus: registration.ticket_status || null,
    checkedInAt: registration.checked_in_at || null,
    qrCodeDataUrl,
    event: env.event,
  });
}
