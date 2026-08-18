import { api } from './client.js';

export function getStats() {
  return api.get('/admin/stats');
}

export function listRegistrations(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))
  ).toString();
  return api.get(`/admin/registrations${query ? `?${query}` : ''}`);
}

export function getRegistrationDetail(id) {
  return api.get(`/admin/registrations/${id}`);
}

export function approveRegistration(id) {
  return api.post(`/admin/registrations/${id}/approve`);
}

export function rejectRegistration(id, reason) {
  return api.post(`/admin/registrations/${id}/reject`, { reason });
}

export function resendTicket(id) {
  return api.post(`/admin/registrations/${id}/resend-ticket`);
}

export function deleteRegistration(id) {
  return api.delete(`/admin/registrations/${id}`);
}

export function listAttendance(search = '', gate = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (gate) params.set('gate', gate);
  const query = params.toString();
  return api.get(`/admin/attendees${query ? `?${query}` : ''}`);
}

export function exportAttendeesCsvUrl() {
  return `${api.baseUrl}/api/admin/export/attendees.csv`;
}

export function getEvidenceUrl(registrationId) {
  return api.get(`/admin/registrations/${registrationId}/evidence`);
}

export function listAuditLog(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api.get(`/admin/audit-log${query ? `?${query}` : ''}`);
}

export function auditLogExportUrl() {
  return `${api.baseUrl}/api/admin/audit-log/export.csv`;
}

export function listBackups() {
  return api.get('/admin/backups');
}

export function runBackupNow() {
  return api.post('/admin/backups/run');
}
