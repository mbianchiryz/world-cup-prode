-- Migration 007: Official FIFA WC 2026 bracket positions (hardcoded from the
-- official bracket released by FIFA for the Round of 32).
-- "3rd ABCDF" = best 3rd-place finisher from those groups (decided after group stage).
-- IDs 9000001–9000032 are safe from api-football's ~1.4M range.
-- Once the group stage ends, run seed-matches and:
--   DELETE FROM matches WHERE id BETWEEN 9000001 AND 9000032;

INSERT INTO matches (id, home_team, away_team, match_time, stage, group_name, matchday, finished, home_score, away_score, winner)
VALUES
  -- ── Round of 32 (16 matches) ─────────────────────────────────────────────
  -- Left half of bracket (feeds into upper Final)
  (9000001, '1st E',     '3rd ABCDF',  '2026-06-29T16:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000002, '1st I',     '3rd CDFGH',  '2026-06-29T20:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000003, '2nd A',     '2nd B',      '2026-06-30T16:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000004, '1st F',     '2nd C',      '2026-06-30T20:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000005, '2nd K',     '2nd L',      '2026-07-01T16:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000006, '1st H',     '2nd J',      '2026-07-01T20:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000007, '1st D',     '3rd BEFIJ',  '2026-07-02T16:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000008, '1st G',     '3rd AEHIJ',  '2026-07-02T20:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  -- Right half of bracket (feeds into lower Final)
  (9000009, '1st C',     '2nd F',      '2026-07-03T16:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000010, '2nd E',     '2nd I',      '2026-07-03T20:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000011, '1st A',     '3rd CEFHI',  '2026-07-04T00:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000012, '1st L',     '3rd EHIJK',  '2026-07-04T04:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000013, '1st J',     '2nd H',      '2026-07-04T16:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000014, '2nd D',     '2nd G',      '2026-07-04T20:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000015, '1st B',     '3rd EFOIJ',  '2026-07-05T00:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  (9000016, '1st K',     '3rd DEJL',   '2026-07-05T04:00:00Z', 'r32', NULL, NULL, false, NULL, NULL, NULL),
  -- ── Round of 16 (8 matches) ───────────────────────────────────────────────
  (9000017, 'TBD', 'TBD', '2026-07-05T16:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000018, 'TBD', 'TBD', '2026-07-05T20:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000019, 'TBD', 'TBD', '2026-07-06T16:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000020, 'TBD', 'TBD', '2026-07-06T20:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000021, 'TBD', 'TBD', '2026-07-07T16:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000022, 'TBD', 'TBD', '2026-07-07T20:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000023, 'TBD', 'TBD', '2026-07-08T16:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  (9000024, 'TBD', 'TBD', '2026-07-08T20:00:00Z', 'r16', NULL, NULL, false, NULL, NULL, NULL),
  -- ── Quarter-finals (4 matches) ────────────────────────────────────────────
  (9000025, 'TBD', 'TBD', '2026-07-10T16:00:00Z', 'qf',  NULL, NULL, false, NULL, NULL, NULL),
  (9000026, 'TBD', 'TBD', '2026-07-10T20:00:00Z', 'qf',  NULL, NULL, false, NULL, NULL, NULL),
  (9000027, 'TBD', 'TBD', '2026-07-11T16:00:00Z', 'qf',  NULL, NULL, false, NULL, NULL, NULL),
  (9000028, 'TBD', 'TBD', '2026-07-11T20:00:00Z', 'qf',  NULL, NULL, false, NULL, NULL, NULL),
  -- ── Semi-finals (2 matches) ───────────────────────────────────────────────
  (9000029, 'TBD', 'TBD', '2026-07-14T20:00:00Z', 'sf',  NULL, NULL, false, NULL, NULL, NULL),
  (9000030, 'TBD', 'TBD', '2026-07-15T20:00:00Z', 'sf',  NULL, NULL, false, NULL, NULL, NULL),
  -- ── 3rd place play-off ────────────────────────────────────────────────────
  (9000031, 'TBD', 'TBD', '2026-07-18T20:00:00Z', '3rd', NULL, NULL, false, NULL, NULL, NULL),
  -- ── Final ─────────────────────────────────────────────────────────────────
  (9000032, 'TBD', 'TBD', '2026-07-19T20:00:00Z', 'final', NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  match_time = EXCLUDED.match_time,
  stage      = EXCLUDED.stage;
