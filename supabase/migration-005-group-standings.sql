-- Migration 005: Create group_standings table for official api-football standings.
-- Run in Supabase SQL Editor before deploying sync-standings Edge Function.

create table if not exists group_standings (
  group_name    text not null,
  rank          int  not null,
  team          text not null,
  played        int  default 0,
  won           int  default 0,
  drawn         int  default 0,
  lost          int  default 0,
  goals_for     int  default 0,
  goals_against int  default 0,
  goal_diff     int  default 0,
  points        int  default 0,
  form          text,
  updated_at    timestamptz default now(),
  primary key (group_name, team)
);

alter table group_standings enable row level security;

-- Everyone can read standings (needed by the frontend)
create policy "standings_read_all" on group_standings for select using (true);

-- Schedule sync-standings every 5 minutes (replace YOUR_SERVICE_ROLE_KEY)
-- select cron.schedule(
--   'sync-standings',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://vswemrcilltarbetmlwu.supabase.co/functions/v1/sync-standings',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body    := '{}'::jsonb
--   );
--   $$
-- );
