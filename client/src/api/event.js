import { api } from './client.js';

export function getEvent() {
  return api.get('/event');
}
