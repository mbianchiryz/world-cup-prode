/**
 * Supabase Edge Function — sync-match-meta
 *
 * For every upcoming (non-finished) match in the next 7 days, fetches:
 *   - /predictions?fixture=ID   → win probabilities + predicted score
 *   - /fixtures/headtohead?h2h=HOME_ID-AWAY_ID  → last 10 H2H matches
 *
 * Results are upserted into `match_meta`. Records are skipped if they
 * were already synced in the last 24 hours.
 *
 * Run once per day via pg_cron (e.g. '0 6 * * *' = 06:00 UTC daily).
 * Typical cost: ~30–60 API calls/day during group stage.
 */

// @ts-expect-error — Deno runtime types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// @ts-expect-error — Deno global
const API_KEY              = Deno.env.get('API_FOOTBALL_KEY')!;
// @ts-expect-error — Deno global
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
// @ts-expect-error — Deno global
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const apiFetch  = (path: string) =>
  fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  }).then((r) => r.json());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// @ts-expect-error — Deno global
Deno.serve(async () => {
  // Only upcoming matches within the next 7 days that have team IDs
  const sevenDays = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();

  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_team_id, away_team_id')
    .eq('finished', false)
    .lte('match_time', sevenDays)
    .not('home_team_id', 'is', null)
    .not('away_team_id', 'is', null);

  if (matchErr || !matches?.length) {
    return new Response(
      JSON.stringify({ ok: true, synced: 0, note: 'No upcoming matches with team IDs' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check which fixtures already have fresh meta (< 24h old)
  const { data: existing } = await supabase
    .from('match_meta')
    .select('fixture_id, fetched_at')
    .in('fixture_id', matches.map((m: any) => m.id));

  const freshMap = new Map(
    (existing || [])
      .filter((e: any) => Date.now() - new Date(e.fetched_at).getTime() < 24 * 3600_000)
      .map((e: any) => [e.fixture_id, true])
  );

  const toSync = matches.filter((m: any) => !freshMap.has(m.id));

  if (!toSync.length) {
    return new Response(
      JSON.stringify({ ok: true, synced: 0, note: 'All meta fresh' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  let synced = 0;
  const errors: string[] = [];

  for (const match of toSync) {
    try {
      // Fetch predictions + H2H in parallel
      const [predJson, h2hJson] = await Promise.all([
        apiFetch(`/predictions?fixture=${match.id}`),
        apiFetch(`/fixtures/headtohead?h2h=${match.home_team_id}-${match.away_team_id}&last=10`),
      ]);

      const pred        = predJson.response?.[0];
      const h2hFixtures = (h2hJson.response || []).slice(0, 10);

      // Parse probabilities
      const homePct = parseInt(pred?.predictions?.percent?.home ?? '0') || 0;
      const drawPct = parseInt(pred?.predictions?.percent?.draw ?? '0') || 0;
      const awayPct = parseInt(pred?.predictions?.percent?.away ?? '0') || 0;

      // Predicted score
      const predHomeScore = parseInt(pred?.predictions?.goals?.home ?? '') ?? null;
      const predAwayScore = parseInt(pred?.predictions?.goals?.away ?? '') ?? null;

      // Winner
      const winnerId  = pred?.predictions?.winner?.id ?? null;
      const homeId    = pred?.teams?.home?.id ?? null;
      const predWinner = winnerId == null ? null
                       : winnerId === homeId ? 'home' : 'away';

      // H2H: store minimal data
      const h2h = h2hFixtures.map((f: any) => ({
        date:       f.fixture.date?.slice(0, 10) ?? '',
        home:       f.teams.home.name,
        away:       f.teams.away.name,
        home_score: f.goals.home,
        away_score: f.goals.away,
      }));

      const { error } = await supabase.from('match_meta').upsert({
        fixture_id:      match.id,
        pred_home_pct:   homePct,
        pred_draw_pct:   drawPct,
        pred_away_pct:   awayPct,
        pred_home_score: Number.isNaN(predHomeScore) ? null : predHomeScore,
        pred_away_score: Number.isNaN(predAwayScore) ? null : predAwayScore,
        pred_winner:     predWinner,
        h2h,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'fixture_id' });

      if (error) errors.push(`${match.id}: ${error.message}`);
      else synced++;

    } catch (e: any) {
      errors.push(`${match.id}: ${String(e?.message ?? e)}`);
    }

    // Small delay to avoid rate-limiting
    await sleep(200);
  }

  return new Response(
    JSON.stringify({ ok: true, synced, total: toSync.length, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
