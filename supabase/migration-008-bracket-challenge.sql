-- Migration 008: Bracket Challenge table
-- Users predict group standings + best 8 3rd-place teams + full knockout bracket
-- before the World Cup starts (lock: 2026-06-11T15:00:00Z).

CREATE TABLE IF NOT EXISTS bracket_challenges (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- group_picks: { "A": ["Mexico","South Korea","Czech Republic","South Africa"], ... }
  -- Index 0=1st, 1=2nd, 2=3rd, 3=4th place
  group_picks        JSONB       NOT NULL DEFAULT '{}',
  -- third_place_picks: ["Norway","Algeria",...] — exactly 8 teams
  third_place_picks  JSONB       NOT NULL DEFAULT '[]',
  -- knockout_picks: { "r32_1": "Germany", "r16_1": "Germany", ... }
  knockout_picks     JSONB       NOT NULL DEFAULT '{}',
  -- phase tracks progress: groups | thirds | knockout | complete
  phase              TEXT        NOT NULL DEFAULT 'groups',
  locked             BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE bracket_challenges ENABLE ROW LEVEL SECURITY;

-- Each user manages only their own bracket
CREATE POLICY "Users manage own bracket"
  ON bracket_challenges FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER bracket_challenges_updated_at
  BEFORE UPDATE ON bracket_challenges
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
