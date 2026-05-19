/**
 * Mock data used when no backend is available (e.g. when the app is deployed
 * to Amplify without a paired backend). Lets every page render convincingly
 * for layout review.
 */

import { getMatchesData, getFlag, GROUPS, ALL_TEAMS } from './matches-data';

// ── Mock matches with some Matchday 1 results filled in ─────────────────────
const FINISHED_RESULTS = {
  1:  [3, 1],   // Mexico vs South Africa
  2:  [2, 0],   // Korea Republic vs Czechia
  3:  [1, 1],   // Canada vs Bosnia
  4:  [4, 2],   // USA vs Paraguay
  5:  [0, 2],   // Haiti vs Scotland
  6:  [1, 1],   // Australia vs Türkiye
  7:  [3, 0],   // Brazil vs Morocco
  8:  [0, 0],   // Qatar vs Switzerland
};

function buildMatches() {
  return getMatchesData().map((m) => {
    const r = FINISHED_RESULTS[m.id];
    if (!r) return { ...m, home_score: null, away_score: null, finished: 0, winner: null };
    const [h, a] = r;
    const winner = h > a ? 'home' : h < a ? 'away' : null;
    return { ...m, home_score: h, away_score: a, finished: 1, winner };
  });
}

const _matches = buildMatches();

// ── Mock predictions for the demo user (5 picks made) ───────────────────────
const _predictions = [
  { match_id: 1, home_score: 3, away_score: 1 },   // exact match — would score 7
  { match_id: 2, home_score: 1, away_score: 0 },   // wrong score, right winner — 3
  { match_id: 3, home_score: 2, away_score: 1 },   // wrong direction — 0
  { match_id: 9, home_score: 1, away_score: 1 },   // future match
  { match_id: 15, home_score: 2, away_score: 0 },  // future match
];

// ── Mock standings (computed from the finished MD1 results) ─────────────────
function buildStandings() {
  const tables = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    tables[letter] = {};
    for (const t of teams) tables[letter][t] = { team: t, flag: getFlag(t), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }
  for (const m of _matches) {
    if (!m.finished || m.stage !== 'group') continue;
    const letter = m.group_name;
    if (!letter || !tables[letter]) continue;
    const th = tables[letter][m.home_team], ta = tables[letter][m.away_team];
    if (!th || !ta) continue;
    th.p++; ta.p++;
    th.gf += m.home_score; th.ga += m.away_score; th.gd = th.gf - th.ga;
    ta.gf += m.away_score; ta.ga += m.home_score; ta.gd = ta.gf - ta.ga;
    if (m.home_score > m.away_score)      { th.w++; th.pts += 3; ta.l++; }
    else if (m.home_score < m.away_score) { ta.w++; ta.pts += 3; th.l++; }
    else                                   { th.d++; th.pts++; ta.d++; ta.pts++; }
  }
  return Object.entries(tables).map(([letter, table]) => ({
    letter,
    standings: Object.values(table).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    ),
  }));
}

// ── Mock predictions per player (for finished matches only) ─────────────────
const DEMO_PLAYER_PICKS = {
  1: [ // Agus
    { match_id: 1, pred_home: 3, pred_away: 1 },
    { match_id: 2, pred_home: 2, pred_away: 0 },
    { match_id: 3, pred_home: 1, pred_away: 1 },
    { match_id: 4, pred_home: 3, pred_away: 2 },
    { match_id: 5, pred_home: 0, pred_away: 1 },
    { match_id: 6, pred_home: 2, pred_away: 1 },
    { match_id: 7, pred_home: 3, pred_away: 0 },
    { match_id: 8, pred_home: 1, pred_away: 0 },
  ],
  2: [ // Demo User
    { match_id: 1, pred_home: 3, pred_away: 1 },
    { match_id: 2, pred_home: 1, pred_away: 0 },
    { match_id: 3, pred_home: 2, pred_away: 1 },
    { match_id: 5, pred_home: 0, pred_away: 2 },
    { match_id: 7, pred_home: 2, pred_away: 0 },
  ],
  3: [ // Juan
    { match_id: 1, pred_home: 2, pred_away: 0 },
    { match_id: 2, pred_home: 2, pred_away: 0 },
    { match_id: 4, pred_home: 3, pred_away: 1 },
    { match_id: 6, pred_home: 1, pred_away: 1 },
    { match_id: 7, pred_home: 2, pred_away: 1 },
    { match_id: 8, pred_home: 0, pred_away: 0 },
  ],
  4: [ // María
    { match_id: 1, pred_home: 1, pred_away: 0 },
    { match_id: 3, pred_home: 1, pred_away: 1 },
    { match_id: 5, pred_home: 1, pred_away: 0 },
    { match_id: 8, pred_home: 0, pred_away: 0 },
  ],
  5: [ // TestAdmin
    { match_id: 2, pred_home: 1, pred_away: 1 },
    { match_id: 4, pred_home: 2, pred_away: 2 },
    { match_id: 7, pred_home: 1, pred_away: 0 },
  ],
};

// ── Mock leaderboard (5 demo players with varied scores) ────────────────────
const _leaderboard = {
  standings: [
    { id: 1, name: 'Agus',      total: 27, exact: 2, winner: 5, pickedChampion: 'Argentina' },
    { id: 2, name: 'Demo User', total: 21, exact: 1, winner: 4, pickedChampion: 'Brazil' },
    { id: 3, name: 'Juan',      total: 18, exact: 1, winner: 3, pickedChampion: 'France' },
    { id: 4, name: 'María',     total: 12, exact: 0, winner: 4, pickedChampion: null },
    { id: 5, name: 'TestAdmin', total:  8, exact: 0, winner: 2, pickedChampion: 'Mexico' },
  ],
  champion: null,
};

// ── User session helpers (persisted in localStorage so refresh works) ──────
const USER_KEY = 'prode_demo_user';
function getDemoUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function setDemoUser(name) {
  const u = { id: 1, name, isAdmin: name.toLowerCase() === 'admin' };
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  return u;
}
function clearDemoUser() { localStorage.removeItem(USER_KEY); }

// ── Demo response dispatcher ────────────────────────────────────────────────
export function demoResponse(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : {};

  if (path === '/api/auth/me')      return { user: getDemoUser() };
  if (path === '/api/auth/login')   return setDemoUser(body.name || 'Demo');
  if (path === '/api/auth/logout')  { clearDemoUser(); return { ok: true }; }

  if (path === '/api/matches')      return { matches: _matches };
  if (path === '/api/predictions')  {
    if (method === 'GET') return { predictions: _predictions };
    if (method === 'POST') {
      const i = _predictions.findIndex((p) => p.match_id === body.matchId);
      const rec = { match_id: body.matchId, home_score: body.homeScore, away_score: body.awayScore };
      if (i >= 0) _predictions[i] = rec; else _predictions.push(rec);
      return { ok: true };
    }
  }
  if (path === '/api/groups')       return { groups: buildStandings(), source: 'demo' };
  if (path === '/api/leaderboard')  return _leaderboard;

  // Player picks — /api/leaderboard/user/:id
  const userPicksMatch = path.match(/^\/api\/leaderboard\/user\/(\d+)$/);
  if (userPicksMatch) {
    const uid = Number(userPicksMatch[1]);
    const player = _leaderboard.standings.find((s) => s.id === uid);
    if (!player) return { error: 'User not found' };
    const finishedMatches = _matches.filter((m) => m.finished);
    const playerPreds = DEMO_PLAYER_PICKS[uid] || [];
    const picks = finishedMatches.map((m) => {
      const pred = playerPreds.find((p) => p.match_id === m.id) || null;
      let points = null;
      if (pred) {
        const ph = pred.pred_home, pa = pred.pred_away;
        const rh = m.home_score, ra = m.away_score;
        const predR = ph > pa ? 'W' : ph < pa ? 'L' : 'D';
        const realR = rh > ra ? 'W' : rh < ra ? 'L' : 'D';
        const ok = predR === realR;
        points = ok ? (3 + (ph === rh ? 2 : 0) + (pa === ra ? 2 : 0))
                    : ((ph === rh ? 2 : 0) + (pa === ra ? 2 : 0));
      }
      return {
        match_id: m.id, home_team: m.home_team, away_team: m.away_team,
        home_score: m.home_score, away_score: m.away_score,
        match_time: m.match_time, stage: m.stage, group_name: m.group_name,
        pred_home: pred?.pred_home ?? null, pred_away: pred?.pred_away ?? null, points,
      };
    });
    return { user: { id: uid, name: player.name }, picks };
  }
  if (path === '/api/champion') {
    if (method === 'GET') return {
      prediction: 'Argentina', locked: false, lockTime: null, champion: null, teams: ALL_TEAMS,
    };
    if (method === 'POST') return { ok: true };
  }
  if (path === '/api/results')      return { ok: true };
  if (path === '/api/fifa-sync')    return { ok: true, updated: 0, skipped: 104, teamsUpdated: 0, total: 104 };
  if (path === '/api/health')       return { ok: true, demo: true };

  return { ok: true };
}
