# Supabase setup

## Initial schema

Run once when creating the project:

```
supabase/schema.sql
```

Paste in Supabase SQL Editor → Run.

## Migrations (run in order)

1. **`migration-001-email-validation.sql`** — rejects signups not from `@ryzlabs.com`.
2. **`migration-002-reminder-log.sql`** — table for the email-reminder Edge Function.

Paste each in SQL Editor → Run.

---

## Email reminders (Edge Function)

The `send-pick-reminders` function emails @ryzlabs.com users when one of their unpicked matches is closing in the next 3 hours.

### One-time setup

1. **Sign up at [resend.com](https://resend.com)** (free tier: 100/day, 3,000/month — plenty for this).

2. **Verify a sender domain or use the default `onboarding@resend.dev`** for testing.
   - To send from `prode@ryzlabs.com`, add DNS records they give you on the ryzlabs.com domain.

3. **Get a Resend API key** → store as a Supabase secret:
   ```sh
   # Install Supabase CLI first: brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref vswemrcilltarbetmlwu
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
   supabase secrets set REMINDER_FROM_EMAIL=prode@ryzlabs.com
   supabase secrets set APP_URL=https://main.d37p7v78zz1ezp.amplifyapp.com
   ```

4. **Deploy the function:**
   ```sh
   supabase functions deploy send-pick-reminders --no-verify-jwt
   ```

5. **Schedule it to run hourly** (Supabase Dashboard → Database → Cron):
   ```sql
   select cron.schedule(
     'send-pick-reminders',
     '0 * * * *',  -- every hour on the hour
     $$
     select net.http_post(
       url := 'https://vswemrcilltarbetmlwu.supabase.co/functions/v1/send-pick-reminders',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     );
     $$
   );
   ```
   Replace `YOUR_SERVICE_ROLE_KEY` with the real one. Or use Supabase's "Scheduled Functions" UI if available.

### Testing

Invoke it manually before relying on the cron:

```sh
curl -X POST https://vswemrcilltarbetmlwu.supabase.co/functions/v1/send-pick-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Returns `{ ok: true, matchesInWindow: N, remindersSent: N }`.

### What it does

- Looks at matches whose **pick deadline** (kickoff − 1h) is in the next 3 hours.
- For each match, finds @ryzlabs.com users who haven't picked it yet.
- Sends each one an email with a "Make your pick" button.
- Logs sent reminders in `reminder_log` so the same person isn't notified twice for the same match.

### Cost

For a 50-person pool over 104 matches: max 5,200 emails total over a month. Resend free tier handles it.
