/**
 * FIFA World Cup 2026 – Live data fetcher
 * Source: https://api.fifa.com (public read API)
 * Competition: 17 · Season: 285023
 *
 * Fetches all 104 matches with live scores.
 * Uses Next.js cache (revalidate every 60 s during the tournament).
 */

const FIFA_BASE = 'https://api.fifa.com/api/v3';
const COMPETITION = '17';
const SEASON      = '285023';

// Map FIFA team names → our internal names (must match matches-data.js)
const FIFA_NAME_MAP = {
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'IR Iran':            'IR Iran',
  "Côte d'Ivoire":      "Côte d'Ivoire",
  'Türkiye':            'Türkiye',
  'Congo DR':           'Congo DR',
  'Korea Republic':     'Korea Republic',
  'Saudi Arabia':       'Saudi Arabia',
  'Cabo Verde':         'Cabo Verde',
  'New Zealand':        'New Zealand',
  'South Africa':       'South Africa',
  'Curaçao':            'Curaçao',
};

function mapName(name) {
  return FIFA_NAME_MAP[name] ?? name;
}

function getDesc(lst) {
  if (!lst || !lst.length) return '';
  const en = lst.find(i => i.Locale && i.Locale.toLowerCase().startsWith('en'));
  return (en || lst[0]).Description || '';
}

/**
 * Parse a raw FIFA match object into a normalised shape.
 */
function parseMatch(m) {
  const home = m.Home || {};
  const away = m.Away || {};
  const stage = getDesc(m.StageName);
  const group = getDesc(m.GroupName);

  return {
    fifaId:     m.IdMatch,
    stage:      stage,
    group:      group,
    matchDay:   m.MatchDay,
    date:       m.Date,            // UTC ISO string
    localDate:  m.LocalDate,
    home_team:  mapName(getDesc(home.TeamName)),
    away_team:  mapName(getDesc(away.TeamName)),
    home_code:  home.Abbreviation || '',
    away_code:  away.Abbreviation || '',
    home_score: home.Score ?? null,  // null if not played yet
    away_score: away.Score ?? null,
    // MatchStatus: 0 = finished, 3 = live, 1 = upcoming (roughly)
    status:     m.MatchStatus ?? 1,
    finished:   m.MatchStatus === 0,
    venue:      m.Stadium ? getDesc(m.Stadium.Name)     : '',
    city:       m.Stadium ? getDesc(m.Stadium.CityName) : '',
    stageId:    m.IdStage,
    groupId:    m.IdGroup,
  };
}

/** Stage name → our internal stage code */
const STAGE_CODE = {
  'First Stage':             'group',
  'Round of 32':             'r32',
  'Round of 16':             'r16',
  'Quarter-final':           'qf',
  'Semi-final':              'sf',
  'Play-off for third place':'3rd',
  'Final':                   'final',
};

/**
 * Fetch all FWC 2026 matches from FIFA API.
 * In Next.js 15 App Router we rely on fetch() built-in caching.
 * revalidate=60 → re-fetch at most once per minute.
 */
export async function fetchFifaMatches() {
  const url = `${FIFA_BASE}/calendar/matches?idCompetition=${COMPETITION}&idSeason=${SEASON}&count=200&language=en`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ProdeApp/1.0)',
      'Origin':     'https://www.fifa.com',
    },
    next: { revalidate: 60 },   // cache for 60 seconds
  });

  if (!res.ok) throw new Error(`FIFA API error: ${res.status}`);
  const data = await res.json();
  return (data.Results || []).map(parseMatch);
}

/**
 * Compute group standings from a list of FIFA match objects.
 * Returns { A: [...], B: [...], ... } keyed by group letter.
 */
export function computeStandings(fifaMatches, GROUPS) {
  // Build empty table from GROUPS (our source of truth for team names)
  const tables = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    tables[letter] = {};
    for (const team of teams) {
      tables[letter][team] = {
        team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
      };
    }
  }

  // Only process finished group-stage matches
  for (const m of fifaMatches) {
    if (!m.finished) continue;
    if (m.stage !== 'First Stage') continue;
    if (m.home_score == null || m.away_score == null) continue;

    // Find the group letter from the group name (e.g. "Group A" → "A")
    const letter = m.group?.replace('Group ', '');
    if (!letter || !tables[letter]) continue;

    const h  = m.home_team;
    const a  = m.away_team;
    const hs = Number(m.home_score);
    const as_ = Number(m.away_score);

    const th = tables[letter][h];
    const ta = tables[letter][a];
    if (!th || !ta) continue;

    th.p++; ta.p++;
    th.gf += hs; th.ga += as_;
    ta.gf += as_; ta.ga += hs;
    th.gd = th.gf - th.ga;
    ta.gd = ta.gf - ta.ga;

    if (hs > as_) {
      th.w++; th.pts += 3;
      ta.l++;
    } else if (hs < as_) {
      ta.w++; ta.pts += 3;
      th.l++;
    } else {
      th.d++; th.pts++;
      ta.d++; ta.pts++;
    }
  }

  // Sort each group: pts → gd → gf → name
  const result = {};
  for (const [letter, table] of Object.entries(tables)) {
    result[letter] = Object.values(table).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
  }
  return result;
}

/**
 * Return only group-stage matches, with an internal stage code added.
 */
export function groupStageMatches(fifaMatches) {
  return fifaMatches
    .filter(m => m.stage === 'First Stage')
    .map(m => ({
      ...m,
      stageCode: 'group',
      stageLabel: STAGE_CODE[m.stage] || m.stage,
    }));
}

/**
 * Return only finished matches suitable for syncing to local DB.
 * Maps FIFA fields → local DB columns.
 */
export function toLocalFormat(fifaMatches) {
  return fifaMatches
    .filter(m => m.finished && m.home_score != null)
    .map(m => ({
      stageCode:  STAGE_CODE[m.stage] || m.stage,
      home_team:  m.home_team,
      away_team:  m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      finished:   1,
      winner:
        m.home_score > m.away_score ? 'home' :
        m.home_score < m.away_score ? 'away' : null,
    }));
}
