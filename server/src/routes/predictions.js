import { Router } from 'express';
import { getDb, isLocked } from '../../lib/db.js';

const router = Router();

function getUserId(req) {
  const val = req.cookies.user_id;
  return val ? Number(val) : null;
}

router.get('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado.' });
  const db = getDb();
  const predictions = db.prepare('SELECT * FROM predictions WHERE user_id = ?').all(userId);
  res.json({ predictions });
});

router.post('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado.' });

  const { matchId, homeScore, awayScore } = req.body || {};
  if (homeScore == null || awayScore == null || homeScore < 0 || awayScore < 0) {
    return res.status(400).json({ error: 'Puntaje inválido.' });
  }

  const db    = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado.' });

  if (isLocked(match.match_time)) {
    return res.status(403).json({ error: 'El partido ya cerró.' });
  }

  if (match.home_team === 'A definir' || match.away_team === 'A definir') {
    return res.status(400).json({ error: 'Los equipos aún no están confirmados.' });
  }

  db.prepare(`
    INSERT INTO predictions (user_id, match_id, home_score, away_score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET home_score = excluded.home_score, away_score = excluded.away_score, updated_at = excluded.updated_at
  `).run(userId, matchId, homeScore, awayScore);

  res.json({ ok: true });
});

export default router;
