import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { recordAudit } from '../utils/audit.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_MINUTES = 30;
const MIN_PASSWORD_LENGTH = 10;

/** SHA-256 hex digest. Only the hash is stored — the raw token (the one
 * emailed to the admin) never touches the database, so a DB leak alone
 * can't be used to reset anyone's password. */
function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Step 1 of the reset flow: admin submits their email, we email them a
 * one-time link if that email matches an account. Always responds with the
 * same generic message regardless of whether the email exists, so this
 * endpoint can't be used to enumerate admin accounts.
 */
export async function forgotPassword(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const genericResponse = {
    message: 'If that email belongs to an admin account, a password reset link has been sent to it.',
  };

  if (!email || !validator.isEmail(email)) {
    return res.status(200).json(genericResponse);
  }

  const { rows } = await db.query('SELECT id, name, email FROM admins WHERE email = $1', [email]);
  const admin = rows[0];

  if (admin) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

    await db.query('UPDATE admins SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3', [
      tokenHash,
      expires,
      admin.id,
    ]);

    const resetUrl = `${env.clientBaseUrl.replace(/\/$/, '')}/admin/reset-password?token=${rawToken}`;

    sendPasswordResetEmail({ to: admin.email, name: admin.name, resetUrl }).catch((err) =>
      console.error('Failed to send password reset email:', err)
    );

    recordAudit({
      actorType: 'admin',
      actorId: admin.id,
      action: 'PASSWORD_RESET_REQUESTED',
    });
  }

  return res.status(200).json(genericResponse);
}

/** Step 2: admin follows the emailed link and submits a new password with the token. */
export async function resetPassword(req, res) {
  const rawToken = (req.body.token || '').trim();
  const newPassword = req.body.password || '';

  if (!rawToken) {
    return res.status(400).json({ error: 'Reset link is missing its token.' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  const tokenHash = hashResetToken(rawToken);

  const { rows } = await db.query(
    `SELECT id FROM admins WHERE reset_token_hash = $1 AND reset_token_expires > now()`,
    [tokenHash]
  );
  const admin = rows[0];

  if (!admin) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.query(
    `UPDATE admins
     SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL,
         failed_login_attempts = 0, locked_until = NULL
     WHERE id = $2`,
    [passwordHash, admin.id]
  );

  recordAudit({
    actorType: 'admin',
    actorId: admin.id,
    action: 'PASSWORD_RESET_COMPLETED',
  });

  return res.status(200).json({ message: 'Your password has been reset. You can now log in.' });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'none',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  };
}

export async function login(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!email || !validator.isEmail(email) || !password) {
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }

  const { rows } = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
  const admin = rows[0];

  // Constant-shape response whether or not the account exists, to avoid
  // leaking which emails are registered admins.
  const genericError = { error: 'Invalid email or password.' };

  if (!admin) {
    return res.status(401).json(genericError);
  }

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    return res.status(423).json({
      error: 'This account is temporarily locked due to repeated failed logins. Try again later.',
    });
  }

  const passwordOk = await bcrypt.compare(password, admin.password_hash);

  if (!passwordOk) {
    const attempts = admin.failed_login_attempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;

    await db.query('UPDATE admins SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3', [
      attempts,
      lockedUntil,
      admin.id,
    ]);

    recordAudit({ actorType: 'admin', actorId: admin.id, action: 'LOGIN_FAILED' });
    return res.status(401).json(genericError);
  }

  await db.query('UPDATE admins SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [admin.id]);

  const token = jwt.sign({ sub: admin.id, role: admin.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  res.cookie('admin_session', token, cookieOptions());
  recordAudit({ actorType: 'admin', actorId: admin.id, action: 'LOGIN_SUCCESS' });

  res.json({
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    // Also returned directly in the body (not just the cookie) so the
    // client can store it and send it as an Authorization header — needed
    // because Safari on iOS can silently drop cross-site cookies when the
    // frontend and API live on different domains, which otherwise breaks
    // login entirely on iPhones.
    token,
  });
}

export function logout(req, res) {
  res.clearCookie('admin_session', cookieOptions());
  res.json({ success: true });
}

export function me(req, res) {
  res.json({ admin: req.admin });
}
