-- Migration 011: Lock down predictions visibility (anti-cheat)
--
-- Before: "predictions_read_all" let ANY authenticated user read EVERY
-- prediction — so anyone could open Chrome DevTools → Network and see other
-- players' picks before a match locked.
--
-- After: a user can read
--   1. their own predictions (always — needed to view/edit), and
--   2. other users' predictions ONLY for matches that are already locked
--      (kickoff − 1h) or finished.
--
-- The leaderboard keeps working: score only counts finished matches, and those
-- are readable under the new policy.

-- ── predictions ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "predictions_read_all" ON predictions;

CREATE POLICY "predictions_read_own_or_locked"
  ON predictions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
        AND (m.finished = true OR m.match_time - interval '1 hour' <= now())
    )
  );

-- ── champion_predictions ──────────────────────────────────────────────────────
-- Champion picks stay hidden from others until the knockout-stage lock date.
DROP POLICY IF EXISTS "champ_read_all" ON champion_predictions;

CREATE POLICY "champ_read_own_or_after_lock"
  ON champion_predictions FOR SELECT
  USING (
    user_id = auth.uid()
    OR now() >= timestamptz '2026-06-28 19:00:00+00'
  );
