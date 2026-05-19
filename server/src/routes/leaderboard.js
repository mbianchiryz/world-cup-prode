import { Router } from 'express';
import { getDb, getChampion } from '../../lib/db.js';
import { calcScore, calcMatchPoints } from '../../lib/scoring.js';
import { maybeAutoSync } from '../../lib/auto-sync.js';

const router = Router();

router.get('/', async (_req, res) => {
  await maybeAutoSync().catch(() => {});

  const db       = getDb();
  const users    = db.prepare('SELECT id, name FROM users ORDER BY name ASC').all();
  const matches  = db.prepare('SELECT * FROM matches').all();
  const champion = getChampion(db);

  const allPredictions = db.prepare('SELECT * FROM predictions').all();
  const allChampPreds  = db.prepare('SELECT * FROM champion_predictions').all();

  const standings = users.map((user) => {
    const predictions  = allPredictions.filter((p) => p.user_id === user.id);
    const championPred = allChampPreds.find((c) => c.user_id === user.id) || null;
    const score        = calcScore({ predictions, matches, championPred, champion });
    return {
      id: user.id,
      name: user.name,
      pickedChampion: championPred?.team || null,
      ...score,
    };
  });

  standings.sort((a, b) => b.total - a.total || b.exact - a.exact);
  res.json({ standings, champion });
});

// GET /api/leaderboard/user/:userId — predictions on FINISHED matches only (public, no auth required)
router.get('/user/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Invalid user id' });

  const db = getDb();

  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Only finished matches
  const finishedMatches = db.prepare('SELECT * FROM matches WHERE finished = 1 ORDER BY match_time ASC').all();

  // This user's predictions (we then filter to finished matches client-side)
  const predictions = db.prepare('SELECT * FROM predictions WHERE user_id = ?').all(userId);

  const picks = finishedMatches.map((m) => {
    const pred = predictions.find((p) => p.match_id === m.id) || null;
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

  res.json({ user, picks });
});

export default router;
