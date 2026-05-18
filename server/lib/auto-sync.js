/**
 * Auto-sync from ESPN API → local SQLite DB.
 *
 * Runs at most once per `COOLDOWN_MS` (60 s by default).
 * Concurrent calls share the same in-flight Promise (no thundering herd).
 *
 * Usage:
 *   import { maybeAutoSync } from '@/lib/auto-sync';
 *   await maybeAutoSync().catch(() => {});  // fire-and-forget OK
 */

import { fetchEspnMatches } from './espn-api.js';
import { getDb }            from './db.js';

const PLACEHOLDER_PREFIXES = [
  '1st Group', '2nd Group', 'Best 3rd', 'TBD', 'Winner', 'Loser',
];
const isPlaceholder = (n) =>
  !n || PLACEHOLDER_PREFIXES.some((p) => n.startsWith(p));

const COOLDOWN_MS = 60_000;
let lastSyncAt    = 0;
let inflight      = null;

/**
 * Core sync logic. Pulls ESPN matches and writes to local DB.
 * Updates both KO team names and finished-match scores.
 */
export async function syncFromEspn() {
  const espnMatches = await fetchEspnMatches();
  const db = getDb();

  let updated      = 0;
  let teamsUpdated = 0;
  let skipped      = 0;

  for (const fm of espnMatches) {
    const stageCode = fm.stage; // ESPN already returns internal stage codes
    if (!stageCode) { skipped++; continue; }

    // Group stage: match by team names
    if (stageCode === 'group') {
      if (!fm.finished || fm.home_score == null) { skipped++; continue; }

      const winner =
        fm.home_score > fm.away_score ? 'home' :
        fm.home_score < fm.away_score ? 'away' : null;

      const row = db.prepare(`
        SELECT id, home_score, away_score, finished FROM matches
        WHERE stage = 'group' AND home_team = ? AND away_team = ?
        LIMIT 1
      `).get(fm.home_team, fm.away_team);

      if (!row) { skipped++; continue; }

      // Skip if scores haven't changed (no-op write)
      if (row.finished &&
          row.home_score === fm.home_score &&
          row.away_score === fm.away_score) {
        skipped++; continue;
      }

      db.prepare(`
        UPDATE matches SET home_score=?, away_score=?, winner=?, finished=1 WHERE id=?
      `).run(fm.home_score, fm.away_score, winner, row.id);
      updated++;
    }

    // Knockout: match by date+stage, also propagate team names
    else {
      const dateISO = fm.date ? fm.date.substring(0, 13) : null;
      if (!dateISO) { skipped++; continue; }

      const row = db.prepare(`
        SELECT id, home_team, away_team, home_score, away_score, finished FROM matches
        WHERE stage = ? AND substr(match_time, 1, 13) = ?
        LIMIT 1
      `).get(stageCode, dateISO);

      if (!row) { skipped++; continue; }

      if (!isPlaceholder(fm.home_team) && isPlaceholder(row.home_team)) {
        db.prepare('UPDATE matches SET home_team=? WHERE id=?').run(fm.home_team, row.id);
        teamsUpdated++;
      }
      if (!isPlaceholder(fm.away_team) && isPlaceholder(row.away_team)) {
        db.prepare('UPDATE matches SET away_team=? WHERE id=?').run(fm.away_team, row.id);
        teamsUpdated++;
      }

      if (fm.finished && fm.home_score != null) {
        if (row.finished &&
            row.home_score === fm.home_score &&
            row.away_score === fm.away_score) {
          skipped++; continue;
        }
        const winner =
          fm.home_score > fm.away_score ? 'home' :
          fm.home_score < fm.away_score ? 'away' : null;
        db.prepare(`
          UPDATE matches SET home_score=?, away_score=?, winner=?, finished=1 WHERE id=?
        `).run(fm.home_score, fm.away_score, winner, row.id);
        updated++;
      }
    }
  }

  return { ok: true, updated, teamsUpdated, skipped, total: espnMatches.length };
}

/**
 * Throttled wrapper: only actually syncs if cooldown has elapsed.
 * Concurrent callers within the same in-flight cycle share one Promise.
 *
 * Returns immediately with `{ skipped: true, reason: 'cooldown' }` if too soon.
 */
export async function maybeAutoSync() {
  const now = Date.now();
  if (now - lastSyncAt < COOLDOWN_MS) {
    return { skipped: true, reason: 'cooldown' };
  }

  // De-duplicate concurrent calls
  if (inflight) return inflight;

  lastSyncAt = now;
  inflight = syncFromEspn()
    .catch((err) => {
      console.error('[auto-sync] Error:', err.message);
      lastSyncAt = 0; // allow retry on next call
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
