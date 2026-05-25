/**
 * Client-side scoring logic (mirrors server/lib/scoring.js exactly).
 * Pure functions — no imports needed.
 */

/**
 * Returns true when the prediction chose the correct result direction
 * (home win / away win / draw), independent of exact scores.
 */
export function isCorrectResult(pred, match) {
  if (!match.finished || match.home_score == null || !pred) return false;
  const ph = Number(pred.home_score);
  const pa = Number(pred.away_score);
  const rh = Number(match.home_score);
  const ra = Number(match.away_score);
  const predDir = ph > pa ? 'W' : ph < pa ? 'L' : 'D';
  const realDir  = rh > ra ? 'W' : rh < ra ? 'L' : 'D';
  // For knockout, respect the 'winner' override (extra time / penalties)
  const effectiveReal = match.stage !== 'group' && match.winner
    ? (match.winner === 'home' ? 'W' : 'L')
    : realDir;
  return predDir === effectiveReal;
}

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
  let group = 0, knockout = 0, championPts = 0, exact = 0, result = 0, correct = 0;
  const predicted = predictions.length;

  for (const pred of predictions) {
    const match = matches.find((m) => m.id === pred.match_id);
    if (!match) continue;
    const pts = calcMatchPoints(pred, match);
    if (pts > 0) {
      if (match.stage === 'group') group += pts; else knockout += pts;
      if (pts === 7) exact++; else result++;
    }
    // 'correct' = direction right (home win / away win / draw), regardless of exact scores
    if (isCorrectResult(pred, match)) correct++;
  }

  if (champion && championPred && championPred.team === champion) championPts = 50;

  return { total: group + knockout + championPts, group, knockout, champion: championPts, exact, result, correct, predicted };
}
