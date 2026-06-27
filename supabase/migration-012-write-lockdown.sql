-- Migration 012: Server-side WRITE lock (anti-cheat) ──────────────────────────
--
-- VULNERABILITY (reported 2026-06): predictions / champion_predictions /
-- bracket_challenges all had write policies of the form
--     FOR ALL USING (auth.uid() = user_id)
-- with NO time restriction. The Supabase anon key and the user's JWT are
-- necessarily present in the browser, so any user could craft a direct
-- REST/curl call and INSERT or UPDATE (including upsert with
-- `on_conflict=user_id,match_id` + `Prefer: resolution=merge-duplicates`)
-- their OWN pick AFTER a match finished — setting it to the known result and
-- farming points. Migration 011 only fixed READ visibility, not writes.
--
-- FIX: BEFORE INSERT/UPDATE triggers that hard-reject writes once the relevant
-- deadline has passed. A trigger fires regardless of the RLS policy combination
-- AND regardless of the upsert path, so it fully closes the hole — unlike an
-- RLS WITH CHECK alone, which is awkward to reason about under ON CONFLICT.
--
-- Functions are SECURITY INVOKER (the default) so `current_user` reflects the
-- real caller role: end users run as `authenticated`, while the dashboard SQL
-- editor (`postgres`) and Edge Functions (`service_role`) are exempt — so data
-- can still be corrected by an admin if ever needed.

-- ── 1) predictions: locked at kickoff − 1h, or once the match is finished ──────
CREATE OR REPLACE FUNCTION public.reject_locked_prediction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  mt  timestamptz;
  fin boolean;
BEGIN
  -- Only enforce for real app users; service_role / postgres can always write.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  SELECT match_time, finished INTO mt, fin
  FROM matches WHERE id = NEW.match_id;

  IF mt IS NULL THEN
    RAISE EXCEPTION 'Unknown match %', NEW.match_id;
  END IF;

  IF fin OR now() >= mt - interval '1 hour' THEN
    RAISE EXCEPTION 'Prediction locked: match % has started or finished', NEW.match_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_locked_prediction ON predictions;
CREATE TRIGGER trg_reject_locked_prediction
  BEFORE INSERT OR UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_prediction();

-- ── 2) champion_predictions: locked at 2026-06-28 19:00 UTC ────────────────────
CREATE OR REPLACE FUNCTION public.reject_locked_champion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF now() >= timestamptz '2026-06-28 19:00:00+00' THEN
    RAISE EXCEPTION 'Champion pick is locked (deadline passed)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_locked_champion ON champion_predictions;
CREATE TRIGGER trg_reject_locked_champion
  BEFORE INSERT OR UPDATE ON champion_predictions
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_champion();

-- ── 3) bracket_challenges: locked at 2026-06-11 18:00 UTC (tournament start) ───
CREATE OR REPLACE FUNCTION public.reject_locked_bracket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF now() >= timestamptz '2026-06-11 18:00:00+00' THEN
    RAISE EXCEPTION 'Bracket is locked (tournament has started)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_locked_bracket ON bracket_challenges;
CREATE TRIGGER trg_reject_locked_bracket
  BEFORE INSERT OR UPDATE ON bracket_challenges
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_bracket();
