-- Migration 009: Fix bracket RLS + insert TEST bracket data
-- Run in Supabase SQL Editor (runs as service role, bypasses RLS)
--
-- TO DELETE THE TEST DATA LATER:
--   DELETE FROM bracket_challenges WHERE user_id = '00000000-0000-0000-0000-000000000001';
--   DELETE FROM profiles           WHERE id      = '00000000-0000-0000-0000-000000000001';
--   DELETE FROM auth.users         WHERE id      = '00000000-0000-0000-0000-000000000001';

-- ── 1) Fix RLS: add a read policy for locked brackets ─────────────────────────
-- The existing "Users manage own bracket" (FOR ALL) only lets users read their
-- own row. We need a second SELECT policy so the leaderboard can show everyone's
-- locked bracket after Jun 11.
DROP POLICY IF EXISTS "Authenticated users read locked brackets" ON bracket_challenges;
CREATE POLICY "Authenticated users read locked brackets"
  ON bracket_challenges FOR SELECT TO authenticated
  USING (locked = true);

-- ── 2) Create TEST auth user ──────────────────────────────────────────────────
-- Uses a fixed "all-zeros" UUID so it's easy to find and delete later.
-- encrypted_password is a valid bcrypt hash (won't be used to log in).
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  COALESCE((SELECT id FROM auth.instances LIMIT 1),
           '00000000-0000-0000-0000-000000000000'),
  'test@prode26.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  NOW(), NOW(), NOW(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"TEST Player"}'::jsonb,
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- ── 3) Create profile for TEST user ──────────────────────────────────────────
INSERT INTO profiles (id, name, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TEST Player',
  'test@prode26.local'
)
ON CONFLICT (id) DO UPDATE SET
  name  = 'TEST Player',
  email = 'test@prode26.local';

-- ── 4) Insert complete bracket — Argentina 🇦🇷 wins ───────────────────────────
-- Group picks: realistic standings per group
-- Third-place picks: Czech Republic, Qatar, Scotland, Australia,
--                    Côte d'Ivoire, Sweden, New Zealand, Saudi Arabia
-- Knockout path: ARG beats URU (R32) → TUR (R16) → POR (QF) →
--                BRA (SF) → ESP (Final)
INSERT INTO bracket_challenges (
  user_id, group_picks, third_place_picks, knockout_picks, phase, locked
) VALUES (
  '00000000-0000-0000-0000-000000000001',

  -- group_picks
  '{
    "A": ["Mexico","South Korea","Czech Republic","South Africa"],
    "B": ["Canada","Switzerland","Qatar","Bosnia and Herzegovina"],
    "C": ["Brazil","Morocco","Scotland","Haiti"],
    "D": ["USA","Türkiye","Australia","Paraguay"],
    "E": ["Germany","Ecuador","Cote d''Ivoire","Curacao"],
    "F": ["Netherlands","Japan","Sweden","Tunisia"],
    "G": ["Belgium","Egypt","New Zealand","IR Iran"],
    "H": ["Spain","Uruguay","Saudi Arabia","Cabo Verde"],
    "I": ["France","Norway","Senegal","Iraq"],
    "J": ["Argentina","Algeria","Austria","Jordan"],
    "K": ["Portugal","Colombia","Congo DR","Uzbekistan"],
    "L": ["England","Croatia","Ghana","Panama"]
  }'::jsonb,

  -- third_place_picks (8 of 12)
  '["Czech Republic","Qatar","Scotland","Australia","Cote d''Ivoire","Sweden","New Zealand","Saudi Arabia"]'::jsonb,

  -- knockout_picks (all 31 matches)
  '{
    "r32_1":"Germany",   "r32_2":"France",
    "r32_3":"Switzerland","r32_4":"Netherlands",
    "r32_5":"Croatia",   "r32_6":"Spain",
    "r32_7":"USA",       "r32_8":"Belgium",
    "r32_9":"Brazil",    "r32_10":"Ecuador",
    "r32_11":"Mexico",   "r32_12":"England",
    "r32_13":"Argentina","r32_14":"Türkiye",
    "r32_15":"Canada",   "r32_16":"Portugal",

    "r16_1":"France",    "r16_2":"Netherlands",
    "r16_3":"Spain",     "r16_4":"USA",
    "r16_5":"Brazil",    "r16_6":"England",
    "r16_7":"Argentina", "r16_8":"Portugal",

    "qf_1":"France",     "qf_2":"Spain",
    "qf_3":"Brazil",     "qf_4":"Argentina",

    "sf_1":"Spain",      "sf_2":"Argentina",

    "final":"Argentina"
  }'::jsonb,

  'complete',
  true   -- locked = true so it appears in the leaderboard immediately
)
ON CONFLICT (user_id) DO UPDATE SET
  group_picks       = EXCLUDED.group_picks,
  third_place_picks = EXCLUDED.third_place_picks,
  knockout_picks    = EXCLUDED.knockout_picks,
  phase             = 'complete',
  locked            = true;
