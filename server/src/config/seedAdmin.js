import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { env } from './env.js';
import { generateId } from '../utils/tokens.js';

/**
 * Ensures the permanent admin account defined by FIRST_ADMIN_EMAIL /
 * FIRST_ADMIN_PASSWORD exists. Runs automatically on every server boot so a
 * fresh deploy (new Render instance, new Supabase project, etc.) always has
 * a working admin login without anyone needing to remember to run
 * `npm run create-admin` by hand.
 *
 * Safe to run every time: it only INSERTs when no admin with that email
 * exists yet. It never overwrites an existing admin's password, so if that
 * password is later changed (e.g. via the reset-password flow) this won't
 * silently revert it back on the next deploy.
 */
export async function seedFirstAdmin() {
  const { name, email, password } = env.firstAdmin;

  if (!email || !password) {
    console.warn('[seedAdmin] FIRST_ADMIN_EMAIL/FIRST_ADMIN_PASSWORD not set — skipping permanent admin seed.');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { rows } = await db.query('SELECT id FROM admins WHERE email = $1', [normalizedEmail]);
  if (rows[0]) {
    return; // Already exists — leave it (and its current password) alone.
  }

  if (password.length < 10) {
    console.warn('[seedAdmin] FIRST_ADMIN_PASSWORD is shorter than 10 characters — skipping seed for safety.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO admins (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'admin')`,
    [generateId('adm'), name, normalizedEmail, passwordHash]
  );

  console.log(`[seedAdmin] Permanent admin account ready for ${normalizedEmail}.`);
}
