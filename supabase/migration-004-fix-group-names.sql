-- Migration 004: Fix group_name for all group stage matches.
-- api-football does not return the group letter, so we derive it
-- from the team names. Also handles api-football alternate spellings.
-- Run in Supabase SQL Editor.

WITH team_group AS (
  SELECT * FROM (VALUES
    -- Group A
    ('Mexico',                   'A'), ('South Africa',          'A'),
    ('Korea Republic',           'A'), ('South Korea',           'A'),
    ('Czechia',                  'A'), ('Czech Republic',        'A'),
    -- Group B
    ('Canada',                   'B'), ('Bosnia and Herzegovina','B'),
    ('Bosnia & Herzegovina',     'B'), ('Qatar',                 'B'),
    ('Switzerland',              'B'),
    -- Group C
    ('Haiti',                    'C'), ('Scotland',              'C'),
    ('Brazil',                   'C'), ('Morocco',               'C'),
    -- Group D
    ('USA',                      'D'), ('United States',         'D'),
    ('Paraguay',                 'D'), ('Australia',             'D'),
    ('Türkiye',                  'D'), ('Turkey',                'D'),
    -- Group E
    ('Côte d''Ivoire',           'E'), ('Ivory Coast',           'E'),
    ('Ecuador',                  'E'), ('Germany',               'E'),
    ('Curaçao',                  'E'), ('Curacao',               'E'),
    -- Group F
    ('Netherlands',              'F'), ('Japan',                 'F'),
    ('Sweden',                   'F'), ('Tunisia',               'F'),
    -- Group G
    ('IR Iran',                  'G'), ('Iran',                  'G'),
    ('New Zealand',              'G'), ('Belgium',               'G'),
    ('Egypt',                    'G'),
    -- Group H
    ('Saudi Arabia',             'H'), ('Uruguay',               'H'),
    ('Spain',                    'H'), ('Cabo Verde',            'H'),
    ('Cape Verde',               'H'),
    -- Group I
    ('France',                   'I'), ('Senegal',               'I'),
    ('Iraq',                     'I'), ('Norway',                'I'),
    -- Group J
    ('Argentina',                'J'), ('Algeria',               'J'),
    ('Austria',                  'J'), ('Jordan',                'J'),
    -- Group K
    ('Portugal',                 'K'), ('Congo DR',              'K'),
    ('DR Congo',                 'K'), ('Uzbekistan',            'K'),
    ('Colombia',                 'K'),
    -- Group L
    ('Ghana',                    'L'), ('Panama',                'L'),
    ('England',                  'L'), ('Croatia',               'L')
  ) AS t(team, grp)
)
UPDATE matches m
SET group_name = tg.grp
FROM team_group tg
WHERE m.stage = 'group'
  AND (m.home_team = tg.team OR m.away_team = tg.team)
  AND m.group_name IS NULL;

-- Verify
SELECT group_name, matchday, count(*)
FROM matches
WHERE stage = 'group'
GROUP BY group_name, matchday
ORDER BY group_name, matchday;
