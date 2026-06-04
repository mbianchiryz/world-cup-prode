/**
 * Direct Supabase data access — replaces Express API calls.
 * Uses the anon key + Supabase Auth session (JWT handled automatically).
 * RLS policies on the DB enforce per-user access control.
 */
import { supabase } from './supabase';
import { calcMatchPoints, calcScore, isCorrectResult } from './scoring';
import { ALL_TEAMS, GROUPS, getFlag } from './matches-data';

// ── Matches ───────────────────────────────────────────────────────────────────
export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Predictions (current user) ────────────────────────────────────────────────
export async function getMyPredictions() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', session.user.id);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function savePrediction(matchId, homeScore, awayScore) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { error } = await supabase.from('predictions').upsert(
    {
      user_id:    session.user.id,
      match_id:   matchId,
      home_score: homeScore,
      away_score: awayScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,match_id' }
  );
  if (error) throw new Error(error.message);
}

// ── Champion pick ─────────────────────────────────────────────────────────────
export async function getChampionData() {
  const { data: { session } } = await supabase.auth.getSession();

  const [{ data: settingRow }, { data: champPick }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'champion').maybeSingle(),
    session
      ? supabase.from('champion_predictions').select('team, updated_at').eq('user_id', session.user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const champion  = settingRow?.value || null;
  const prediction = champPick?.team  || null;

  // Lock champion pick 1 hour before first knockout match (round of 32 start)
  const LOCK_DATE  = new Date('2026-06-28T19:00:00.000Z');
  const locked     = Date.now() >= LOCK_DATE.getTime();

  return {
    prediction,
    locked,
    champion,
    teams: ALL_TEAMS,
  };
}

export async function saveChampionPick(team) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { error } = await supabase.from('champion_predictions').upsert(
    { user_id: session.user.id, team, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function getChampionPickStats() {
  const { data, error } = await supabase
    .from('champion_predictions')
    .select('team');
  if (error) throw new Error(error.message);

  const counts = {};
  for (const row of data || []) {
    if (row.team) counts[row.team] = (counts[row.team] || 0) + 1;
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  return Object.entries(counts)
    .map(([team, count]) => ({
      team,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export async function getLeaderboard() {
  const [
    { data: profiles, error: e1 },
    { data: matches,  error: e2 },
    { data: allPreds, error: e3 },
    { data: champPreds },
    { data: settingRow },
  ] = await Promise.all([
    supabase.from('profiles').select('id, name, email'),
    supabase.from('matches').select('*'),
    supabase.from('predictions').select('*'),
    supabase.from('champion_predictions').select('*'),
    supabase.from('settings').select('value').eq('key', 'champion').maybeSingle(),
  ]);

  if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);

  const champion = settingRow?.value || null;

  // ── Helpers for streak & trend ─────────────────────────────────────────────

  // Finished matches sorted newest → oldest (used for streak)
  const finishedSorted = (matches || [])
    .filter((m) => m.finished && m.home_score != null)
    .sort((a, b) => new Date(b.match_time) - new Date(a.match_time));

  // "Last round" = all finished matches within 36 h of the most recent one.
  // Used to compute previous standings for trend.
  const trendMap = {};
  if (finishedSorted.length > 0) {
    const latestMs = new Date(finishedSorted[0].match_time).getTime();
    const WINDOW   = 36 * 60 * 60 * 1000; // 36 h
    const lastRoundIds = new Set(
      finishedSorted
        .filter((m) => latestMs - new Date(m.match_time).getTime() < WINDOW)
        .map((m) => m.id)
    );

    // Standings without the last round
    const prevList = (profiles || []).map((user) => {
      const userPrevPreds = (allPreds   || []).filter((p) => p.user_id === user.id && !lastRoundIds.has(p.match_id));
      const prevMatches   = (matches    || []).filter((m) => !lastRoundIds.has(m.id));
      const champPred     = (champPreds || []).find((c) => c.user_id === user.id) || null;
      const s = calcScore({ predictions: userPrevPreds, matches: prevMatches, championPred: champPred, champion });
      return { id: user.id, total: s.total, exact: s.exact, result: s.result, name: user.name || '' };
    });
    prevList.sort((a, b) =>
      b.total - a.total || b.exact - a.exact || b.result - a.result || a.name.localeCompare(b.name)
    );
    prevList.forEach((p, i) => { trendMap[p.id] = i + 1; });
  }

  // ── Main standings ─────────────────────────────────────────────────────────
  const standings = (profiles || []).map((user) => {
    const predictions  = (allPreds   || []).filter((p) => p.user_id === user.id);
    const championPred = (champPreds || []).find((c) => c.user_id === user.id) || null;
    const score        = calcScore({ predictions, matches: matches || [], championPred, champion });

    // Streak: consecutive correct-direction results from newest finished match backward.
    // A missed pick or wrong direction ends the streak.
    const predMap = {};
    for (const p of predictions) predMap[p.match_id] = p;
    let streak = 0;
    for (const m of finishedSorted) {
      const pred = predMap[m.id];
      if (!pred) break;                          // no pick → streak ends
      if (isCorrectResult(pred, m)) streak++;
      else break;                                // wrong direction → streak ends
    }

    return {
      id:             user.id,
      name:           user.name || user.email?.split('@')[0] || 'User',
      pickedChampion: championPred?.team || null,
      streak,
      ...score,
    };
  });

  // Tiebreakers: total → exact-score picks → other scoring picks → name (alphabetical)
  standings.sort((a, b) =>
    b.total - a.total
    || b.exact - a.exact
    || b.result - a.result
    || (a.name || '').localeCompare(b.name || '')
  );

  // Attach rank + trend (positive = moved up, negative = moved down)
  standings.forEach((p, i) => {
    p.rank  = i + 1;
    p.trend = trendMap[p.id] != null ? trendMap[p.id] - (i + 1) : null;
  });

  return { standings, champion };
}

// ── Group standings — reads official api-football data, falls back to local calc ─
export async function getGroupStandings() {
  // 1. Try official standings synced from api-football
  const { data: official, error: offErr } = await supabase
    .from('group_standings')
    .select('*')
    .order('group_name')
    .order('rank');

  if (!offErr && official && official.length > 0) {
    const grouped = {};
    for (const row of official) {
      if (!grouped[row.group_name]) grouped[row.group_name] = [];
      grouped[row.group_name].push({
        team: row.team,
        flag: getFlag(row.team),
        p:    row.played,
        w:    row.won,
        d:    row.drawn,
        l:    row.lost,
        gf:   row.goals_for,
        ga:   row.goals_against,
        gd:   row.goal_diff,
        pts:  row.points,
        form: row.form,
      });
    }
    return Object.entries(grouped)
      .map(([letter, standings]) => ({ letter, standings }))
      .sort((a, b) => a.letter.localeCompare(b.letter));
  }

  // 2. Fallback: compute standings client-side from the matches table
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('match_time', { ascending: true });

  if (error) throw new Error(error.message);

  // Seed empty table from the official GROUPS constant
  const tables = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    tables[letter] = {};
    for (const team of teams) {
      tables[letter][team] = { team, flag: getFlag(team), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }
  }

  // Apply finished match results
  for (const m of (matches || [])) {
    if (!m.finished || m.home_score == null) continue;
    const letter = m.group_name;
    if (!letter || !tables[letter]) continue;
    const th = tables[letter][m.home_team];
    const ta = tables[letter][m.away_team];
    if (!th || !ta) continue;

    th.p++; ta.p++;
    th.gf += m.home_score; th.ga += m.away_score; th.gd = th.gf - th.ga;
    ta.gf += m.away_score; ta.ga += m.home_score; ta.gd = ta.gf - ta.ga;

    if (m.home_score > m.away_score)      { th.w++; th.pts += 3; ta.l++; }
    else if (m.home_score < m.away_score) { ta.w++; ta.pts += 3; th.l++; }
    else                                   { th.d++; th.pts++;    ta.d++; ta.pts++; }
  }

  // Sort each group: pts → GD → GF → name
  return Object.entries(tables).map(([letter, table]) => ({
    letter,
    standings: Object.values(table).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    ),
  })).sort((a, b) => a.letter.localeCompare(b.letter));
}

// ── Player picks (for leaderboard detail modal — finished matches only) ───────
export async function getUserPicks(userId) {
  const [
    { data: profile },
    { data: finishedMatches },
    { data: predictions },
  ] = await Promise.all([
    supabase.from('profiles').select('id, name, email').eq('id', userId).maybeSingle(),
    supabase.from('matches').select('*').eq('finished', true).order('match_time'),
    supabase.from('predictions').select('*').eq('user_id', userId),
  ]);

  if (!profile) throw new Error('User not found');

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

  const userName = profile.name || profile.email?.split('@')[0] || 'User';
  return { user: { id: profile.id, name: userName }, picks };
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const ADMIN_EMAILS = [
  'm.bianchi@ryzlabs.com',
  'j.barcelo@ryzlabs.com',
  'sam@ryzlabs.com',
  'jordan@ryzlabs.com',
];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

export async function getAdminStats() {
  const { data, error } = await supabase.rpc('get_admin_stats');
  if (error) throw error;
  return data || [];
}

// ── Bracket Challenge ─────────────────────────────────────────────────────────
export async function getBracketChallenge() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('bracket_challenges')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return data;
}

export async function saveBracketChallenge(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('bracket_challenges')
    .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBracketLeaderboard() {
  // Fetch all bracket challenges + user profiles
  const [{ data: brackets }, { data: profiles }] = await Promise.all([
    supabase.from('bracket_challenges').select('user_id, group_picks, third_place_picks, knockout_picks, phase, locked'),
    supabase.from('profiles').select('id, name, email'),
  ]);

  if (!brackets?.length) return [];
  const profileMap = {};
  for (const p of (profiles || [])) profileMap[p.id] = p;

  return brackets.map(b => ({
    userId:          b.user_id,
    name:            profileMap[b.user_id]?.name || profileMap[b.user_id]?.email?.split('@')[0] || 'Player',
    phase:           b.phase,
    locked:          b.locked,
    groupPicks:      b.group_picks || {},
    thirdPicks:      b.third_place_picks || [],
    knockoutPicks:   b.knockout_picks || {},
  }));
}

// ── Match meta: predictions + H2H from api-football ──────────────────────────
export async function getMatchMeta(fixtureIds) {
  if (!fixtureIds || !fixtureIds.length) return {};
  const { data } = await supabase
    .from('match_meta')
    .select('*')
    .in('fixture_id', fixtureIds);
  const map = {};
  for (const m of (data || [])) map[m.fixture_id] = m;
  return map;
}
