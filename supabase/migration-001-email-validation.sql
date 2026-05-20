-- Migration 001: Restrict signup to @ryzlabs.com emails only.
-- Run this in Supabase SQL Editor after the initial schema.
-- This replaces the existing handle_new_user() trigger with an email-domain check.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Hard reject anything that isn't a ryzlabs.com email.
  -- Google OAuth "hd" hint can be bypassed, so we enforce here.
  if new.email IS NULL OR lower(new.email) NOT LIKE '%@ryzlabs.com' then
    raise exception 'Only @ryzlabs.com email addresses are allowed (got: %)', new.email;
  end if;

  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Trigger already exists from initial schema; CREATE OR REPLACE FUNCTION above
-- is enough — the trigger keeps pointing at the same function name.

-- Optional cleanup: if any non-ryzlabs users sneaked in before this migration,
-- this view shows them so you can manually delete them via Authentication → Users.
create or replace view public.non_ryzlabs_users as
select id, email, created_at
from auth.users
where lower(email) NOT LIKE '%@ryzlabs.com';
