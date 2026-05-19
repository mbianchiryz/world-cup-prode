-- profiles (linked to auth.users)
create table if not exists profiles (
  id       uuid references auth.users(id) on delete cascade primary key,
  name     text,
  email    text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- matches (same structure as current SQLite)
create table if not exists matches (
  id         bigint primary key,
  home_team  text not null,
  away_team  text not null,
  match_time timestamptz,
  stage      text,
  group_name text,
  matchday   int,
  home_score int,
  away_score int,
  finished   boolean default false,
  winner     text
);

-- predictions: one pick per user per match
create table if not exists predictions (
  user_id    uuid references profiles(id) on delete cascade,
  match_id   bigint references matches(id) on delete cascade,
  home_score int not null,
  away_score int not null,
  updated_at timestamptz default now(),
  primary key (user_id, match_id)
);

-- champion picks
create table if not exists champion_predictions (
  user_id    uuid references profiles(id) on delete cascade primary key,
  team       text not null,
  updated_at timestamptz default now()
);

-- settings (e.g. champion)
create table if not exists settings (
  key   text primary key,
  value text
);

-- RLS
alter table profiles enable row level security;
alter table predictions enable row level security;
alter table champion_predictions enable row level security;
alter table matches enable row level security;
alter table settings enable row level security;

-- Profiles: everyone can read, users write their own
create policy "profiles_read_all"  on profiles for select using (true);
create policy "profiles_write_own" on profiles for all using (auth.uid() = id);

-- Matches: everyone can read, only service_role writes
create policy "matches_read_all"   on matches for select using (true);

-- Settings: everyone can read
create policy "settings_read_all"  on settings for select using (true);

-- Predictions: users read all (for leaderboard), write own
create policy "predictions_read_all"  on predictions for select using (true);
create policy "predictions_write_own" on predictions for all using (auth.uid() = user_id);

-- Champion preds: same
create policy "champ_read_all"  on champion_predictions for select using (true);
create policy "champ_write_own" on champion_predictions for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
