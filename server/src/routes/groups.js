import { Router } from 'express';
import { GROUPS, getFlag } from '../../lib/matches-data.js';
import { fetchEspnStandings, fetchEspnMatches, computeStandings } from '../../lib/espn-api.js';
import { maybeAutoSync } from '../../lib/auto-sync.js';
import { getDb } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  maybeAutoSync().catch(() => {});

  try {
    let standingsMap;
    try {
      standingsMap = await fetchEspnStandings(GROUPS);
    } catch {
      const matches = await fetchEspnMatches();
      standingsMap = computeStandings(matches, GROUPS);
    }

    const groups = Object.entries(standingsMap).map(([letter, standings]) => ({
      letter,
      standings: standings.map(row => ({ ...row, flag: getFlag(row.team) })),
    }));

    return res.json({ groups, source: 'espn-live' });
  } catch (err) {
    console.error('[groups] ESPN fetch failed, falling back to local DB:', err.message);
    try {
      const db = getDb();
      const matches = db.prepare(
        "SELECT * FROM matches WHERE stage = 'group' ORDER BY match_time"
      ).all();

      function buildStandings(teams, dbMatches) {
        const table = {};
        for (const team of teams)
          table[team] = { team, flag: getFlag(team), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };

        for (const m of dbMatches) {
          if (!m.finished || m.home_score == null || m.away_score == null) continue;
          const h = m.home_team, a = m.away_team;
          if (!table[h] || !table[a]) continue;
          const hs = Number(m.home_score), as_ = Number(m.away_score);
          table[h].p++; table[a].p++;
          table[h].gf += hs; table[h].ga += as_;
          table[a].gf += as_; table[a].ga += hs;
          table[h].gd = table[h].gf - table[h].ga;
          table[a].gd = table[a].gf - table[a].ga;
          if (hs > as_) { table[h].w++; table[h].pts += 3; table[a].l++; }
          else if (hs < as_) { table[a].w++; table[a].pts += 3; table[h].l++; }
          else { table[h].d++; table[h].pts++; table[a].d++; table[a].pts++; }
        }
        return Object.values(table).sort((a, b) =>
          b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
        );
      }

      const groups = Object.entries(GROUPS).map(([letter, teams]) => {
        const groupMatches = matches.filter(m => m.group_name === letter);
        return { letter, standings: buildStandings(teams, groupMatches) };
      });

      return res.json({ groups, source: 'local-db' });
    } catch {
      return res.status(500).json({ error: 'Failed to load standings.' });
    }
  }
});

export default router;
