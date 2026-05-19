/**
 * Client-side scoring logic (mirrors server/lib/scoring.js exactly).
 * Pure functions — no imports needed.
 */

export function calcMatchPoints(pred, match) {
  if (!match.finished || match.home_score == null) return 0;

  const ph = Number(pred.home_score);
  const pa = Number(pred.away_score);
  const rh = Number(match.home_score);
  const ra = Number(match.away_score);

  const predResult = ph > pa ? 'W' : ph < pa ? 'L' : 'D';
  const realResult = rh > ra ? 'W' : rh < ra ? 'L' : 'D';

  const realWinner = match.winner
    ? match.winner === 'home' ? 'W' : 'L'
    : realResult;
  const effectiveReal = match.stage !== 'group' ? realWinner : realResult;

  const correctResult = predResult === effectiveReal;
  const exactHome     = ph === rh;
  const exactAway     = pa === ra;

  if (correctResult) {
    let pts = 3;
    if (exactHome) pts += 2;
    if (exactAway) pts += 2;
    return pts;
  }

  let pts = 0;
  if (exactHome) pts += 2;
  if (exactAway) pts += 2;
  return pts;
}

export function calcScore({ predictions, matches, championPred, champion }) {
  let group = 0, knockout = 0, championPts = 0, exact = 0, result = 0;
  const predicted = predictions.length;

  for (const pred of predictions) {
    const match = matches.find((m) => m.id === pred.match_id);
    if (!match) continue;
    const pts = calcMatchPoints(pred, match);
    if (pts > 0) {
      if (match.stage === 'group') group += pts; else knockout += pts;
      if (pts === 7) exact++; else result++;
    }
  }

  if (champion && championPred && championPred.team === champion) championPts = 50;

  return { total: group + knockout + championPts, group, knockout, champion: championPts, exact, result, predicted };
}
