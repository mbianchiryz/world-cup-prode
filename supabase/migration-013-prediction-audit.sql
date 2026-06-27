-- Migration 013: Prediction audit trail ───────────────────────────────────────
--
-- Records EVERY write to `predictions` (insert / update / delete) into an
-- append-only audit table, so out-of-time or admin overrides are traceable.
--
-- Complements migration-012: the lock triggers BLOCK out-of-time writes by
-- normal users, so any audit row with was_locked = true means an admin /
-- service_role override happened — exactly what you'd want to review.
--
-- The audit table is tamper-proof from app users: RLS is on with no policies,
-- and privileges are revoked, so only service_role / postgres can read it. The
-- logging function is SECURITY DEFINER so it can always insert the audit row.

-- ── Audit table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prediction_audit (
  id          bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  db_role     text,          -- 'authenticated' / 'service_role' / 'postgres' (SQL editor)
  auth_uid    uuid,          -- the JWT user that made the request (null for SQL editor)
  operation   text NOT NULL, -- INSERT / UPDATE / DELETE
  user_id     uuid,          -- whose prediction the row belongs to
  match_id    bigint,
  old_home    int,
  old_away    int,
  new_home    int,
  new_away    int,
  match_time  timestamptz,   -- kickoff of that match (context)
  was_locked  boolean NOT NULL  -- was the match already locked (kickoff − 1h) at write time?
);

CREATE INDEX IF NOT EXISTS prediction_audit_locked_idx
  ON prediction_audit (was_locked, occurred_at DESC);

-- Lock the table down: only service_role / postgres (which bypass RLS) can touch it.
ALTER TABLE prediction_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON prediction_audit FROM anon, authenticated;

-- ── Logging trigger function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_prediction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match  bigint;
  v_user   uuid;
  mt       timestamptz;
  claims   text;
  v_role   text;
BEGIN
  v_user  := COALESCE(NEW.user_id, OLD.user_id);
  v_match := COALESCE(NEW.match_id, OLD.match_id);
  SELECT match_time INTO mt FROM matches WHERE id = v_match;

  -- Resolve the real caller role from the JWT (SECURITY DEFINER hides it from
  -- current_user); fall back to current_user for the SQL editor.
  claims := current_setting('request.jwt.claims', true);
  IF claims IS NULL OR claims = '' THEN
    v_role := current_user;
  ELSE
    v_role := COALESCE(claims::json ->> 'role', current_user);
  END IF;

  INSERT INTO prediction_audit (
    db_role, auth_uid, operation, user_id, match_id,
    old_home, old_away, new_home, new_away, match_time, was_locked
  ) VALUES (
    v_role,
    auth.uid(),
    TG_OP,
    v_user, v_match,
    OLD.home_score, OLD.away_score,
    NEW.home_score, NEW.away_score,
    mt,
    (mt IS NOT NULL AND now() >= mt - interval '1 hour')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_prediction ON predictions;
CREATE TRIGGER trg_audit_prediction
  AFTER INSERT OR UPDATE OR DELETE ON predictions
  FOR EACH ROW EXECUTE FUNCTION public.audit_prediction_change();
