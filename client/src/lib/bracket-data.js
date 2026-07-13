/**
 * FIFA World Cup 2026 — Bracket Challenge data & helpers
 * Official 48-team bracket: R32 → R16 → QF → SF → Final
 */
import { GROUPS, TEAM_GROUP } from './matches-data';

// Lock 1 hour before first kick-off (Mexico vs South Africa, Jun 11 19:00 UTC / 16:00 Argentina)
export const BRACKET_LOCK = new Date('2026-06-11T18:00:00.000Z');
export const isBracketLocked = () => Date.now() >= BRACKET_LOCK.getTime();

export const GROUPS_LIST = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export const ROUND_LABELS = {
  r32:   'Round of 32',
  r16:   'Round of 16',
  qf:    'Quarter-finals',
  sf:    'Semi-finals',
  final: 'Final',
};

// ── R32 matchups (official FIFA WC 2026 bracket) ──────────────────────────────
// home / away are bracket-position descriptors, not team names yet.
// "3rd ABCDF" means: the 3rd-place qualifier from one of those groups.
export const R32 = [
  { id: 'r32_1',  home: '1st E',  away: '3rd ABCDF', date: 'Jun 29' },
  { id: 'r32_2',  home: '1st I',  away: '3rd CDFGH', date: 'Jun 29' },
  { id: 'r32_3',  home: '2nd A',  away: '2nd B',     date: 'Jun 30' },
  { id: 'r32_4',  home: '1st F',  away: '2nd C',     date: 'Jun 30' },
  { id: 'r32_5',  home: '2nd K',  away: '2nd L',     date: 'Jul 1'  },
  { id: 'r32_6',  home: '1st H',  away: '2nd J',     date: 'Jul 1'  },
  { id: 'r32_7',  home: '1st D',  away: '3rd BEFIJ', date: 'Jul 2'  },
  { id: 'r32_8',  home: '1st G',  away: '3rd AEHIJ', date: 'Jul 2'  },
  { id: 'r32_9',  home: '1st C',  away: '2nd F',     date: 'Jul 3'  },
  { id: 'r32_10', home: '2nd E',  away: '2nd I',     date: 'Jul 3'  },
  { id: 'r32_11', home: '1st A',  away: '3rd CEFHI', date: 'Jul 4'  },
  { id: 'r32_12', home: '1st L',  away: '3rd EHIJK', date: 'Jul 4'  },
  { id: 'r32_13', home: '1st J',  away: '2nd H',     date: 'Jul 4'  },
  { id: 'r32_14', home: '2nd D',  away: '2nd G',     date: 'Jul 4'  },
  { id: 'r32_15', home: '1st B',  away: '3rd ADFIJ', date: 'Jul 5'  },
  { id: 'r32_16', home: '1st K',  away: '3rd DEJL',  date: 'Jul 5'  },
];

// Which groups are eligible to supply the 3rd-place qualifier for each R32 slot
export const THIRD_SLOT_GROUPS = {
  r32_1:  ['A','B','C','D','F'],
  r32_2:  ['C','D','F','G','H'],
  r32_7:  ['B','E','F','I','J'],
  r32_8:  ['A','E','H','I','J'],
  r32_11: ['C','E','F','H','I'],
  r32_12: ['E','H','I','J','K'],
  r32_15: ['A','D','F','I','J'],
  r32_16: ['D','E','J','L'],
};

// ── Bracket progression tree ──────────────────────────────────────────────────
// Each entry says which two prior matches feed into this one.
export const BRACKET_TREE = [
  { id: 'r16_1', from: ['r32_1',  'r32_2'],  date: 'Jul 5'  },
  { id: 'r16_2', from: ['r32_3',  'r32_4'],  date: 'Jul 5'  },
  { id: 'r16_3', from: ['r32_5',  'r32_6'],  date: 'Jul 6'  },
  { id: 'r16_4', from: ['r32_7',  'r32_8'],  date: 'Jul 6'  },
  { id: 'r16_5', from: ['r32_9',  'r32_10'], date: 'Jul 7'  },
  { id: 'r16_6', from: ['r32_11', 'r32_12'], date: 'Jul 7'  },
  { id: 'r16_7', from: ['r32_13', 'r32_14'], date: 'Jul 8'  },
  { id: 'r16_8', from: ['r32_15', 'r32_16'], date: 'Jul 8'  },
  { id: 'qf_1',  from: ['r16_1',  'r16_2'],  date: 'Jul 10' },
  { id: 'qf_2',  from: ['r16_3',  'r16_4'],  date: 'Jul 10' },
  { id: 'qf_3',  from: ['r16_5',  'r16_6'],  date: 'Jul 11' },
  { id: 'qf_4',  from: ['r16_7',  'r16_8'],  date: 'Jul 11' },
  { id: 'sf_1',  from: ['qf_1',   'qf_2'],   date: 'Jul 14' },
  { id: 'sf_2',  from: ['qf_3',   'qf_4'],   date: 'Jul 15' },
  { id: 'final', from: ['sf_1',   'sf_2'],   date: 'Jul 19' },
];

// All match IDs in order (R32 first, then tree)
export const ALL_MATCH_IDS = [
  ...R32.map(m => m.id),
  ...BRACKET_TREE.map(m => m.id),
];

// ── Default group rankings (alphabetical order per official draw) ─────────────
export function defaultGroupPicks() {
  const picks = {};
  for (const [g, teams] of Object.entries(GROUPS)) picks[g] = [...teams];
  return picks;
}

// ── Assign user's 8 chosen 3rd-place teams to the 8 bracket slots ────────────
// Uses a greedy approach: for each slot, pick the first unassigned team
// whose group appears in the slot's eligible-groups list.
export function assignThirds(thirdPicks) {
  const assigned = {};
  const used = new Set();
  const slots = Object.keys(THIRD_SLOT_GROUPS);

  for (const slot of slots) {
    const eligible = THIRD_SLOT_GROUPS[slot];
    for (const team of thirdPicks) {
      if (!used.has(team) && eligible.includes(TEAM_GROUP[team] || '')) {
        assigned[slot] = team;
        used.add(team);
        break;
      }
    }
    // Fallback: if no eligible team available, take first unused
    if (!assigned[slot]) {
      for (const team of thirdPicks) {
        if (!used.has(team)) {
          assigned[slot] = team;
          used.add(team);
          break;
        }
      }
    }
  }
  return assigned;
}

// ── Resolve a bracket-position descriptor to an actual team name ──────────────
// matchId is needed to look up 3rd-place slot assignments.
export function resolveDescriptor(descriptor, matchId, groupPicks, thirdAssignments) {
  if (!descriptor) return null;

  // "1st A" or "2nd B"
  const m12 = descriptor.match(/^(1st|2nd)\s([A-L])$/);
  if (m12) {
    const [, pos, g] = m12;
    const ranking = groupPicks[g] || [];
    return pos === '1st' ? (ranking[0] || null) : (ranking[1] || null);
  }

  // "3rd ABCDF" → look up the assigned team for this match's slot
  if (descriptor.startsWith('3rd ') && matchId) {
    return thirdAssignments?.[matchId] || null;
  }

  return null;
}

// ── Get the two teams for any match in the full bracket ───────────────────────
// Returns { home: teamName|null, away: teamName|null }
export function getMatchTeams(matchId, groupPicks, thirdAssignments, knockoutPicks) {
  // R32
  const r32m = R32.find(m => m.id === matchId);
  if (r32m) {
    return {
      home: resolveDescriptor(r32m.home, matchId, groupPicks, thirdAssignments),
      away: resolveDescriptor(r32m.away, matchId, groupPicks, thirdAssignments),
    };
  }

  // R16 / QF / SF / Final — both teams are winners of prior matches
  const treem = BRACKET_TREE.find(m => m.id === matchId);
  if (treem) {
    return {
      home: knockoutPicks[treem.from[0]] || null,
      away: knockoutPicks[treem.from[1]] || null,
    };
  }

  return { home: null, away: null };
}

// ── Stage helpers ─────────────────────────────────────────────────────────────
export function matchIdToStage(id) {
  if (id.startsWith('r32'))   return 'r32';
  if (id.startsWith('r16'))   return 'r16';
  if (id.startsWith('qf'))    return 'qf';
  if (id.startsWith('sf'))    return 'sf';
  if (id === 'final')         return 'final';
  return null;
}

export function matchesForStage(stage) {
  if (stage === 'r32') return R32.map(m => m.id);
  return BRACKET_TREE.filter(m => matchIdToStage(m.id) === stage).map(m => m.id);
}

export function matchDate(id) {
  const r = R32.find(m => m.id === id) || BRACKET_TREE.find(m => m.id === id);
  return r?.date || '';
}

// ── Completion checks ─────────────────────────────────────────────────────────
export function groupsComplete(groupPicks) {
  return GROUPS_LIST.every(g => (groupPicks[g] || []).length === 4);
}

export function knockoutComplete(knockoutPicks) {
  return ALL_MATCH_IDS.every(id => !!knockoutPicks[id]);
}

// ── Scoring system ────────────────────────────────────────────────────────────

// Points per knockout round
export const KNOCKOUT_PTS = { r32: 1, r16: 2, qf: 4, sf: 8, final: 16, champion: 32 };

/**
 * Calculate bracket score given user picks and actual results.
 * actual = {
 *   groupStandings: { A: ['Mexico',...], B: [...], ... },  // actual final standings
 *   thirdQualifiers: ['Norway', 'Algeria', ...],           // 8 actual best 3rds
 *   knockoutResults: { r32_1: 'Germany', r16_1: 'France', ..., final: 'Argentina' }
 * }
 * Returns { total, breakdown: { groups, thirds, knockout } }
 */
export function calcBracketScore(userBracket, actual) {
  if (!actual) return { total: 0, breakdown: { groups: 0, thirds: 0, knockout: 0 } };

  let groups = 0, thirds = 0, knockout = 0;

  // Groups: +1 per correct position, +2 bonus if full group correct
  for (const g of GROUPS_LIST) {
    const user = userBracket.groupPicks[g] || [];
    const real = actual.groupStandings[g] || [];
    let correct = 0;
    for (let i = 0; i < 4; i++) {
      if (user[i] && user[i] === real[i]) correct++;
    }
    groups += correct;
    if (correct === 4) groups += 2;
  }

  // 3rds: +1 per correct qualifier, +1 if correct rank
  const realThirds = actual.thirdQualifiers || [];
  const userThirds = userBracket.thirdPicks || [];
  for (let i = 0; i < userThirds.length; i++) {
    const team = userThirds[i];
    if (realThirds.includes(team)) {
      thirds += 1; // correct qualifier
      if (realThirds[i] === team) thirds += 1; // correct rank
    }
  }

  // Knockout: per round points
  for (const id of ALL_MATCH_IDS) {
    const stage = matchIdToStage(id);
    const pts = KNOCKOUT_PTS[stage] || 0;
    if (userBracket.knockoutPicks[id] && actual.knockoutResults[id] &&
        userBracket.knockoutPicks[id] === actual.knockoutResults[id]) {
      knockout += pts;
    }
  }
  // Champion bonus
  if (userBracket.knockoutPicks['final'] && actual.knockoutResults['final'] &&
      userBracket.knockoutPicks['final'] === actual.knockoutResults['final']) {
    knockout += KNOCKOUT_PTS.champion;
  }

  return { total: groups + thirds + knockout, breakdown: { groups, thirds, knockout } };
}

// Build the "actual" knockout results per bracket slot (r32_1…final) from the
// real matches table, so the Bracket Challenge can score knockout picks.
//   `matches`   — rows from the matches table (need stage, winner, home/away_team, finished)
//   `standings` — map { A: [team1,team2,team3,team4], … } in final rank order
// Winner INCLUDES penalties (who actually advanced) — that's what the pick is.
export function buildKnockoutResults(matches, standings) {
  const results = {};
  if (!matches || !matches.length) return results;

  // descriptor ("1st E"/"2nd A") → R32 slot index 0..15 (fixed positions only)
  const descSlot = {};
  R32.forEach((slot, i) => {
    [slot.home, slot.away].forEach((d) => {
      if (/^(1st|2nd)\s/.test(d)) descSlot[d] = i;
    });
  });
  // team → descriptor from final group standings (rank 0 = 1st, 1 = 2nd)
  const teamDesc = {};
  Object.entries(standings || {}).forEach(([letter, teams]) => {
    if (teams?.[0]) teamDesc[teams[0]] = `1st ${letter}`;
    if (teams?.[1]) teamDesc[teams[1]] = `2nd ${letter}`;
  });
  // team → R32 slot: assign each R32 match's slot to BOTH its teams (covers thirds)
  const teamSlot = {};
  matches.filter((m) => m && m.stage === 'r32').forEach((m) => {
    let slot;
    [m.home_team, m.away_team].forEach((t) => {
      const d = teamDesc[t];
      if (d != null && descSlot[d] != null) slot = descSlot[d];
    });
    if (slot != null) {
      teamSlot[m.home_team] = slot;
      teamSlot[m.away_team] = slot;
    }
  });

  const LEVEL = { r32: 0, r16: 1, qf: 2, sf: 3, final: 4 };
  for (const m of matches) {
    if (!m || !m.finished) continue;
    const lvl = LEVEL[m.stage];
    if (lvl == null) continue; // skip group stage + 3rd-place playoff
    const winnerTeam = m.winner === 'home' ? m.home_team
                     : m.winner === 'away' ? m.away_team
                     : null;
    if (!winnerTeam) continue;
    if (m.stage === 'final') { results.final = winnerTeam; continue; }
    const slots = [m.home_team, m.away_team].map((t) => teamSlot[t]).filter((s) => s != null);
    if (!slots.length) continue;
    const pos = Math.floor(Math.min(...slots) / Math.pow(2, lvl));
    results[`${m.stage}_${pos + 1}`] = winnerTeam;
  }
  return results;
}
