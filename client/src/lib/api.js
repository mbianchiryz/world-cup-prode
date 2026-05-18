/**
 * Fetch wrapper that always includes cookies. Falls back to demo mode
 * (mock data) automatically when no backend is reachable.
 */
import { demoResponse } from './mock-data';

const BASE = import.meta.env.VITE_API_URL || '';

let _demoMode = null;

async function isDemoMode() {
  if (_demoMode !== null) return _demoMode;
  try {
    const res = await fetch(BASE + '/api/health', { credentials: 'include' });
    _demoMode = !res.ok;
  } catch {
    _demoMode = true;
  }
  if (_demoMode) console.warn('[api] No backend reachable — running in demo mode.');
  return _demoMode;
}

async function request(path, opts = {}) {
  if (await isDemoMode()) return demoResponse(path, opts);

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
  get:   (p)       => request(p),
  post:  (p, body) => request(p, { method: 'POST',  body: JSON.stringify(body ?? {}) }),
  put:   (p, body) => request(p, { method: 'PUT',   body: JSON.stringify(body ?? {}) }),
  patch: (p, body) => request(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};
