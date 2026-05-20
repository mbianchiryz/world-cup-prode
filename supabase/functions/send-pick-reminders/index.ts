/**
 * Supabase Edge Function — sends "your pick is closing soon" emails.
 *
 * Setup steps (read /supabase/README.md):
 *   1. Sign up at resend.com (free tier: 3,000 emails/month)
 *   2. Get an API key
 *   3. supabase secrets set RESEND_API_KEY=...
 *   4. supabase functions deploy send-pick-reminders --no-verify-jwt
 *   5. Schedule it: pg_cron triggers `/functions/v1/send-pick-reminders` every hour
 *
 * The function finds matches whose pick deadline (kickoff − 1h) is within the
 * next 3 hours, then emails every @ryzlabs.com user who hasn't picked them yet.
 * It dedupes via the `reminder_log` table so each user gets at most ONE email
 * per match.
 */

// @ts-expect-error — Deno runtime types are injected by Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// @ts-expect-error — Deno global
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
// @ts-expect-error — Deno global
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// @ts-expect-error — Deno global
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY')!;
// @ts-expect-error — Deno global
const FROM_EMAIL                = Deno.env.get('REMINDER_FROM_EMAIL') ?? 'prode@ryzlabs.com';
// @ts-expect-error — Deno global
const APP_URL                   = Deno.env.get('APP_URL') ?? 'https://main.d37p7v78zz1ezp.amplifyapp.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LOCK_OFFSET_MS    = 60 * 60 * 1000;        // picks lock 1h before kickoff
const REMINDER_WINDOW_MS = 3 * 60 * 60 * 1000;   // notify when deadline is < 3h away

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_time: string;
  stage: string;
  group_name: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

// @ts-expect-error — Deno serve API
Deno.serve(async () => {
  const now = Date.now();

  // 1. Find matches whose deadline is in the next REMINDER_WINDOW_MS
  const earliest = new Date(now + LOCK_OFFSET_MS).toISOString();              // matches starting >= 1h from now
  const latest   = new Date(now + LOCK_OFFSET_MS + REMINDER_WINDOW_MS).toISOString();

  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_time, stage, group_name')
    .gte('match_time', earliest)
    .lte('match_time', latest)
    .eq('finished', false)
    .neq('home_team', 'TBD')
    .neq('away_team', 'TBD');

  if (mErr) return json({ error: mErr.message }, 500);
  if (!matches || matches.length === 0) {
    return json({ ok: true, message: 'No matches in reminder window.' });
  }

  // 2. Load all profiles (users in the pool)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, name');

  if (pErr || !profiles) return json({ error: pErr?.message ?? 'no profiles' }, 500);

  // 3. Load all predictions (to figure out who hasn't picked which match)
  const matchIds = matches.map((m) => m.id);
  const { data: preds } = await supabase
    .from('predictions')
    .select('user_id, match_id')
    .in('match_id', matchIds);

  const pickedSet = new Set((preds ?? []).map((p) => `${p.user_id}:${p.match_id}`));

  // 4. Load reminder log (don't send the same reminder twice)
  const { data: sent } = await supabase
    .from('reminder_log')
    .select('user_id, match_id')
    .in('match_id', matchIds);

  const sentSet = new Set((sent ?? []).map((r) => `${r.user_id}:${r.match_id}`));

  // 5. Compose work list — pairs of (user, match) who need a reminder
  const todo: { user: User; match: Match }[] = [];
  for (const match of matches as Match[]) {
    for (const user of profiles as User[]) {
      if (!user.email?.endsWith('@ryzlabs.com')) continue;          // safety
      const k = `${user.id}:${match.id}`;
      if (pickedSet.has(k)) continue;                                // already picked
      if (sentSet.has(k))    continue;                                // already reminded
      todo.push({ user, match });
    }
  }

  // 6. Send emails via Resend
  let sentCount = 0;
  const insertLogs: { user_id: string; match_id: number }[] = [];

  for (const { user, match } of todo) {
    const ok = await sendReminderEmail(user, match);
    if (ok) {
      sentCount++;
      insertLogs.push({ user_id: user.id, match_id: match.id });
    }
  }

  // 7. Log what we sent
  if (insertLogs.length) {
    await supabase.from('reminder_log').insert(insertLogs);
  }

  return json({ ok: true, matchesInWindow: matches.length, remindersSent: sentCount });
});

async function sendReminderEmail(user: User, match: Match): Promise<boolean> {
  const deadline = new Date(new Date(match.match_time).getTime() - LOCK_OFFSET_MS);
  const hoursLeft = Math.round((deadline.getTime() - Date.now()) / 3_600_000);
  const name = user.name?.split(' ')[0] ?? 'there';

  const subject = `⏰ Pick closing in ~${hoursLeft}h: ${match.home_team} vs ${match.away_team}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px;">Hey ${name},</h1>
      <p>Your pick for <b>${match.home_team} vs ${match.away_team}</b> closes in about <b>${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}</b>.</p>
      <p>
        ${match.stage === 'group' ? `Group ${match.group_name}` : match.stage.toUpperCase()} ·
        ${new Date(match.match_time).toUTCString()}
      </p>
      <p style="margin-top: 24px;">
        <a href="${APP_URL}/predictions" style="background:#dba23a;color:#000;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
          Make your pick →
        </a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:32px;">
        You're getting this because you signed up for the RYZ Labs World Cup pool.
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [user.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Failed to send to ${user.email}:`, await res.text());
    return false;
  }
  return true;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
