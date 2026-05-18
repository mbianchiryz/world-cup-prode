/**
 * Scoring system (all stages):
 * - One team's exact goals (wrong result)  = 2 pts
 * - Correct result (W/D/L)                 = 3 pts
 * - Correct result + 1 team exact goals    = 5 pts  (3 + 2)
 * - Exact score (both teams correct)       = 7 pts  (3 + 2 + 2)
 * - Champion pick                          = 50 pts
 */

export function calcMatchPoints(pred, match) {
  if (!match.finished || match.home_score == null) return 0;

  const ph = Number(pred.home_score);
  const pa = Number(pred.away_score);
  const rh = Number(match.home_score);
  const ra = Number(match.away_score);

  const predResult = ph > pa ? 'W' : ph < pa ? 'L' : 'D';
  const realResult = rh > ra ? 'W' : rh < ra ? 'L' : 'D';

  // For knockout stages use the stored winner if available (could be penalties)
  const realWinner = match.winner
    ? match.winner === 'home' ? 'W' : 'L'
    : realResult;
  const effectiveReal = match.stage !== 'group' ? realWinner : realResult;

  const correctResult = predResult === effectiveReal;
  const exactHome = ph === rh;
  const exactAway = pa === ra;

  if (correctResult) {
    let pts = 3;
    if (exactHome) pts += 2;
    if (exactAway) pts += 2;
    return pts; // 3, 5, or 7
  }

  // Wrong result: still award 2 pts for each team's exact goals
  let pts = 0;
  if (exactHome) pts += 2;
  if (exactAway) pts += 2;
  return pts; // 0, 2, or 4
}

export function calcScore({ predictions, matches, championPred, champion }) {
  let group       = 0;
  let knockout    = 0;
  let championPts = 0;
  let exact       = 0; // 7-point predictions
  let result      = 0; // all other scoring predictions
  const predicted = predictions.length;

  for (const pred of predictions) {
    const match = matches.find((m) => m.id === pred.match_id);
    if (!match) continue;
    const pts = calcMatchPoints(pred, match);
    if (pts > 0) {
      if (match.stage === 'group') group += pts;
      else knockout += pts;
      if (pts === 7) exact++;
      else result++;
    }
  }

  if (champion && championPred && championPred.team === champion) {
    championPts = 50;
  }

  return {
    total: group + knockout + championPts,
    group,
    knockout,
    champion: championPts,
    exact,
    result,
    predicted,
  };
}
