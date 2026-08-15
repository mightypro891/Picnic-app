import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: env.databaseUrl,
  // Supabase's pooled connection requires SSL; this accepts their managed
  // certificate chain without needing a locally bundled CA file.
  ssl: { rejectUnauthorized: false },
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  reset_token_hash TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Added after the initial release — kept as ALTERs (not just in the CREATE
-- TABLE above) so this schema stays safe to run against a database that was
-- already provisioned before these columns existed.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  matric_number_normalized TEXT NOT NULL,
  level TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  payment_evidence_path TEXT NOT NULL,
  payment_evidence_original_name TEXT NOT NULL,
  payment_evidence_mime TEXT NOT NULL,
  evidence_sha256 TEXT,
  duplicate_of_registration_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  access_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_matric_active
  ON registrations(matric_number_normalized)
  WHERE status IN ('PENDING', 'APPROVED');

-- Added after the initial release — kept as ALTERs (not just in the CREATE
-- TABLE above) so this stays safe to run against a database that was
-- already provisioned before duplicate-receipt detection existed.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS evidence_sha256 TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS duplicate_of_registration_id TEXT;
CREATE INDEX IF NOT EXISTS idx_registrations_evidence_sha256 ON registrations(evidence_sha256);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_email_active
  ON registrations(email_normalized)
  WHERE status IN ('PENDING', 'APPROVED');

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  registration_id TEXT NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'VALID',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  checked_in_by TEXT,
  checked_in_gate TEXT
);

-- Added after the initial release — kept as an ALTER (not just in the
-- CREATE TABLE above) so this stays safe to run against a database that
-- was already provisioned before multi-gate check-in existed.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in_gate TEXT;

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
`;

/** Creates all tables/indexes if they don't already exist. Safe to run on every boot. */
export async function initDb() {
  await db.query(SCHEMA);
}
