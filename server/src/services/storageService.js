import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { persistSession: false },
});

const BUCKET = env.supabase.bucket;

/**
 * Uploads a payment evidence file to a private Supabase Storage bucket and
 * returns the object path (not a public URL — the bucket must stay private;
 * evidence is only ever accessed through short-lived signed URLs).
 */
export async function uploadPaymentEvidence(buffer, mimeType, extension) {
  const path = `payment-evidence/${Date.now()}-${nanoid(24)}${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload payment evidence: ${error.message}`);
  }

  return path;
}

/** Short-lived signed URL so an admin's browser can view/open the evidence file. */
export async function getSignedEvidenceUrl(path, expiresInSeconds = 120) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }
  return data.signedUrl;
}

/** Best-effort cleanup — never throws, so a storage hiccup never blocks the primary action. */
export async function deleteEvidence(path) {
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error('Failed to delete evidence file:', err);
  }
}

const QR_BUCKET = env.qrCodes.bucket;

/**
 * Uploads a ticket's QR code to a PUBLIC bucket and returns a permanent
 * public URL. This is what actually goes in the ticket email's <img src> —
 * not a data: URI (Gmail strips those from message bodies) and not a cid
 * attachment reference (Brevo's transactional API doesn't support inline
 * images at all). A plain https:// image URL is the one approach that
 * reliably displays in every mail client, Gmail included.
 *
 * Safe to be public: the QR only encodes a link to the ticket's own public
 * info page, which requires no auth to view either.
 */
export async function uploadQrCode(filename, buffer) {
  const path = `tickets/${filename}`;
  const { error } = await supabase.storage.from(QR_BUCKET).upload(path, buffer, {
    contentType: 'image/png',
    upsert: true, // resending a ticket re-uploads the same filename — fine to overwrite
  });
  if (error) {
    throw new Error(`Failed to upload QR code: ${error.message}`);
  }
  const { data } = supabase.storage.from(QR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const BACKUP_BUCKET = env.backup.bucket;

/** Uploads a daily backup JSON snapshot to a private Supabase Storage bucket. */
export async function uploadBackup(filename, jsonString) {
  const path = `daily/${filename}`;
  const { error } = await supabase.storage.from(BACKUP_BUCKET).upload(path, Buffer.from(jsonString, 'utf-8'), {
    contentType: 'application/json',
    upsert: true, // safe to overwrite: filename already encodes the date, a re-run same day just refreshes it
  });
  if (error) {
    throw new Error(`Failed to upload backup: ${error.message}`);
  }
  return path;
}

/** Lists backup files, most recent first. */
export async function listBackupFiles() {
  const { data, error } = await supabase.storage.from(BACKUP_BUCKET).list('daily', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) {
    throw new Error(`Failed to list backups: ${error.message}`);
  }
  return (data || []).filter((f) => f.name.endsWith('.json'));
}

/** Short-lived signed URL so an admin can download a specific backup file. */
export async function getSignedBackupUrl(filename, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage.from(BACKUP_BUCKET).createSignedUrl(`daily/${filename}`, expiresInSeconds);
  if (error) {
    throw new Error(`Failed to create signed backup URL: ${error.message}`);
  }
  return data.signedUrl;
}
