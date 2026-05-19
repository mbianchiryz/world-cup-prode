/**
 * Direct Supabase data access — replaces Express API calls.
 * Uses the anon key + Supabase Auth session (JWT handled automatically).
 * RLS policies on the DB enforce per-user access control.
 */
import { supabase } from './supabase';
import { calcMatchPoints, calcScore } from './scoring';
import { ALL_TEAMS } from './matches-data';

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

  const champion  = settingRow?.value || null;

  const standings = (profiles || []).map((user) => {
    const predictions  = (allPreds   || []).filter((p) => p.user_id === user.id);
    const championPred = (champPreds || []).find((c) => c.user_id === user.id) || null;
    const score        = calcScore({ predictions, matches: matches || [], championPred, champion });
    return {
      id:             user.id,
      name:           user.name || user.email?.split('@')[0] || 'User',
      pickedChampion: championPred?.team || null,
      ...score,
    };
  });

  standings.sort((a, b) => b.total - a.total || b.exact - a.exact);
  return { standings, champion };
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
