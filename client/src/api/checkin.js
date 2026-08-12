import { api } from './client.js';

export function scanTicket(token, gate) {
  return api.post('/checkin/scan', { token, gate });
}

export function manualLookup(ticketCode, gate) {
  return api.post('/checkin/manual', { ticketCode, gate });
}

export function getGateStats() {
  return api.get('/checkin/gate-stats');
}
