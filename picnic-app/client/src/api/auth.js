import { api } from './client.js';

export function login(email, password) {
  return api.post('/auth/login', { email, password });
}

export function logout() {
  return api.post('/auth/logout');
}

export function me() {
  return api.get('/auth/me');
}

export function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

export function resetPassword(token, password) {
  return api.post('/auth/reset-password', { token, password });
}
