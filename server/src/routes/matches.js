import { Router } from 'express';
import { getDb } from '../../lib/db.js';
import { maybeAutoSync } from '../../lib/auto-sync.js';

const router = Router();

router.get('/', async (_req, res) => {
  await maybeAutoSync().catch(() => {});
  const db = getDb();
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_time ASC').all();
  res.json({ matches });
});

export default router;
