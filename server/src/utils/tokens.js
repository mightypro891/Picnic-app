import { customAlphabet, nanoid } from 'nanoid';

// Unambiguous alphabet (no 0/O, 1/I) for human-facing ticket codes.
const ticketAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ticketSuffix = customAlphabet(ticketAlphabet, 6);

/** Human-facing ticket code, e.g. PIC-7X92KQ. Not secret — safe to display. */
export function generateTicketCode() {
  return `PIC-${ticketSuffix()}`;
}

/**
 * Long, cryptographically random, unguessable token. This is what actually
 * gets encoded in the QR code. The server looks it up on scan; the token
 * alone proves nothing about payment or approval without a DB check.
 */
export function generateTicketToken() {
  return nanoid(48);
}

/** Opaque token used for a student's private "view my ticket" link. */
export function generateAccessToken() {
  return nanoid(40);
}

export function generateId(prefix) {
  return `${prefix}_${nanoid(20)}`;
}
