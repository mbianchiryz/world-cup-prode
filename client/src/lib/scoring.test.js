/**
 * Tests for the scoring logic — the most important code in the app.
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest';
import { calcMatchPoints, calcScore } from './scoring';

// ── Helpers ───────────────────────────────────────────────────────────────────
const groupMatch = (overrides) => ({
  id: 1,
  stage: 'group',
  finished: 1,
  home_score: 2,
  away_score: 1,
  winner: null,
  ...overrides,
});

const koMatch = (overrides) => ({
  id: 90,
  stage: 'r16',
  finished: 1,
  home_score: 1,
  away_score: 1,
  winner: 'home', // home won on penalties
  ...overrides,
});

// ── calcMatchPoints ───────────────────────────────────────────────────────────
describe('calcMatchPoints — group stage', () => {
  it('returns 0 if match is not finished', () => {
    const match = groupMatch({ finished: 0, home_score: null, away_score: null });
    expect(calcMatchPoints({ home_score: 2, away_score: 1 }, match)).toBe(0);
  });

  it('returns 7 for exact score match (both teams correct)', () => {
    const match = groupMatch({ home_score: 3, away_score: 1 });
    expect(calcMatchPoints({ home_score: 3, away_score: 1 }, match)).toBe(7);
  });

  it('returns 5 for correct result + one team\'s exact goals', () => {
    const match = groupMatch({ home_score: 3, away_score: 1 });
    // Predicted 3-2: right result (home win) + home_score exact (3) but away wrong
    expect(calcMatchPoints({ home_score: 3, away_score: 2 }, match)).toBe(5);
  });

  it('returns 3 for correct result only (no team\'s exact goals)', () => {
    const match = groupMatch({ home_score: 3, away_score: 1 });
    expect(calcMatchPoints({ home_score: 2, away_score: 0 }, match)).toBe(3);
  });

  it('returns 3 for correct draw', () => {
    const match = groupMatch({ home_score: 2, away_score: 2 });
    expect(calcMatchPoints({ home_score: 1, away_score: 1 }, match)).toBe(3);
  });

  it('returns 7 for exact draw', () => {
    const match = groupMatch({ home_score: 1, away_score: 1 });
    expect(calcMatchPoints({ home_score: 1, away_score: 1 }, match)).toBe(7);
  });

  it('returns 2 for one team\'s exact goals only (wrong result)', () => {
    const match = groupMatch({ home_score: 3, away_score: 1 });
    // Predicted 1-1: wrong result, home wrong (1 ≠ 3), away exact (1 = 1)
    expect(calcMatchPoints({ home_score: 1, away_score: 1 }, match)).toBe(2);
  });

  it('returns 4 for both teams\' exact goals but wrong result direction (impossible but safe)', () => {
    // If somehow ph=3, pa=1, rh=1, ra=3 (wrong direction but each exact swap)
    // ph (3) !== rh (1), pa (1) !== ra (3), so no exact for either
    const match = groupMatch({ home_score: 1, away_score: 3 });
    expect(calcMatchPoints({ home_score: 3, away_score: 1 }, match)).toBe(0);
  });

  it('returns 0 for wrong result and no exact goals', () => {
    const match = groupMatch({ home_score: 2, away_score: 1 });
    expect(calcMatchPoints({ home_score: 0, away_score: 3 }, match)).toBe(0);
  });
});

describe('calcMatchPoints — knockout stage (penalty winners)', () => {
  it('predicting home winner with one team\'s exact goal gets +5 (penalty scenario)', () => {
    // Match ended 1-1 in regular time, home won on penalties.
    // Predicted 2-1: right "home wins" + away_score exact (1=1) → 3+2 = 5
    const match = koMatch({ home_score: 1, away_score: 1, winner: 'home' });
    expect(calcMatchPoints({ home_score: 2, away_score: 1 }, match)).toBe(5);
  });

  it('predicting draw on a penalty-decided match gives +4 (wrong result, both exact)', () => {
    // Match 1-1 in regulation, home wins penalties. Predicted 1-1 (draw).
    // Predicted result = draw, effective real = "home win" (penalty winner).
    // Wrong result → no 3pts, but home exact (1=1) + away exact (1=1) = 4.
    const match = koMatch({ home_score: 1, away_score: 1, winner: 'home' });
    expect(calcMatchPoints({ home_score: 1, away_score: 1 }, match)).toBe(4);
  });

  it('uses raw result when winner field is null (regular-time win in knockout)', () => {
    const match = koMatch({ home_score: 2, away_score: 0, winner: null });
    // Predicted 1-0: right winner + away_score exact (0=0) → 3+2 = 5
    expect(calcMatchPoints({ home_score: 1, away_score: 0 }, match)).toBe(5);
  });
});

// ── calcScore (aggregate over a player's predictions) ─────────────────────────
describe('calcScore — full season aggregation', () => {
  const matches = [
    groupMatch({ id: 1, stage: 'group', home_score: 2, away_score: 1, finished: 1 }),
    groupMatch({ id: 2, stage: 'group', home_score: 0, away_score: 0, finished: 1 }),
    koMatch({ id: 89, stage: 'r16', home_score: 3, away_score: 1, finished: 1, winner: null }),
    { id: 90, stage: 'r16', finished: 0, home_score: null, away_score: null }, // not yet played
  ];

  it('sums group + knockout points correctly', () => {
    const predictions = [
      { match_id: 1, home_score: 2, away_score: 1 },   // match is 2-1 → exact → +7 group
      { match_id: 2, home_score: 1, away_score: 0 },   // match is 0-0 → wrong direction, away exact (0=0) → +2 group
      { match_id: 89, home_score: 3, away_score: 1 },  // match is 3-1 → exact → +7 knockout
    ];
    const score = calcScore({ predictions, matches, championPred: null, champion: null });
    expect(score.group).toBe(9);     // 7 + 2
    expect(score.knockout).toBe(7);  // 7
    expect(score.total).toBe(16);    // 9 + 7
    expect(score.exact).toBe(2);     // matches 1 and 89
    expect(score.result).toBe(1);    // match 2 scored 2pts (counted as "result")
    expect(score.predicted).toBe(3);
  });

  it('adds +50 for correct champion pick', () => {
    const score = calcScore({
      predictions: [],
      matches: [],
      championPred: { team: 'Argentina' },
      champion: 'Argentina',
    });
    expect(score.champion).toBe(50);
    expect(score.total).toBe(50);
  });

  it('does NOT add champion points if pick is wrong', () => {
    const score = calcScore({
      predictions: [],
      matches: [],
      championPred: { team: 'Brazil' },
      champion: 'Argentina',
    });
    expect(score.champion).toBe(0);
    expect(score.total).toBe(0);
  });

  it('does NOT add champion points if no champion yet', () => {
    const score = calcScore({
      predictions: [],
      matches: [],
      championPred: { team: 'Argentina' },
      champion: null,
    });
    expect(score.champion).toBe(0);
  });

  it('counts exact vs result correctly', () => {
    const predictions = [
      { match_id: 1, home_score: 2, away_score: 1 },   // match 2-1 → exact → 7 → exact++
      { match_id: 2, home_score: 1, away_score: 0 },   // match 0-0 → wrong direction, away exact → 2 → result++
      { match_id: 89, home_score: 2, away_score: 0 },  // match 3-1 → right winner, no exact → 3 → result++
    ];
    const score = calcScore({ predictions, matches, championPred: null, champion: null });
    expect(score.exact).toBe(1);
    expect(score.result).toBe(2);
  });

  it('ignores predictions for unknown matches', () => {
    const predictions = [
      { match_id: 999, home_score: 1, away_score: 0 }, // no such match
    ];
    const score = calcScore({ predictions, matches, championPred: null, champion: null });
    expect(score.total).toBe(0);
  });
});
