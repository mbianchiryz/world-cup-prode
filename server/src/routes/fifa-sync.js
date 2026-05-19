import { Router } from 'express';
import { verifyUser } from '../../lib/supabase.js';
import { forceSync } from '../../lib/auto-sync.js';

const router = Router();

router.post('/', async (req, res) => {
  const user = await verifyUser(req);
  if (!user?.is_admin) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  try {
    const result = await forceSync();
    res.json(result);
  } catch (err) {
    console.error('[fifa-sync]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
