import { demoResponse } from './mock-data';
import { supabase } from './supabase';

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
  if (_demoMode) console.warn('[api] No backend — demo mode.');
  return _demoMode;
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request(path, opts = {}) {
  if (await isDemoMode()) return demoResponse(path, opts);

  const authHeader = await getAuthHeader();
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(opts.headers || {}) },
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
