/**
 * ESPN World Cup 2026 – Live data fetcher
 * Source: site.api.espn.com (public, no auth required)
 *
 * Scoreboard:  /apis/site/v2/sports/soccer/fifa.world/scoreboard
 * Standings:   /apis/v2/sports/soccer/fifa.world/standings
 */

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_STANDINGS  = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';

// ESPN display names that differ from our internal names
const ESPN_NAME_MAP = {
  'Iran':                  'IR Iran',
  'South Korea':           'Korea Republic',
  'Korea':                 'Korea Republic',
  'DR Congo':              'Congo DR',
  'Congo, DR':             'Congo DR',
  'Congo DR':              'Congo DR',
  'Turkey':                'Türkiye',
  'Ivory Coast':           "Côte d'Ivoire",
  "Cote d'Ivoire":         "Côte d'Ivoire",
  'Czech Republic':        'Czechia',
  'Bosnia-Herzegovina':    'Bosnia and Herzegovina',
  'Bosnia & Herzegovina':  'Bosnia and Herzegovina',
  'Curacao':               'Curaçao',
  'United States':         'USA',
};

function mapName(name) {
  return ESPN_NAME_MAP[name] ?? name;
}

// Extract group label ("Group A") from an ESPN event, or ''
function parseGroupLabel(evt) {
  const headline = evt.competitions?.[0]?.notes?.[0]?.headline || '';
  return headline.startsWith('Group ') ? headline : '';
}

// Determine internal stage code from an ESPN scoreboard event
function parseStageCode(evt) {
  const groupLabel = parseGroupLabel(evt);
  if (groupLabel) return 'group';

  // Try season type description (e.g. "Round of 32", "Quarterfinals")
  const seasonDesc = (evt.season?.type?.name || '').toLowerCase();
  const noteDesc   = (evt.competitions?.[0]?.notes?.[0]?.headline || '').toLowerCase();
  const desc = seasonDesc || noteDesc;

  if (desc.includes('round of 32'))                    return 'r32';
  if (desc.includes('round of 16'))                    return 'r16';
  if (desc.includes('quarter'))                        return 'qf';
  if (desc.includes('semi'))                           return 'sf';
  if (desc.includes('third') || desc.includes('3rd')) return '3rd';
  if (desc.includes('final'))                          return 'final';

  return null;
}

function parseEvent(evt) {
  const comp = evt.competitions?.[0];
  if (!comp) return null;

  const homeC = comp.competitors?.find(c => c.homeAway === 'home');
  const awayC = comp.competitors?.find(c => c.homeAway === 'away');
  if (!homeC || !awayC) return null;

  const stage = parseStageCode(evt);
  if (!stage) return null;

  const statusType = comp.status?.type || {};
  const finished   = statusType.state === 'post' && statusType.completed === true;

  return {
    espnId:     evt.id,
    stage,
    group:      parseGroupLabel(evt),        // "Group A" or ''
    date:       evt.date,                    // UTC ISO string
    home_team:  mapName(homeC.team?.displayName || ''),
    away_team:  mapName(awayC.team?.displayName || ''),
    home_score: finished ? Number(homeC.score ?? 0) : null,
    away_score: finished ? Number(awayC.score ?? 0) : null,
    finished,
    venue:      comp.venue?.fullName || '',
    city:       comp.venue?.address?.city || '',
  };
}

// Simple in-memory cache (60 s TTL) — replaces Next.js fetch cache
const CACHE_TTL = 60_000;
const _cache = new Map();
async function cachedFetchJson(url) {
  const now = Date.now();
  const hit = _cache.get(url);
  if (hit && now - hit.at < CACHE_TTL) return hit.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN error: ${res.status}`);
  const data = await res.json();
  _cache.set(url, { at: now, data });
  return data;
}

/**
 * Fetch all WC 2026 matches from ESPN scoreboard. Cached 60 s in-memory.
 */
export async function fetchEspnMatches() {
  const url = `${ESPN_SCOREBOARD}?dates=20260611-20260719`;
  const data = await cachedFetchJson(url);
  return (data.events || []).map(parseEvent).filter(Boolean);
}

/**
 * Fetch pre-calculated group standings from ESPN.
 * Returns { A: [...], B: [...], ... } with the same shape used in /api/groups.
 * Falls back to computing from matches if standings endpoint fails.
 *
 * @param {object} GROUPS – our canonical group map (used to fill missing groups)
 */
export async function fetchEspnStandings(GROUPS) {
  const data = await cachedFetchJson(ESPN_STANDINGS);

  const result = {};

  // Structure: data.children[] or data.standings.groups[]
  const nodes = data.children || data.standings?.groups || [];

  for (const node of nodes) {
    const letter = (node.abbreviation || node.name?.replace('Group ', '') || '').trim();
    if (!letter || letter.length > 2) continue;

    const entries = node.standings?.entries || [];
    result[letter] = entries.map(e => {
      const sm = {};
      for (const s of (e.stats || [])) sm[s.name] = s.value;
      return {
        team: mapName(e.team?.displayName || ''),
        p:    sm.gamesPlayed       ?? 0,
        w:    sm.wins              ?? 0,
        d:    sm.ties              ?? 0,
        l:    sm.losses            ?? 0,
        gf:   sm.pointsFor         ?? 0,
        ga:   sm.pointsAgainst     ?? 0,
        gd:   sm.pointDifferential ?? 0,
        pts:  sm.points            ?? 0,
      };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  }

  // Before tournament starts ESPN might not return all groups yet — fill from GROUPS
  if (GROUPS) {
    for (const [letter, teams] of Object.entries(GROUPS)) {
      if (!result[letter]) {
        result[letter] = teams.map(team => ({
          team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
        }));
      }
    }
  }

  return result;
}

/**
 * Compute standings from ESPN match results (used if standings endpoint is unavailable).
 * Same interface as fifa-api.js computeStandings().
 */
export function computeStandings(espnMatches, GROUPS) {
  const tables = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    tables[letter] = {};
    for (const team of teams) {
      tables[letter][team] = { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }
  }

  for (const m of espnMatches) {
    if (!m.finished || m.stage !== 'group') continue;
    if (m.home_score == null || m.away_score == null) continue;
    const letter = m.group?.replace('Group ', '');
    if (!letter || !tables[letter]) continue;
    const th = tables[letter][m.home_team];
    const ta = tables[letter][m.away_team];
    if (!th || !ta) continue;
    const hs = Number(m.home_score), as_ = Number(m.away_score);
    th.p++; ta.p++;
    th.gf += hs; th.ga += as_; th.gd = th.gf - th.ga;
    ta.gf += as_; ta.ga += hs; ta.gd = ta.gf - ta.ga;
    if (hs > as_)      { th.w++; th.pts += 3; ta.l++; }
    else if (hs < as_) { ta.w++; ta.pts += 3; th.l++; }
    else               { th.d++; th.pts++; ta.d++; ta.pts++; }
  }

  const result = {};
  for (const [letter, table] of Object.entries(tables)) {
    result[letter] = Object.values(table).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
  }
  return result;
}
