const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'picnic_admin_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // localStorage can throw in some private-browsing contexts
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // If storage isn't available, the cookie fallback (for browsers that
    // support it) is still in play server-side — nothing more we can do here.
  }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const token = getStoredToken();
  const headers = isForm ? {} : { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body (e.g. CSV download) — handled by caller via res
  }

  if (!res.ok) {
    const error = new Error(data?.error || 'Request failed.');
    error.status = res.status;
    error.fields = data?.fields;
    error.payload = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  delete: (path) => request(path, { method: 'DELETE' }),
  baseUrl: BASE_URL,
};
