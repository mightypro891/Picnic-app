import { db } from '../config/db.js';
import { generateId } from './tokens.js';

/**
 * Records an audit trail entry. Fire-and-forget — never awaited by callers,
 * and never throws, so a logging hiccup can't block the primary action
 * (approval, check-in, etc).
 */
export function recordAudit({ actorType, actorId = null, action, targetType = null, targetId = null, metadata = null }) {
  db.query(
    `INSERT INTO audit_log (id, actor_type, actor_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [generateId('aud'), actorType, actorId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null]
  ).catch((err) => console.error('Failed to write audit log entry:', err));
}
