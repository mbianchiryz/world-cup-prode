import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabase.js';
import { calcScore, calcMatchPoints } from '../../lib/scoring.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [
    { data: profiles },
    { data: matches },
    { data: allPreds },
    { data: champPreds },
    { data: settings },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.from('matches').select('*'),
    supabaseAdmin.from('predictions').select('*'),
    supabaseAdmin.from('champion_predictions').select('*'),
    supabaseAdmin.from('settings').select('value').eq('key', 'champion').single(),
  ]);

  const champion = settings?.value || null;

  const standings = (profiles || []).map((user) => {
    const predictions  = (allPreds || []).filter((p) => p.user_id === user.id);
    const championPred = (champPreds || []).find((c) => c.user_id === user.id) || null;
    const score        = calcScore({ predictions, matches: matches || [], championPred, champion });
    return {
      id: user.id,
      name: user.name || user.email?.split('@')[0],
      pickedChampion: championPred?.team || null,
      ...score,
    };
  });

  standings.sort((a, b) => b.total - a.total || b.exact - a.exact);
  res.json({ standings, champion });
});

// GET /api/leaderboard/user/:userId — predictions on FINISHED matches only (public, no auth required)
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  const [{ data: profile }, { data: finishedMatches }, { data: predictions }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
    supabaseAdmin.from('matches').select('*').eq('finished', true).order('match_time'),
    supabaseAdmin.from('predictions').select('*').eq('user_id', userId),
  ]);

  if (!profile) return res.status(404).json({ error: 'User not found' });

  const picks = (finishedMatches || []).map((m) => {
    const pred   = (predictions || []).find((p) => p.match_id === m.id) || null;
    const points = pred ? calcMatchPoints(pred, m) : null;
    return {
      match_id:   m.id,
      home_team:  m.home_team,
      away_team:  m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      match_time: m.match_time,
      stage:      m.stage,
      group_name: m.group_name,
      pred_home:  pred?.home_score ?? null,
      pred_away:  pred?.away_score ?? null,
      points,
    };
  });

  res.json({ user: profile, picks });
});

export default router;
