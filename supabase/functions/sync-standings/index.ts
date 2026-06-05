/**
 * Supabase Edge Function — sync-standings
 *
 * Fetches official group standings from api-football and upserts them into
 * the `group_standings` table. Designed to run every 5 minutes via pg_cron.
 *
 * Before the tournament starts the standings endpoint returns an empty array,
 * in which case the function exits cleanly without touching the DB.
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

/** Map api-football team names → our canonical names (must match TEAM_FLAGS in matches-data.js) */
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

// @ts-expect-error — Deno global
Deno.serve(async () => {
  const resp = await fetch(
    'https://v3.football.api-sports.io/standings?league=1&season=2026',
    { headers: { 'x-apisports-key': API_KEY } }
  );

  if (!resp.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: `api-football ${resp.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const json         = await resp.json();
  const standingsArr = json.response?.[0]?.league?.standings ?? [];

  if (!standingsArr.length) {
    return new Response(
      JSON.stringify({ ok: true, groups: 0, note: 'Tournament not started yet' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rows: any[] = [];

  for (const group of standingsArr) {
    for (const entry of group) {
      // entry.group = "Group A" → strip prefix
      const rawGroup  = (entry.group as string) ?? '';
      const groupLetter = rawGroup.replace(/^Group\s*/i, '').trim();

      // "Ranking of third-placed teams" → store with special group_name BEST_3RDS
      if (rawGroup.toLowerCase().includes('third')) {
        rows.push({
          group_name:    'BEST_3RDS',
          rank:          entry.rank,
          team:          normalize(entry.team.name),
          played:        entry.all.played,
          won:           entry.all.win,
          drawn:         entry.all.draw,
          lost:          entry.all.lose,
          goals_for:     entry.all.goals.for,
          goals_against: entry.all.goals.against,
          goal_diff:     entry.goalsDiff,
          points:        entry.points,
          form:          entry.form ?? null,
          updated_at:    new Date().toISOString(),
        });
        continue;
      }

      // Skip anything that isn't a single-letter real group (A-L)
      if (!groupLetter || groupLetter.length > 1) continue;

      rows.push({
        group_name:    groupLetter,
        rank:          entry.rank,
        team:          normalize(entry.team.name),
        played:        entry.all.played,
        won:           entry.all.win,
        drawn:         entry.all.draw,
        lost:          entry.all.lose,
        goals_for:     entry.all.goals.for,
        goals_against: entry.all.goals.against,
        goal_diff:     entry.goalsDiff,
        points:        entry.points,
        form:          entry.form ?? null,
        updated_at:    new Date().toISOString(),
      });
    }
  }

  if (!rows.length) {
    return new Response(
      JSON.stringify({ ok: true, groups: 0, note: 'No rows to upsert' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('group_standings')
    .upsert(rows, { onConflict: 'group_name,team' });

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, groups: standingsArr.length, teams: rows.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
