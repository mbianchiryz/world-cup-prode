import { Router } from 'express';
import { getDb, getChampion } from '../../lib/db.js';
import { calcScore } from '../../lib/scoring.js';
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

export default router;
