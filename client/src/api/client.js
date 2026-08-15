const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    credentials: 'include',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
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
