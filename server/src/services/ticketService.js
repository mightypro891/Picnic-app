import { db } from '../config/db.js';
import { generateId, generateTicketCode, generateTicketToken } from '../utils/tokens.js';

/** Creates a ticket row for a just-approved registration. */
export async function issueTicket(registrationId) {
  // Retry on the (astronomically unlikely) chance of a ticket code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const ticket = {
        id: generateId('tkt'),
        ticket_code: generateTicketCode(),
        token: generateTicketToken(),
        registration_id: registrationId,
      };
      await db.query(
        `INSERT INTO tickets (id, ticket_code, token, registration_id, status)
         VALUES ($1, $2, $3, $4, 'VALID')`,
        [ticket.id, ticket.ticket_code, ticket.token, ticket.registration_id]
      );
      return ticket;
    } catch (err) {
      if (err.code === '23505') continue; // unique_violation — try a fresh code
      throw err;
    }
  }
  throw new Error('Could not generate a unique ticket after several attempts.');
}

export async function findTicketByToken(token) {
  const { rows } = await db.query(
    `SELECT t.*, r.full_name, r.level, r.matric_number, r.status AS registration_status
     FROM tickets t
     JOIN registrations r ON r.id = t.registration_id
     WHERE t.token = $1`,
    [token]
  );
  return rows[0] || null;
}

export async function findTicketByCode(ticketCode) {
  const { rows } = await db.query(
    `SELECT t.*, r.full_name, r.level, r.matric_number, r.status AS registration_status
     FROM tickets t
     JOIN registrations r ON r.id = t.registration_id
     WHERE t.ticket_code ILIKE $1`,
    [ticketCode]
  );
  return rows[0] || null;
}

/**
 * Atomically checks a ticket in. A single conditional UPDATE guarded by the
 * current status means concurrent scans of the same ticket can only ever
 * have one winner — Postgres row-level locking makes this statement atomic,
 * so two simultaneous scans can't both "succeed".
 */
export async function checkInTicket(ticketId, adminId, gate = null) {
  // The WHERE status = 'VALID' guard is what makes this safe across
  // multiple gates: every gate runs this same conditional UPDATE against
  // the one shared tickets table, so Postgres row-level locking guarantees
  // only the first gate to reach a given ticket can ever flip it to
  // CHECKED_IN — a second gate scanning the same QR code a moment later
  // (or at the exact same instant) always loses the race and gets 0 rows
  // affected, which the caller reports as ALREADY_CHECKED_IN.
  const { rowCount } = await db.query(
    `UPDATE tickets
     SET status = 'CHECKED_IN', checked_in_at = now(), checked_in_by = $1, checked_in_gate = $2
     WHERE id = $3 AND status = 'VALID'`,
    [adminId, gate || null, ticketId]
  );
  return rowCount === 1;
}
