import { Router } from 'express';
import { getDb } from '../../lib/db.js';

const router = Router();

function isAdmin(req) {
  return req.cookies.admin_token === 'valid';
}

const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: false,
  maxAge: 60 * 60 * 8 * 1000,
};

// POST: update a match's result
router.post('/', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized.' });

  const { matchId, homeScore, awayScore, winner, finished } = req.body || {};
  if (matchId == null) return res.status(400).json({ error: 'matchId is required.' });

  const db    = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });

  const autoWinner =
    winner ||
    (homeScore != null && awayScore != null
      ? homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : null
      : null);

  db.prepare(`
    UPDATE matches SET home_score = ?, away_score = ?, winner = ?, finished = ? WHERE id = ?
  `).run(homeScore ?? null, awayScore ?? null, autoWinner, finished ? 1 : 0, matchId);

  res.json({ ok: true });
});

// PUT: update KO match teams
router.put('/', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized.' });

  const { matchId, homeTeam, awayTeam } = req.body || {};
  if (!matchId) return res.status(400).json({ error: 'matchId is required.' });

  const db = getDb();
  db.prepare('UPDATE matches SET home_team = ?, away_team = ? WHERE id = ?')
    .run(homeTeam || 'TBD', awayTeam || 'TBD', matchId);

  res.json({ ok: true });
});

// PATCH: admin login (password)
router.patch('/', (req, res) => {
  const { password } = req.body || {};
  const adminPass = process.env.ADMIN_PASSWORD || 'admin2026';
  if (password !== adminPass) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  res.cookie('admin_token', 'valid', ADMIN_COOKIE_OPTS);
  res.json({ ok: true });
});

export default router;
