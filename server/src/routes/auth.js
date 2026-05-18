import { Router } from 'express';
import { getDb } from '../../lib/db.js';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: false,
};

// GET /api/auth/me
router.get('/me', (req, res) => {
  const userId     = req.cookies.user_id;
  const adminToken = req.cookies.admin_token;

  if (!userId) return res.json({ user: null });

  const db   = getDb();
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(Number(userId));
  if (!user) return res.json({ user: null });

  res.json({
    user: { id: user.id, name: user.name, isAdmin: adminToken === 'valid' },
  });
});

// POST /api/auth/login   { name }
router.post('/login', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }

    const db      = getDb();
    const trimmed = name.trim();

    let user = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE').get(trimmed);
    if (!user) {
      const result = db.prepare('INSERT INTO users (name) VALUES (?)').run(trimmed);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
    }

    res.cookie('user_id', String(user.id), { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 90 * 1000 });
    res.json({ id: user.id, name: user.name });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('user_id', { path: '/' });
  res.clearCookie('admin_token', { path: '/' });
  res.json({ ok: true });
});

export default router;
