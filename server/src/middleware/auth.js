import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../config/db.js';

/**
 * Requires a valid admin session. Accepts the token from either:
 *  - an httpOnly cookie (original approach, still works fine on browsers
 *    that handle cross-site cookies normally), or
 *  - an `Authorization: Bearer <token>` header (used as the primary method
 *    now, since Safari on iOS applies strict cross-site cookie rules that
 *    can silently drop the cookie when the frontend and API are on
 *    different domains — a header has no such restriction).
 * Attaches req.admin = { id, name, email, role } on success.
 */
export async function requireAdmin(req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = headerToken || req.cookies?.admin_session;

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
