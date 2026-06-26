/**
 * Supabase Edge Function — resolve-bracket
 *
 * Run ONCE on June 28, 2026 after all 48 group-stage matches finish.
 *
 * What it does:
 *   1. Fetches the 16 official Round-of-32 fixtures from api-football
 *      (teams are now real, e.g. "Germany vs Korea Republic" instead of
 *      "1st E vs 3rd ABCDF")
 *   2. Upserts them into the `matches` table with their real fixture IDs
 *   3. Deletes the 32 placeholder rows (IDs 9000001–9000032) that were
 *      used during the pre-tournament phase
 *
 * After this runs:
 *   - `sync-results` picks up the real R32 fixtures automatically
 *   - The Predictions page shows real teams in the knockout bracket
 *   - Bracket Challenge scoring uses real team names going forward
 *
 * Invoke manually (service-role key required):
 *   curl -X POST https://<project>.supabase.co/functions/v1/resolve-bracket \
 *     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
 */

// @ts-expect-error — Deno runtime types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// @ts-expect-error — Deno global
const API_KEY              = Deno.env.get('API_FOOTBALL_KEY')!;
// @ts-expect-error — Deno global
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
// @ts-expect-error — Deno global
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NAME_MAP: Record<string, string> = {
  'South Korea':            'Korea Republic',
  'Czech Republic':         'Czechia',
  'Turkey':                 'Türkiye',
  'Iran':                   'IR Iran',
  'DR Congo':               'Congo DR',
  'Cape Verde':             'Cabo Verde',
  'Cape Verde Islands':     'Cabo Verde',
  "Cote d'Ivoire":          "Côte d'Ivoire",
  'Ivory Coast':            "Côte d'Ivoire",
  'Curacao':                'Curaçao',
  'Bosnia & Herzegovina':   'Bosnia and Herzegovina',
  'United States':          'USA',
};

function normalize(name: string): string {
  return NAME_MAP[name] ?? name;
}

const STAGE_MAP: Record<string, string> = {
  'Round of 32':    'r32',
  'Round of 16':    'r16',
  'Quarter-finals': 'qf',
  'Semi-finals':    'sf',
  '3rd Place Play-off': '3rd',
  'Final':          'final',
};

// Placeholder id ranges per knockout stage (from migration-007)
const PLACEHOLDER_RANGE: Record<string, [number, number]> = {
  r32:   [9000001, 9000016],
  r16:   [9000017, 9000024],
  qf:    [9000025, 9000028],
  sf:    [9000029, 9000030],
  '3rd': [9000031, 9000031],
  final: [9000032, 9000032],
};

// @ts-expect-error — Deno global
Deno.serve(async () => {
  // ── 1. Fetch knockout fixtures from api-football (no group-stage guard —
  //       sync progressively as cruces get confirmed) ──────────────────────────
  const rounds = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', '3rd Place Play-off', 'Final'];
  const allFixtures: any[] = [];

  for (const round of rounds) {
    const resp = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=1&season=2026&round=${encodeURIComponent(round)}`,
      { headers: { 'x-apisports-key': API_KEY } }
    );
    if (!resp.ok) continue;
    const d = await resp.json();
    allFixtures.push(...(d.response ?? []));
    await new Promise(r => setTimeout(r, 150)); // rate-limit safety
  }

  if (!allFixtures.length) {
    return json({ ok: false, note: 'No knockout fixtures from api-football yet.' }, 404);
  }

  // ── 2. Build rows. Teams that are not yet confirmed come as null → "TBD" ──────
  const rows = allFixtures.map((f: any) => {
    const round    = f.league.round as string;
    const stage    = STAGE_MAP[round] ?? 'r32';
    const finished = ['FT','AET','PEN'].includes(f.fixture.status.short);
    let winner: string | null = null;
    if (finished) {
      const ph = f.score?.penalty?.home;
      const pa = f.score?.penalty?.away;
      winner = ph != null
        ? (ph > pa ? 'home' : 'away')
        : (f.goals.home > f.goals.away ? 'home' : f.goals.home < f.goals.away ? 'away' : null);
    }
    return {
      id:           f.fixture.id,
      home_team:    f.teams.home?.name ? normalize(f.teams.home.name) : 'TBD',
      away_team:    f.teams.away?.name ? normalize(f.teams.away.name) : 'TBD',
      home_team_id: f.teams.home?.id ?? null,
      away_team_id: f.teams.away?.id ?? null,
      match_time:   f.fixture.date,
      stage,
      group_name:   null,
      matchday:     null,
      finished,
      home_score:   finished ? f.goals.home : null,
      away_score:   finished ? f.goals.away : null,
      winner,
    };
  });

  const { error: upsertErr } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'id' });

  if (upsertErr) {
    return json({ ok: false, error: upsertErr.message }, 500);
  }

  // ── 3. Delete placeholders ONLY for stages api-football now provides ──────────
  // (keeps R16+ placeholders intact if api-football hasn't created those yet)
  const resolvedStages = [...new Set(rows.map(r => r.stage))];
  let placeholdersDeleted = 0;
  for (const stage of resolvedStages) {
    const range = PLACEHOLDER_RANGE[stage];
    if (!range) continue;
    const { count } = await supabase
      .from('matches')
      .delete({ count: 'exact' })
      .gte('id', range[0])
      .lte('id', range[1]);
    placeholdersDeleted += count ?? 0;
  }

  // Summary: confirmed = both teams known, pending = at least one TBD
  const confirmed = rows.filter(r => r.home_team !== 'TBD' && r.away_team !== 'TBD');
  return json({
    ok:                   true,
    fixtures_upserted:    rows.length,
    confirmed_matchups:   confirmed.length,
    pending_tbd:          rows.length - confirmed.length,
    placeholders_deleted: placeholdersDeleted,
    rounds_resolved:      resolvedStages,
    confirmed_list:       confirmed.map(r => `${r.home_team} vs ${r.away_team}`),
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
