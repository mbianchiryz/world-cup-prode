-- Migration 010: Admin stats function
-- Only callable by the 4 admin emails — all others get an error.

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  user_id          UUID,
  name             TEXT,
  email            TEXT,
  prediction_count BIGINT,
  has_bracket      BOOLEAN,
  bracket_phase    TEXT,
  bracket_locked   BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_email TEXT;
BEGIN
  SELECT au.email INTO caller_email
  FROM auth.users au
  WHERE au.id = auth.uid();

  IF caller_email NOT IN (
    'm.bianchi@ryzlabs.com',
    'j.barcelo@ryzlabs.com',
    'sam@ryzlabs.com',
    'jordan@ryzlabs.com'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    COALESCE(pred.cnt, 0)          AS prediction_count,
    (bc.user_id IS NOT NULL)       AS has_bracket,
    bc.phase,
    COALESCE(bc.locked, false)     AS bracket_locked
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
    FROM predictions
    GROUP BY user_id
  ) pred ON pred.user_id = p.id
  LEFT JOIN bracket_challenges bc ON bc.user_id = p.id
  ORDER BY p.name;
END;
$$;
