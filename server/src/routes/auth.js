import { Router } from 'express';
import { verifyUser } from '../../lib/supabase.js';

const router = Router();

// GET /api/auth/me — verifies Supabase JWT, returns user profile (backward compat)
router.get('/me', async (req, res) => {
  const user = await verifyUser(req);
  if (!user) return res.json({ user: null });

  res.json({
    user: {
      id:      user.id,
      name:    user.name || user.email?.split('@')[0] || 'User',
      email:   user.email,
      isAdmin: user.is_admin === true,
    },
  });
});

// POST /api/auth/login — no longer used (OAuth flow is client-side via Supabase)
router.post('/login', (_req, res) => {
  res.status(410).json({ error: 'Cookie-based login is no longer supported. Use Google OAuth.' });
});

// POST /api/auth/logout — no longer needed (Supabase client handles sign-out)
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

export default router;
