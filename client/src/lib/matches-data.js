/**
 * FIFA World Cup 2026 – Official Match Schedule
 * Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
 * Groups from the draw held on December 5, 2025 at the Kennedy Center, Washington D.C.
 * Kick-off times are approximate UTC values (official times TBC by FIFA).
 * 48 teams · 12 groups · 104 matches · June 11 – July 19, 2026
 */

// ── Flag emoji map ────────────────────────────────────────────────────────────
export const TEAM_FLAGS = {
  'Mexico':                                 '🇲🇽',
  'South Africa':                           '🇿🇦',
  'Korea Republic':                         '🇰🇷',
  'Canada':                                 '🇨🇦',
  'Qatar':                                  '🇶🇦',
  'Switzerland':                            '🇨🇭',
  'Haiti':                                  '🇭🇹',
  'Scotland':                               '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Brazil':                                 '🇧🇷',
  'Morocco':                                '🇲🇦',
  'USA':                                    '🇺🇸',
  'Paraguay':                               '🇵🇾',
  'Australia':                              '🇦🇺',
  "Côte d'Ivoire":                          '🇨🇮',
  'Ecuador':                                '🇪🇨',
  'Germany':                                '🇩🇪',
  'Curaçao':                                '🇨🇼',
  'Netherlands':                            '🇳🇱',
  'Japan':                                  '🇯🇵',
  'Tunisia':                                '🇹🇳',
  'Saudi Arabia':                           '🇸🇦',
  'Uruguay':                                '🇺🇾',
  'Spain':                                  '🇪🇸',
  'Cabo Verde':                             '🇨🇻',
  'IR Iran':                                '🇮🇷',
  'New Zealand':                            '🇳🇿',
  'Belgium':                                '🇧🇪',
  'Egypt':                                  '🇪🇬',
  'France':                                 '🇫🇷',
  'Senegal':                                '🇸🇳',
  'Norway':                                 '🇳🇴',
  'Argentina':                              '🇦🇷',
  'Algeria':                                '🇩🇿',
  'Austria':                                '🇦🇹',
  'Jordan':                                 '🇯🇴',
  'Ghana':                                  '🇬🇭',
  'Panama':                                 '🇵🇦',
  'England':                                '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia':                                '🇭🇷',
  'Portugal':                               '🇵🇹',
  'Uzbekistan':                             '🇺🇿',
  'Colombia':                               '🇨🇴',
  'Czechia':                                '🇨🇿',
  'Bosnia and Herzegovina':                 '🇧🇦',
  'Türkiye':                                '🇹🇷',
  'Sweden':                                 '🇸🇪',
  'Iraq':                                   '🇮🇶',
  'Congo DR':                               '🇨🇩',
  // ── api-football alternate spellings ─────────────────────────────────────
  'South Korea':                            '🇰🇷',
  'Czech Republic':                         '🇨🇿',
  'Turkey':                                 '🇹🇷',
  'Iran':                                   '🇮🇷',
  'DR Congo':                               '🇨🇩',
  'Cape Verde':                             '🇨🇻',
  'Ivory Coast':                            '🇨🇮',
  "Cote d'Ivoire":                          '🇨🇮',
  'Curacao':                                '🇨🇼',
  'Bosnia & Herzegovina':                   '🇧🇦',
  'United States':                          '🇺🇸',
};

// ── 3-letter abbreviation map ─────────────────────────────────────────────────
export const TEAM_ABBR = {
  'Mexico':                    'MEX',
  'South Africa':              'RSA',
  'Korea Republic':            'KOR',
  'Czechia':                   'CZE',
  'Canada':                    'CAN',
  'Bosnia and Herzegovina':    'BIH',
  'Qatar':                     'QAT',
  'Switzerland':               'SUI',
  'Haiti':                     'HAI',
  'Scotland':                  'SCO',
  'Brazil':                    'BRA',
  'Morocco':                   'MAR',
  'USA':                       'USA',
  'Paraguay':                  'PAR',
  'Australia':                 'AUS',
  'Türkiye':                   'TUR',
  "Côte d'Ivoire":             'CIV',
  'Ecuador':                   'ECU',
  'Germany':                   'GER',
  'Curaçao':                   'CUW',
  'Netherlands':               'NED',
  'Japan':                     'JPN',
  'Sweden':                    'SWE',
  'Tunisia':                   'TUN',
  'Saudi Arabia':              'KSA',
  'Uruguay':                   'URU',
  'Spain':                     'ESP',
  'Cabo Verde':                'CPV',
  'IR Iran':                   'IRN',
  'New Zealand':               'NZL',
  'Belgium':                   'BEL',
  'Egypt':                     'EGY',
  'France':                    'FRA',
  'Senegal':                   'SEN',
  'Iraq':                      'IRQ',
  'Norway':                    'NOR',
  'Argentina':                 'ARG',
  'Algeria':                   'ALG',
  'Austria':                   'AUT',
  'Jordan':                    'JOR',
  'Ghana':                     'GHA',
  'Panama':                    'PAN',
  'England':                   'ENG',
  'Croatia':                   'CRO',
  'Portugal':                  'POR',
  'Uzbekistan':                'UZB',
  'Colombia':                  'COL',
  'Congo DR':                  'COD',
  // api-football alternates
  'South Korea':               'KOR',
  'Czech Republic':            'CZE',
  'Turkey':                    'TUR',
  'Iran':                      'IRN',
  'DR Congo':                  'COD',
  'Cape Verde':                'CPV',
  'Ivory Coast':               'CIV',
  "Cote d'Ivoire":             'CIV',
  'Curacao':                   'CUW',
  'Bosnia & Herzegovina':      'BIH',
  'United States':             'USA',
};

/** Returns the 3-letter abbreviation for a known team, or the first 3 chars as fallback */
export function getAbbr(teamName) {
  if (!teamName) return '?';
  return TEAM_ABBR[teamName] ?? teamName.slice(0, 3).toUpperCase();
}

/** Returns the flag emoji for a known team, or '' for placeholder/TBD entries */
export function getFlag(teamName) {
  return TEAM_FLAGS[teamName] ?? '';
}

// ── Groups (official draw, Dec 5 2025) ───────────────────────────────────────
// All 48 teams confirmed (playoffs concluded March 2026)
export const GROUPS = {
  A: ['Mexico',         'South Africa',           'Korea Republic',      'Czechia'],
  B: ['Canada',         'Bosnia and Herzegovina', 'Qatar',               'Switzerland'],
  C: ['Haiti',          'Scotland',               'Brazil',              'Morocco'],
  D: ['USA',            'Paraguay',               'Australia',           'Türkiye'],
  E: ["Côte d'Ivoire",  'Ecuador',                'Germany',             'Curaçao'],
  F: ['Netherlands',    'Japan',                  'Sweden',              'Tunisia'],
  G: ['IR Iran',        'New Zealand',            'Belgium',             'Egypt'],
  H: ['Saudi Arabia',   'Uruguay',                'Spain',               'Cabo Verde'],
  I: ['France',         'Senegal',                'Iraq',                'Norway'],
  J: ['Argentina',      'Algeria',                'Austria',             'Jordan'],
  K: ['Portugal',       'Congo DR',               'Uzbekistan',          'Colombia'],
  L: ['Ghana',          'Panama',                 'England',             'Croatia'],
};

/** Flat list of all 48 teams (including playoff placeholders) */
export const ALL_TEAMS = Object.values(GROUPS).flat();

export const STAGE_LABELS = {
  group:  'Group Stage',
  r32:    'Round of 32',
  r16:    'Round of 16',
  qf:     'Quarter-finals',
  sf:     'Semi-finals',
  '3rd':  '3rd Place Play-off',
  final:  'Final',
};

// ── Helper: build a UTC ISO date string ──────────────────────────────────────
function dt(dateStr, utcHour) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.toISOString();
}

// ── Complete 104-match schedule ───────────────────────────────────────────────
export function getMatchesData() {
  return [

    // ═══════════════════════════════════════════════════════════════════════
    // GROUP STAGE – MATCHDAY 1
    // ═══════════════════════════════════════════════════════════════════════

    // Thursday 11 June – Group A
    { id:  1, stage: 'group', group_name: 'A', matchday: 1, home_team: 'Mexico',       away_team: 'South Africa',                     match_time: dt('2026-06-11', 20) },
    { id:  2, stage: 'group', group_name: 'A', matchday: 1, home_team: 'Korea Republic', away_team: 'Czechia', match_time: dt('2026-06-11', 23) },

    // Friday 12 June – Groups B + D
    { id:  3, stage: 'group', group_name: 'B', matchday: 1, home_team: 'Canada',       away_team: 'Bosnia and Herzegovina',   match_time: dt('2026-06-12', 20) },
    { id:  4, stage: 'group', group_name: 'D', matchday: 1, home_team: 'USA',           away_team: 'Paraguay',                         match_time: dt('2026-06-12', 23) },

    // Saturday 13 June – Groups C + D + B
    { id:  5, stage: 'group', group_name: 'C', matchday: 1, home_team: 'Haiti',        away_team: 'Scotland',                         match_time: dt('2026-06-13', 14) },
    { id:  6, stage: 'group', group_name: 'D', matchday: 1, home_team: 'Australia',    away_team: 'Türkiye',   match_time: dt('2026-06-13', 17) },
    { id:  7, stage: 'group', group_name: 'C', matchday: 1, home_team: 'Brazil',       away_team: 'Morocco',                          match_time: dt('2026-06-13', 20) },
    { id:  8, stage: 'group', group_name: 'B', matchday: 1, home_team: 'Qatar',        away_team: 'Switzerland',                      match_time: dt('2026-06-13', 23) },

    // Sunday 14 June – Groups E + F
    { id:  9, stage: 'group', group_name: 'E', matchday: 1, home_team: "Côte d'Ivoire", away_team: 'Ecuador',                         match_time: dt('2026-06-14', 14) },
    { id: 10, stage: 'group', group_name: 'E', matchday: 1, home_team: 'Germany',      away_team: 'Curaçao',                          match_time: dt('2026-06-14', 17) },
    { id: 11, stage: 'group', group_name: 'F', matchday: 1, home_team: 'Netherlands',  away_team: 'Japan',                            match_time: dt('2026-06-14', 20) },
    { id: 12, stage: 'group', group_name: 'F', matchday: 1, home_team: 'Sweden', away_team: 'Tunisia',         match_time: dt('2026-06-14', 23) },

    // Monday 15 June – Groups H + G
    { id: 13, stage: 'group', group_name: 'H', matchday: 1, home_team: 'Saudi Arabia', away_team: 'Uruguay',                         match_time: dt('2026-06-15', 14) },
    { id: 14, stage: 'group', group_name: 'H', matchday: 1, home_team: 'Spain',        away_team: 'Cabo Verde',                       match_time: dt('2026-06-15', 17) },
    { id: 15, stage: 'group', group_name: 'G', matchday: 1, home_team: 'IR Iran',      away_team: 'New Zealand',                      match_time: dt('2026-06-15', 20) },
    { id: 16, stage: 'group', group_name: 'G', matchday: 1, home_team: 'Belgium',      away_team: 'Egypt',                            match_time: dt('2026-06-15', 23) },

    // Tuesday 16 June – Groups I + J
    { id: 17, stage: 'group', group_name: 'I', matchday: 1, home_team: 'France',       away_team: 'Senegal',                          match_time: dt('2026-06-16', 14) },
    { id: 18, stage: 'group', group_name: 'I', matchday: 1, home_team: 'Iraq', away_team: 'Norway',                  match_time: dt('2026-06-16', 17) },
    { id: 19, stage: 'group', group_name: 'J', matchday: 1, home_team: 'Argentina',    away_team: 'Algeria',                          match_time: dt('2026-06-16', 20) },
    { id: 20, stage: 'group', group_name: 'J', matchday: 1, home_team: 'Austria',      away_team: 'Jordan',                           match_time: dt('2026-06-16', 23) },

    // Wednesday 17 June – Groups L + K
    { id: 21, stage: 'group', group_name: 'L', matchday: 1, home_team: 'Ghana',        away_team: 'Panama',                           match_time: dt('2026-06-17', 14) },
    { id: 22, stage: 'group', group_name: 'L', matchday: 1, home_team: 'England',      away_team: 'Croatia',                          match_time: dt('2026-06-17', 17) },
    { id: 23, stage: 'group', group_name: 'K', matchday: 1, home_team: 'Portugal',     away_team: 'Congo DR',    match_time: dt('2026-06-17', 20) },
    { id: 24, stage: 'group', group_name: 'K', matchday: 1, home_team: 'Uzbekistan',   away_team: 'Colombia',                         match_time: dt('2026-06-17', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // GROUP STAGE – MATCHDAY 2
    // ═══════════════════════════════════════════════════════════════════════

    // Thursday 18 June – Groups A + B
    { id: 25, stage: 'group', group_name: 'A', matchday: 2, home_team: 'Czechia', away_team: 'South Africa', match_time: dt('2026-06-18', 14) },
    { id: 26, stage: 'group', group_name: 'B', matchday: 2, home_team: 'Switzerland',  away_team: 'Bosnia and Herzegovina',   match_time: dt('2026-06-18', 17) },
    { id: 27, stage: 'group', group_name: 'B', matchday: 2, home_team: 'Canada',       away_team: 'Qatar',                            match_time: dt('2026-06-18', 20) },
    { id: 28, stage: 'group', group_name: 'A', matchday: 2, home_team: 'Mexico',       away_team: 'Korea Republic',                   match_time: dt('2026-06-18', 23) },

    // Friday 19 June – Groups C + D
    { id: 29, stage: 'group', group_name: 'C', matchday: 2, home_team: 'Brazil',       away_team: 'Haiti',                            match_time: dt('2026-06-19', 14) },
    { id: 30, stage: 'group', group_name: 'C', matchday: 2, home_team: 'Scotland',     away_team: 'Morocco',                          match_time: dt('2026-06-19', 17) },
    { id: 31, stage: 'group', group_name: 'D', matchday: 2, home_team: 'Türkiye', away_team: 'Paraguay',       match_time: dt('2026-06-19', 20) },
    { id: 32, stage: 'group', group_name: 'D', matchday: 2, home_team: 'USA',          away_team: 'Australia',                        match_time: dt('2026-06-19', 23) },

    // Saturday 20 June – Groups E + F
    { id: 33, stage: 'group', group_name: 'E', matchday: 2, home_team: 'Germany',      away_team: "Côte d'Ivoire",                    match_time: dt('2026-06-20', 14) },
    { id: 34, stage: 'group', group_name: 'E', matchday: 2, home_team: 'Ecuador',      away_team: 'Curaçao',                          match_time: dt('2026-06-20', 17) },
    { id: 35, stage: 'group', group_name: 'F', matchday: 2, home_team: 'Netherlands',  away_team: 'Sweden',     match_time: dt('2026-06-20', 20) },
    { id: 36, stage: 'group', group_name: 'F', matchday: 2, home_team: 'Tunisia',      away_team: 'Japan',                            match_time: dt('2026-06-20', 23) },

    // Sunday 21 June – Groups H + G
    { id: 37, stage: 'group', group_name: 'H', matchday: 2, home_team: 'Uruguay',      away_team: 'Cabo Verde',                       match_time: dt('2026-06-21', 14) },
    { id: 38, stage: 'group', group_name: 'H', matchday: 2, home_team: 'Spain',        away_team: 'Saudi Arabia',                     match_time: dt('2026-06-21', 17) },
    { id: 39, stage: 'group', group_name: 'G', matchday: 2, home_team: 'Belgium',      away_team: 'IR Iran',                          match_time: dt('2026-06-21', 20) },
    { id: 40, stage: 'group', group_name: 'G', matchday: 2, home_team: 'New Zealand',  away_team: 'Egypt',                            match_time: dt('2026-06-21', 23) },

    // Monday 22 June – Groups I + J
    { id: 41, stage: 'group', group_name: 'I', matchday: 2, home_team: 'Norway',       away_team: 'Senegal',                          match_time: dt('2026-06-22', 14) },
    { id: 42, stage: 'group', group_name: 'I', matchday: 2, home_team: 'France',       away_team: 'Iraq',             match_time: dt('2026-06-22', 17) },
    { id: 43, stage: 'group', group_name: 'J', matchday: 2, home_team: 'Argentina',    away_team: 'Austria',                          match_time: dt('2026-06-22', 20) },
    { id: 44, stage: 'group', group_name: 'J', matchday: 2, home_team: 'Jordan',       away_team: 'Algeria',                          match_time: dt('2026-06-22', 23) },

    // Tuesday 23 June – Groups L + K
    { id: 45, stage: 'group', group_name: 'L', matchday: 2, home_team: 'England',      away_team: 'Ghana',                            match_time: dt('2026-06-23', 14) },
    { id: 46, stage: 'group', group_name: 'L', matchday: 2, home_team: 'Panama',       away_team: 'Croatia',                          match_time: dt('2026-06-23', 17) },
    { id: 47, stage: 'group', group_name: 'K', matchday: 2, home_team: 'Portugal',     away_team: 'Uzbekistan',                       match_time: dt('2026-06-23', 20) },
    { id: 48, stage: 'group', group_name: 'K', matchday: 2, home_team: 'Colombia',     away_team: 'Congo DR',    match_time: dt('2026-06-23', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // GROUP STAGE – MATCHDAY 3 (simultaneous pairs within each group)
    // ═══════════════════════════════════════════════════════════════════════

    // Wednesday 24 June – Groups C · B · A  (pairs play simultaneously)
    { id: 49, stage: 'group', group_name: 'C', matchday: 3, home_team: 'Scotland',     away_team: 'Brazil',                           match_time: dt('2026-06-24', 17) },
    { id: 50, stage: 'group', group_name: 'C', matchday: 3, home_team: 'Morocco',      away_team: 'Haiti',                            match_time: dt('2026-06-24', 17) },
    { id: 51, stage: 'group', group_name: 'B', matchday: 3, home_team: 'Switzerland',  away_team: 'Canada',                           match_time: dt('2026-06-24', 20) },
    { id: 52, stage: 'group', group_name: 'B', matchday: 3, home_team: 'Bosnia and Herzegovina', away_team: 'Qatar',         match_time: dt('2026-06-24', 20) },
    { id: 53, stage: 'group', group_name: 'A', matchday: 3, home_team: 'Czechia', away_team: 'Mexico',  match_time: dt('2026-06-24', 23) },
    { id: 54, stage: 'group', group_name: 'A', matchday: 3, home_team: 'South Africa', away_team: 'Korea Republic',                   match_time: dt('2026-06-24', 23) },

    // Thursday 25 June – Groups D · E · F
    { id: 55, stage: 'group', group_name: 'D', matchday: 3, home_team: 'Türkiye', away_team: 'USA',           match_time: dt('2026-06-25', 17) },
    { id: 56, stage: 'group', group_name: 'D', matchday: 3, home_team: 'Paraguay',     away_team: 'Australia',                        match_time: dt('2026-06-25', 17) },
    { id: 57, stage: 'group', group_name: 'E', matchday: 3, home_team: 'Curaçao',      away_team: "Côte d'Ivoire",                    match_time: dt('2026-06-25', 20) },
    { id: 58, stage: 'group', group_name: 'E', matchday: 3, home_team: 'Ecuador',      away_team: 'Germany',                          match_time: dt('2026-06-25', 20) },
    { id: 59, stage: 'group', group_name: 'F', matchday: 3, home_team: 'Japan',        away_team: 'Sweden',     match_time: dt('2026-06-25', 23) },
    { id: 60, stage: 'group', group_name: 'F', matchday: 3, home_team: 'Tunisia',      away_team: 'Netherlands',                      match_time: dt('2026-06-25', 23) },

    // Friday 26 June – Groups G · H · I
    { id: 61, stage: 'group', group_name: 'G', matchday: 3, home_team: 'Egypt',        away_team: 'IR Iran',                          match_time: dt('2026-06-26', 17) },
    { id: 62, stage: 'group', group_name: 'G', matchday: 3, home_team: 'New Zealand',  away_team: 'Belgium',                          match_time: dt('2026-06-26', 17) },
    { id: 63, stage: 'group', group_name: 'H', matchday: 3, home_team: 'Cabo Verde',   away_team: 'Saudi Arabia',                     match_time: dt('2026-06-26', 20) },
    { id: 64, stage: 'group', group_name: 'H', matchday: 3, home_team: 'Uruguay',      away_team: 'Spain',                            match_time: dt('2026-06-26', 20) },
    { id: 65, stage: 'group', group_name: 'I', matchday: 3, home_team: 'Norway',       away_team: 'France',                           match_time: dt('2026-06-26', 23) },
    { id: 66, stage: 'group', group_name: 'I', matchday: 3, home_team: 'Senegal',      away_team: 'Iraq',             match_time: dt('2026-06-26', 23) },

    // Saturday 27 June – Groups J · K · L
    { id: 67, stage: 'group', group_name: 'J', matchday: 3, home_team: 'Algeria',      away_team: 'Austria',                          match_time: dt('2026-06-27', 17) },
    { id: 68, stage: 'group', group_name: 'J', matchday: 3, home_team: 'Jordan',       away_team: 'Argentina',                        match_time: dt('2026-06-27', 17) },
    { id: 69, stage: 'group', group_name: 'K', matchday: 3, home_team: 'Colombia',     away_team: 'Portugal',                         match_time: dt('2026-06-27', 20) },
    { id: 70, stage: 'group', group_name: 'K', matchday: 3, home_team: 'Congo DR', away_team: 'Uzbekistan',     match_time: dt('2026-06-27', 20) },
    { id: 71, stage: 'group', group_name: 'L', matchday: 3, home_team: 'Panama',       away_team: 'England',                          match_time: dt('2026-06-27', 23) },
    { id: 72, stage: 'group', group_name: 'L', matchday: 3, home_team: 'Croatia',      away_team: 'Ghana',                            match_time: dt('2026-06-27', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // ROUND OF 32  (June 28 – July 3)
    // Official bracket per FIFA 2026 regulations.
    // 32 teams: 1st + 2nd of each of 12 groups (24) + 8 best third-placed teams.
    // ═══════════════════════════════════════════════════════════════════════
    { id: 73, stage: 'r32', group_name: null, matchday: null, home_team: '2nd Group A',        away_team: '2nd Group B',           match_time: dt('2026-06-28', 20) },
    { id: 74, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group E',        away_team: 'Best 3rd (A/B/C/D/F)', match_time: dt('2026-06-29', 17) },
    { id: 75, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group F',        away_team: '2nd Group C',           match_time: dt('2026-06-29', 20) },
    { id: 76, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group C',        away_team: '2nd Group F',           match_time: dt('2026-06-29', 23) },
    { id: 77, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group I',        away_team: 'Best 3rd (C/D/F/G/H)', match_time: dt('2026-06-30', 17) },
    { id: 78, stage: 'r32', group_name: null, matchday: null, home_team: '2nd Group E',        away_team: '2nd Group I',           match_time: dt('2026-06-30', 20) },
    { id: 79, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group A',        away_team: 'Best 3rd (C/E/F/H/I)', match_time: dt('2026-06-30', 23) },
    { id: 80, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group L',        away_team: 'Best 3rd (E/H/I/J/K)', match_time: dt('2026-07-01', 17) },
    { id: 81, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group D',        away_team: 'Best 3rd (B/E/F/I/J)', match_time: dt('2026-07-01', 20) },
    { id: 82, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group G',        away_team: 'Best 3rd (A/E/H/I/J)', match_time: dt('2026-07-01', 23) },
    { id: 83, stage: 'r32', group_name: null, matchday: null, home_team: '2nd Group K',        away_team: '2nd Group L',           match_time: dt('2026-07-02', 17) },
    { id: 84, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group H',        away_team: '2nd Group J',           match_time: dt('2026-07-02', 20) },
    { id: 85, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group B',        away_team: 'Best 3rd (E/F/G/I/J)', match_time: dt('2026-07-02', 23) },
    { id: 86, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group J',        away_team: '2nd Group H',           match_time: dt('2026-07-03', 17) },
    { id: 87, stage: 'r32', group_name: null, matchday: null, home_team: '1st Group K',        away_team: 'Best 3rd (D/E/I/J/L)', match_time: dt('2026-07-03', 20) },
    { id: 88, stage: 'r32', group_name: null, matchday: null, home_team: '2nd Group D',        away_team: '2nd Group G',           match_time: dt('2026-07-03', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // ROUND OF 16  (July 4 – 7)
    // M89=W74vsW77 · M90=W73vsW75 · M91=W76vsW78 · M92=W79vsW80
    // M93=W83vsW84 · M94=W81vsW82 · M95=W86vsW88 · M96=W85vsW87
    // ═══════════════════════════════════════════════════════════════════════
    { id: 89,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-04', 20) },
    { id: 90,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-04', 23) },
    { id: 91,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-05', 20) },
    { id: 92,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-05', 23) },
    { id: 93,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-06', 20) },
    { id: 94,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-06', 23) },
    { id: 95,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-07', 20) },
    { id: 96,  stage: 'r16', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-07', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // QUARTER-FINALS  (July 9 – 11)
    // M97=W89vsW90 · M98=W93vsW94 · M99=W91vsW92 · M100=W95vsW96
    // ═══════════════════════════════════════════════════════════════════════
    { id: 97,  stage: 'qf',  group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-09', 20) },
    { id: 98,  stage: 'qf',  group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-10', 20) },
    { id: 99,  stage: 'qf',  group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-11', 20) },
    { id: 100, stage: 'qf',  group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-11', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // SEMI-FINALS  (July 14 – 15)
    // M101=W97vsW98 · M102=W99vsW100
    // ═══════════════════════════════════════════════════════════════════════
    { id: 101, stage: 'sf',   group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-14', 23) },
    { id: 102, stage: 'sf',   group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-15', 23) },

    // ═══════════════════════════════════════════════════════════════════════
    // 3RD PLACE PLAY-OFF  (July 18)
    // M103=L101vsL102
    // ═══════════════════════════════════════════════════════════════════════
    { id: 103, stage: '3rd',  group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-18', 20) },

    // ═══════════════════════════════════════════════════════════════════════
    // FINAL  (July 19 – MetLife Stadium, New York / New Jersey)
    // M104=W101vsW102
    // ═══════════════════════════════════════════════════════════════════════
    { id: 104, stage: 'final', group_name: null, matchday: null, home_team: 'TBD', away_team: 'TBD', match_time: dt('2026-07-19', 20) },
  ];
}
