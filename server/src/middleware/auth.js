import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../config/db.js';

/**
 * Requires a valid admin session (JWT in an httpOnly cookie). Attaches
 * req.admin = { id, name, email, role } on success.
 */
export async function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const { rows } = await db.query('SELECT id, name, email, role FROM admins WHERE id = $1', [payload.sub]);
    if (!rows[0]) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    req.admin = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}
