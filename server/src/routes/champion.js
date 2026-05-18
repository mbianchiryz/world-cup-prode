import { Router } from 'express';
import { getDb, isLocked, getFirstMatchTime, getChampion } from '../../lib/db.js';
import { ALL_TEAMS } from '../../lib/matches-data.js';

const router = Router();

function getUserId(req) {
  const val = req.cookies.user_id;
  return val ? Number(val) : null;
}

router.get('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

  const db        = getDb();
  const pred      = db.prepare('SELECT * FROM champion_predictions WHERE user_id = ?').get(userId);
  const firstMatch = getFirstMatchTime(db);
  const locked    = firstMatch ? isLocked(firstMatch) : false;
  const champion  = getChampion(db);

  res.json({
    prediction: pred ? pred.team : null,
    locked,
    lockTime: firstMatch
      ? new Date(new Date(firstMatch).getTime() - 60 * 60 * 1000).toISOString()
      : null,
    champion,
    teams: ALL_TEAMS,
  });
});

router.post('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

  const { team } = req.body || {};
  if (!team || !ALL_TEAMS.includes(team)) {
    return res.status(400).json({ error: 'Invalid team.' });
  }

  const db = getDb();
  const firstMatch = getFirstMatchTime(db);
  if (firstMatch && isLocked(firstMatch)) {
    return res.status(403).json({ error: 'Champion prediction is locked.' });
  }

  db.prepare(`
    INSERT INTO champion_predictions (user_id, team, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id)
    DO UPDATE SET team = excluded.team, updated_at = excluded.updated_at
  `).run(userId, team);

  res.json({ ok: true });
});

export default router;
