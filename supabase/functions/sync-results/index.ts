/**
 * Supabase Edge Function — sync-results
 *
 * Fetches live and recently-finished World Cup 2026 fixtures from api-football
 * and updates `home_score`, `away_score`, `finished`, and `winner` in the
 * `matches` table.
 *
 * Designed to run every 5 minutes during match days via pg_cron.
 * On non-match days it returns quickly (0 fixtures to update).
 *
 * Schedule (SQL Editor → run migration-003):
 *   select cron.schedule('sync-results','*\/5 * * * *', $$
 *     select net.http_post(url := '...', headers := '...'::jsonb);
 *   $$);
 */

// @ts-expect-error — Deno runtime types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// @ts-expect-error — Deno global
const API_KEY              = Deno.env.get('API_FOOTBALL_KEY')!;
// @ts-expect-error — Deno global
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
// @ts-expect-error — Deno global
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// All "interesting" statuses: live + finished variants
const LIVE_STATUSES = 'LIVE-1H-HT-2H-ET-BT-P-FT-AET-PEN';

// @ts-expect-error — Deno global
Deno.serve(async () => {
  const resp = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=${LIVE_STATUSES}`,
    { headers: { 'x-apisports-key': API_KEY } }
  );

  if (!resp.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: `api-football returned ${resp.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const json  = await resp.json();
  const fixtures: any[] = json.response ?? [];

  if (!fixtures.length) {
    return new Response(
      JSON.stringify({ ok: true, checked: 0, updated: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  let updated = 0;
  const errors: string[] = [];

  for (const f of fixtures) {
    const statusShort = f.fixture.status.short;
    const finished    = ['FT', 'AET', 'PEN'].includes(statusShort);
    const isKnockout  = !f.league.round.startsWith('Group Stage');

    // Live minute / status label (same response — no extra API cost)
    // HT = half-time, ET/BT = extra time, P = penalties; otherwise elapsed minute
    let liveStatus: string | null = null;
    if (!finished) {
      if (statusShort === 'HT')      liveStatus = 'HT';
      else if (statusShort === 'P')  liveStatus = 'PENS';
      else if (['ET','BT'].includes(statusShort)) liveStatus = f.fixture.status.elapsed ? `${f.fixture.status.elapsed}' ET` : 'ET';
      else if (f.fixture.status.elapsed != null) liveStatus = `${f.fixture.status.elapsed}'`;
    }

    // Determine winner for knockout matches
    let winner: string | null = null;
    if (finished && isKnockout) {
      const ph = f.score?.penalty?.home;
      const pa = f.score?.penalty?.away;
      if (ph != null) {
        winner = ph > pa ? 'home' : 'away';
      } else {
        winner = f.goals.home > f.goals.away ? 'home'
               : f.goals.home < f.goals.away ? 'away'
               : null;
      }
    }

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: f.goals.home,
        away_score: f.goals.away,
        finished,
        winner,
        live_status: liveStatus,
      })
      .eq('id', f.fixture.id);

    if (error) errors.push(`fixture ${f.fixture.id}: ${error.message}`);
    else updated++;
  }

  return new Response(
    JSON.stringify({ ok: true, checked: fixtures.length, updated, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
