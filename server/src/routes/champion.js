import { Router } from 'express';
import { supabaseAdmin, verifyUser } from '../../lib/supabase.js';
import { ALL_TEAMS } from '../../lib/matches-data.js';

const router = Router();

/** Returns ISO string 1 hour before first match, or null */
async function getFirstMatchLockTime() {
  const { data } = await supabaseAdmin
    .from('matches')
    .select('match_time')
    .order('match_time', { ascending: true })
    .limit(1)
    .single();
  if (!data?.match_time) return null;
  return new Date(new Date(data.match_time).getTime() - 60 * 60 * 1000).toISOString();
}

/** Returns the champion team name once the Final has a result, otherwise null */
async function getChampion() {
  // Check settings table first (manual override)
  const { data: setting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'champion')
    .single();
  if (setting?.value) return setting.value;

  // Otherwise derive from the final match result
  const { data: final } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('stage', 'final')
    .eq('finished', true)
    .single();
  if (!final) return null;
  if (final.winner === 'home') return final.home_team;
  if (final.winner === 'away') return final.away_team;
  if (Number(final.home_score) > Number(final.away_score)) return final.home_team;
  if (Number(final.away_score) > Number(final.home_score)) return final.away_team;
  return null;
}

router.get('/', async (req, res) => {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });

  const [lockTimeISO, champion] = await Promise.all([
    getFirstMatchLockTime(),
    getChampion(),
  ]);

  const locked = lockTimeISO ? Date.now() >= new Date(lockTimeISO).getTime() : false;

  const { data: pred } = await supabaseAdmin
    .from('champion_predictions')
    .select('team')
    .eq('user_id', user.id)
    .single();

  res.json({
    prediction: pred?.team || null,
    locked,
    lockTime: lockTimeISO,
    champion,
    teams: ALL_TEAMS,
  });
});

router.post('/', async (req, res) => {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });

  const { team } = req.body || {};
  if (!team || !ALL_TEAMS.includes(team)) {
    return res.status(400).json({ error: 'Invalid team.' });
  }

  const lockTimeISO = await getFirstMatchLockTime();
  if (lockTimeISO && Date.now() >= new Date(lockTimeISO).getTime()) {
    return res.status(403).json({ error: 'Champion prediction is locked.' });
  }

  const { error } = await supabaseAdmin
    .from('champion_predictions')
    .upsert(
      { user_id: user.id, team, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
