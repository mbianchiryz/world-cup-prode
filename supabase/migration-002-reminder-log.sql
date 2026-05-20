-- Migration 002: log of pick-reminder emails sent, so we don't spam users.
-- One row per (user, match) means "we already sent this reminder, don't send again."

create table if not exists reminder_log (
  user_id    uuid    not null references profiles(id) on delete cascade,
  match_id   bigint  not null references matches(id)  on delete cascade,
  sent_at    timestamptz default now(),
  primary key (user_id, match_id)
);

-- Restrict access: only service_role (the Edge Function) reads/writes this.
alter table reminder_log enable row level security;
-- No policies = nobody can read or write via the anon key. Service role bypasses RLS.
