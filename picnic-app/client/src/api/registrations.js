import { api } from './client.js';

export function submitRegistration(formData) {
  return api.post('/registrations', formData, { isForm: true });
}

export function getMyRegistration(accessToken) {
  return api.get(`/registrations/${accessToken}`);
}
