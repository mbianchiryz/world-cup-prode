/**
 * Auto-sync from ESPN API → Supabase DB.
 *
 * Runs at most once per `COOLDOWN_MS` (60 s by default).
 * Concurrent calls share the same in-flight Promise (no thundering herd).
 *
 * Usage:
 *   import { maybeAutoSync } from './auto-sync.js';
 *   await maybeAutoSync().catch(() => {});  // fire-and-forget OK
 */

import { fetchEspnMatches } from './espn-api.js';
import { supabaseAdmin }    from './supabase.js';

const PLACEHOLDER_PREFIXES = [
  '1st Group', '2nd Group', 'Best 3rd', 'TBD', 'Winner', 'Loser',
];
const isPlaceholder = (n) =>
  !n || PLACEHOLDER_PREFIXES.some((p) => n.startsWith(p));

const COOLDOWN_MS = 60_000;
let lastSyncAt    = 0;
let inflight      = null;

/**
 * Core sync logic. Pulls ESPN matches and writes to Supabase.
 * Updates both KO team names and finished-match scores.
 */
export async function syncFromEspn() {
  const espnMatches = await fetchEspnMatches();

  let updated      = 0;
  let teamsUpdated = 0;
  let skipped      = 0;

  for (const fm of espnMatches) {
    const stageCode = fm.stage;
    if (!stageCode) { skipped++; continue; }

    // Group stage: match by team names
    if (stageCode === 'group') {
      if (!fm.finished || fm.home_score == null) { skipped++; continue; }

      const winner =
        fm.home_score > fm.away_score ? 'home' :
        fm.home_score < fm.away_score ? 'away' : null;

      const { data: rows } = await supabaseAdmin
        .from('matches')
        .select('id, home_score, away_score, finished')
        .eq('stage', 'group')
        .eq('home_team', fm.home_team)
        .eq('away_team', fm.away_team)
        .limit(1);

      const row = rows?.[0];
      if (!row) { skipped++; continue; }

      // Skip if scores haven't changed
      if (row.finished &&
          row.home_score === fm.home_score &&
          row.away_score === fm.away_score) {
        skipped++; continue;
      }

      await supabaseAdmin
        .from('matches')
        .update({ home_score: fm.home_score, away_score: fm.away_score, winner, finished: true })
        .eq('id', row.id);
      updated++;

    } else {
      // Knockout: match by date+stage prefix
      const dateISO = fm.date ? fm.date.substring(0, 13) : null;
      if (!dateISO) { skipped++; continue; }

      // Supabase: filter by stage and match_time prefix using gte/lt on a date range
      const dateStart = dateISO + ':00:00.000Z';
      const dateEnd   = dateISO.substring(0, 10) + 'T' + dateISO.substring(11) + ':59:59.999Z';

      const { data: rows } = await supabaseAdmin
        .from('matches')
        .select('id, home_team, away_team, home_score, away_score, finished')
        .eq('stage', stageCode)
        .gte('match_time', dateStart)
        .lte('match_time', dateEnd)
        .limit(1);

      const row = rows?.[0];
      if (!row) { skipped++; continue; }

      const updates = {};

      if (!isPlaceholder(fm.home_team) && isPlaceholder(row.home_team)) {
        updates.home_team = fm.home_team;
        teamsUpdated++;
      }
      if (!isPlaceholder(fm.away_team) && isPlaceholder(row.away_team)) {
        updates.away_team = fm.away_team;
        teamsUpdated++;
      }

      if (fm.finished && fm.home_score != null) {
        if (row.finished &&
            row.home_score === fm.home_score &&
            row.away_score === fm.away_score) {
          if (Object.keys(updates).length > 0) {
            await supabaseAdmin.from('matches').update(updates).eq('id', row.id);
          }
          skipped++; continue;
        }
        const winner =
          fm.home_score > fm.away_score ? 'home' :
          fm.home_score < fm.away_score ? 'away' : null;
        Object.assign(updates, { home_score: fm.home_score, away_score: fm.away_score, winner, finished: true });
        updated++;
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('matches').update(updates).eq('id', row.id);
      }
    }
  }

  return { ok: true, updated, teamsUpdated, skipped, total: espnMatches.length };
}

/**
 * Throttled wrapper: only actually syncs if cooldown has elapsed.
 * Concurrent callers within the same in-flight cycle share one Promise.
 */
export async function maybeAutoSync() {
  const now = Date.now();
  if (now - lastSyncAt < COOLDOWN_MS) {
    return { skipped: true, reason: 'cooldown' };
  }

  if (inflight) return inflight;

  lastSyncAt = now;
  inflight = syncFromEspn()
    .catch((err) => {
      console.error('[auto-sync] Error:', err.message);
      lastSyncAt = 0;
      return { ok: false, error: err.message };
    })
    .finally(() => { inflight = null; });

  return inflight;
}

/** Force a sync regardless of cooldown (for the admin button). */
export async function forceSync() {
  if (inflight) return inflight;
  inflight = syncFromEspn()
    .catch((err) => ({ ok: false, error: err.message }))
    .finally(() => { inflight = null; lastSyncAt = Date.now(); });
  return inflight;
}
