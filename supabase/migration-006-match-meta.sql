-- Migration 006: Add team IDs to matches + create match_meta table.
-- Run in Supabase SQL Editor.

-- 1. Add team IDs to matches (needed for H2H endpoint)
alter table matches add column if not exists home_team_id int;
alter table matches add column if not exists away_team_id int;

-- 2. Match meta: predictions + H2H from api-football
create table if not exists match_meta (
  fixture_id      bigint primary key references matches(id) on delete cascade,
  pred_home_pct   int,          -- home win probability %
  pred_draw_pct   int,          -- draw probability %
  pred_away_pct   int,          -- away win probability %
  pred_home_score int,          -- predicted home goals
  pred_away_score int,          -- predicted away goals
  pred_winner     text,         -- 'home' | 'away' | 'draw'
  h2h             jsonb,        -- [{date, home, away, home_score, away_score}]
  fetched_at      timestamptz default now()
);

alter table match_meta enable row level security;
create policy "match_meta_read_all" on match_meta for select using (true);
