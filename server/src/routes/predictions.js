import { Router } from 'express';
import { supabaseAdmin, verifyUser } from '../../lib/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });

  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select('*')
    .eq('user_id', user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ predictions: data || [] });
});

router.post('/', async (req, res) => {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });

  const { matchId, homeScore, awayScore } = req.body || {};
  if (homeScore == null || awayScore == null || homeScore < 0 || awayScore < 0) {
    return res.status(400).json({ error: 'Puntaje inválido.' });
  }

  // Check match exists and is not locked
  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match) return res.status(404).json({ error: 'Partido no encontrado.' });

  const lockTime = new Date(match.match_time).getTime() - 5 * 60 * 1000;
  if (Date.now() >= lockTime) return res.status(403).json({ error: 'El partido ya cerró.' });

  if (match.home_team === 'TBD' || match.away_team === 'TBD') {
    return res.status(400).json({ error: 'Los equipos aún no están confirmados.' });
  }

  const { error } = await supabaseAdmin
    .from('predictions')
    .upsert(
      { user_id: user.id, match_id: matchId, home_score: homeScore, away_score: awayScore, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,match_id' }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
