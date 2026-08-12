import rateLimit from 'express-rate-limit';
import { recordAudit } from '../utils/audit.js';

/**
 * Shared handler: every limiter below logs a RATE_LIMIT_EXCEEDED entry to
 * the audit trail before sending its response, so repeated hammering of an
 * endpoint (brute-forced logins, scraping, a broken client retry loop) shows
 * up in the security log instead of only living in ephemeral server logs.
 */
function withAuditLog(action, message) {
  return {
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    handler: (req, res /*, next, options */) => {
      recordAudit({
        actorType: 'system',
        action: 'RATE_LIMIT_EXCEEDED',
        metadata: { limiter: action, path: req.originalUrl, method: req.method, ip: req.ip },
      });
      res.status(429).json({ error: message });
    },
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  ...withAuditLog('login', 'Too many login attempts. Please try again in a few minutes.'),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  ...withAuditLog('forgot-password', 'Too many password reset requests. Please try again later.'),
});

export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  ...withAuditLog('registration', 'Too many registration attempts from this device. Please try again later.'),
});

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // organizers scan rapidly; generous but bounded
  ...withAuditLog('scan', 'Too many scan requests. Please slow down.'),
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  ...withAuditLog('global', 'Too many requests. Please slow down.'),
});
