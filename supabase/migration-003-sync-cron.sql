-- Migration 003: Schedule sync-results to run every 5 minutes.
-- Run this in Supabase SQL Editor AFTER deploying the sync-results Edge Function.
--
-- Replace YOUR_SERVICE_ROLE_KEY with the real key from:
--   Supabase Dashboard → Settings → API → service_role (secret)

select cron.schedule(
  'sync-results',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://vswemrcilltarbetmlwu.supabase.co/functions/v1/sync-results',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- To verify the job was created:
-- select * from cron.job;

-- To remove it if needed:
-- select cron.unschedule('sync-results');
