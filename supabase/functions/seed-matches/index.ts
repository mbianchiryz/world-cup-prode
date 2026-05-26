/**
 * Supabase Edge Function — seed-matches
 *
 * One-time (or re-runnable) function that imports all 104 World Cup 2026
 * fixtures from api-football into the `matches` table.
 *
 * Uses api-football fixture IDs as the match `id` in our DB so that
 * sync-results can update them by ID later.
 *
 * Invoke manually:
 *   curl -X POST https://vswemrcilltarbetmlwu.supabase.co/functions/v1/seed-matches \
 *     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
 *
 * It's safe to re-run — uses UPSERT so existing rows are updated in place.
 */

// @ts-expect-error — Deno runtime types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// @ts-expect-error — Deno global
const API_KEY               = Deno.env.get('API_FOOTBALL_KEY')!;
// @ts-expect-error — Deno global
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
// @ts-expect-error — Deno global
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** Map api-football round string → our stage / group_name */
function parseRound(round: string): { stage: string; group_name: string | null } {
  if (round.startsWith('Group Stage')) {
    const g = round.split(' - ')[1] ?? null;
    return { stage: 'group', group_name: g };
  }
  const map: Record<string, string> = {
    'Round of 32':    'r32',
    'Round of 16':    'r16',
    'Quarter-finals': 'qf',
    'Semi-finals':    'sf',
    '3rd Place Final':'3rd',
    'Final':          'final',
  };
  return {
    stage: map[round] ?? round.toLowerCase().replace(/[\s-]+/g, '_'),
    group_name: null,
  };
}

// @ts-expect-error — Deno global
Deno.serve(async () => {
  // Fetch all fixtures for WC 2026 (league=1, season=2026)
  const resp = await fetch(
    'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
    { headers: { 'x-apisports-key': API_KEY } }
  );

  if (!resp.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: `api-football returned ${resp.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const json = await resp.json();
  const fixtures: any[] = json.response ?? [];

  if (!fixtures.length) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No fixtures returned', raw: json }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rows = fixtures.map((f: any) => {
    const { stage, group_name } = parseRound(f.league.round);
    const statusShort = f.fixture.status.short;
    const finished    = ['FT', 'AET', 'PEN'].includes(statusShort);

    let winner: string | null = null;
    if (finished && stage !== 'group') {
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

    return {
      id:         f.fixture.id,
      home_team:  f.teams.home.name,
      away_team:  f.teams.away.name,
      match_time: f.fixture.date,
      stage,
      group_name,
      matchday:   null,
      home_score: finished ? f.goals.home : null,
      away_score: finished ? f.goals.away : null,
      finished,
      winner,
    };
  });

  const { error } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, imported: rows.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
