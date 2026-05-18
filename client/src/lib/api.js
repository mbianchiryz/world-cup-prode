/**
 * Fetch wrapper that always includes cookies (for cross-origin auth in dev).
 * In production behind a reverse proxy / same origin, same-origin requests also work.
 */
const BASE = ''; // dev: Vite proxies /api → :4000

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get:   (p)          => request(p),
  post:  (p, body)    => request(p, { method: 'POST',  body: JSON.stringify(body ?? {}) }),
  put:   (p, body)    => request(p, { method: 'PUT',   body: JSON.stringify(body ?? {}) }),
  patch: (p, body)    => request(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};
