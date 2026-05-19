import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabase.js';
import { maybeAutoSync } from '../../lib/auto-sync.js';

const router = Router();

router.get('/', async (_req, res) => {
  await maybeAutoSync().catch(() => {});

  const { data: matches, error } = await supabaseAdmin
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ matches: matches || [] });
});

export default router;
