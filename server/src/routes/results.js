import { Router } from 'express';
import { supabaseAdmin, verifyUser } from '../../lib/supabase.js';

const router = Router();

async function isAdmin(req) {
  const user = await verifyUser(req);
  return user?.is_admin === true;
}

// POST: update a match's result
router.post('/', async (req, res) => {
  if (!(await isAdmin(req))) return res.status(403).json({ error: 'Unauthorized.' });

  const { matchId, homeScore, awayScore, winner, finished } = req.body || {};
  if (matchId == null) return res.status(400).json({ error: 'matchId is required.' });

  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (!match) return res.status(404).json({ error: 'Match not found.' });

  const autoWinner =
    winner ||
    (homeScore != null && awayScore != null
      ? homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : null
      : null);

  const { error } = await supabaseAdmin
    .from('matches')
    .update({
      home_score: homeScore ?? null,
      away_score: awayScore ?? null,
      winner: autoWinner,
      finished: finished ? true : false,
    })
    .eq('id', matchId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// PUT: update KO match teams
router.put('/', async (req, res) => {
  if (!(await isAdmin(req))) return res.status(403).json({ error: 'Unauthorized.' });

  const { matchId, homeTeam, awayTeam } = req.body || {};
  if (!matchId) return res.status(400).json({ error: 'matchId is required.' });

  const { error } = await supabaseAdmin
    .from('matches')
    .update({ home_team: homeTeam || 'TBD', away_team: awayTeam || 'TBD' })
    .eq('id', matchId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH: kept for backward compat but admin is now determined by profiles.is_admin
// This endpoint is no longer needed with Supabase auth, but kept to avoid 404s
router.patch('/', async (_req, res) => {
  res.status(410).json({ error: 'Admin login via password is no longer supported. Use Google OAuth.' });
});

export default router;
