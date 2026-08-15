import { db } from '../config/db.js';
import { findTicketByToken, findTicketByAccessToken, findTicketByCode, checkInTicket } from '../services/ticketService.js';
import { recordAudit } from '../utils/audit.js';

/**
 * The QR code now encodes a full ticket-page URL (e.g.
 * https://your-app.com/ticket/<accessToken>) so that scanning it with any
 * ordinary phone camera opens a page showing the attendee's own info. The
 * admin Scanner reads that same QR, so this pulls the access token back out
 * of the URL — falling back to treating the raw scanned text as the token
 * directly, for tickets issued before this URL format existed.
 */
function extractAccessToken(scannedText) {
  const trimmed = (scannedText || '').trim();
  const match = trimmed.match(/\/ticket\/([^/?#]+)/);
  return match ? match[1] : trimmed;
}

function buildResult(ticket) {
  return {
    fullName: ticket.full_name,
    level: ticket.level,
    matricNumber: ticket.matric_number,
    ticketCode: ticket.ticket_code,
    checkedInAt: ticket.checked_in_at,
    checkedInGate: ticket.checked_in_gate || null,
  };
}

function sanitizeGate(rawGate) {
  const gate = (rawGate || '').trim().slice(0, 40);
  return gate || 'Unspecified Gate';
}

async function verifyAndCheckIn(ticket, adminId, gate, res) {
  if (!ticket || ticket.registration_status !== 'APPROVED') {
    return res.status(404).json({ result: 'INVALID', message: 'This QR code is not recognized.' });
  }

  if (ticket.status === 'CHECKED_IN') {
    return res.status(200).json({
      result: 'ALREADY_CHECKED_IN',
      message: ticket.checked_in_gate
        ? `This ticket was already used at ${ticket.checked_in_gate}.`
        : 'This ticket was already used.',
      ticket: buildResult(ticket),
    });
  }

  if (ticket.status === 'VOID') {
    return res.status(404).json({ result: 'INVALID', message: 'This ticket has been voided.' });
  }

  const success = await checkInTicket(ticket.id, adminId, gate);

  if (!success) {
    // Lost a race to a concurrent scan of the same ticket — possibly from a
    // different gate — between our read and write. Re-fetch to report the
    // accurate (already-checked-in, at whichever gate actually won) state.
    const latest = (await findTicketByToken(ticket.token)) || ticket;
    return res.status(200).json({
      result: 'ALREADY_CHECKED_IN',
      message: latest.checked_in_gate
        ? `This ticket was already used at ${latest.checked_in_gate}.`
        : 'This ticket was already used.',
      ticket: buildResult(latest),
    });
  }

  recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'CHECK_IN',
    targetType: 'ticket',
    targetId: ticket.id,
    metadata: { gate },
  });

  const latest = await findTicketByToken(ticket.token);
  return res.status(200).json({
    result: 'VALID',
    message: 'Check-in successful.',
    ticket: buildResult(latest),
  });
}

export async function scanTicket(req, res) {
  const rawText = (req.body.token || '').trim();
  const gate = sanitizeGate(req.body.gate);
  if (!rawText) return res.status(400).json({ result: 'INVALID', message: 'No QR data received.' });

  const accessToken = extractAccessToken(rawText);
  let ticket = await findTicketByAccessToken(accessToken);
  if (!ticket) {
    // Fall back to the old raw-token format, for any ticket issued before this change.
    ticket = await findTicketByToken(rawText);
  }
  return verifyAndCheckIn(ticket, req.admin.id, gate, res);
}

export async function manualLookup(req, res) {
  const ticketCode = (req.body.ticketCode || '').trim();
  const gate = sanitizeGate(req.body.gate);
  if (!ticketCode) return res.status(400).json({ result: 'INVALID', message: 'Enter a ticket ID.' });

  const ticket = await findTicketByCode(ticketCode);
  return verifyAndCheckIn(ticket, req.admin.id, gate, res);
}

export async function listAttendance(req, res) {
  const { search = '', gate = '' } = req.query;

  const { rows } = await db.query(
    `SELECT r.full_name, r.matric_number, r.level, t.ticket_code, t.checked_in_at, t.checked_in_gate, t.status
     FROM tickets t
     JOIN registrations r ON r.id = t.registration_id
     WHERE t.status = 'CHECKED_IN'
       AND ($1 = '' OR r.full_name ILIKE $2 OR r.matric_number ILIKE $2 OR t.ticket_code ILIKE $2)
       AND ($3 = '' OR t.checked_in_gate = $3)
     ORDER BY t.checked_in_at DESC`,
    [search, `%${search}%`, gate]
  );

  res.json({ attendees: rows });
}

/** Per-gate check-in counts, for the "which gate is busiest" view on the dashboard. */
export async function listGateStats(req, res) {
  const { rows } = await db.query(
    `SELECT COALESCE(checked_in_gate, 'Unspecified Gate') AS gate, COUNT(*) AS count
     FROM tickets
     WHERE status = 'CHECKED_IN'
     GROUP BY gate
     ORDER BY count DESC`
  );
  res.json({ gates: rows.map((r) => ({ gate: r.gate, count: Number(r.count) })) });
}
