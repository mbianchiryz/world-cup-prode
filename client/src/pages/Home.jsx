import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { getFlag } from '@/lib/matches-data';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, MapPin, Users, Target, ArrowRight } from 'lucide-react';

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { done: true };
  const days  = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  const secs  = Math.floor((ms % 60_000) / 1000);
  return { days, hours, mins, secs };
}

function NextMatchHero({ match }) {
  const cd = useCountdown(match?.match_time);
  if (!match) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardDescription className="text-primary-foreground/70 uppercase tracking-wider text-xs font-semibold">
          ⚡ Next Up · {match.group_name ? `Group ${match.group_name} · ` : ''}Matchday {match.matchday ?? '–'}
        </CardDescription>
        <CardTitle className="text-2xl">Kickoff in</CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-5xl sm:text-6xl">{getFlag(match.home_team)}</span>
            <span className="font-semibold uppercase tracking-wide">{match.home_team}</span>
          </div>
          <div className="text-3xl font-bold text-muted-foreground">VS</div>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-5xl sm:text-6xl">{getFlag(match.away_team)}</span>
            <span className="font-semibold uppercase tracking-wide">{match.away_team}</span>
          </div>
        </div>

        {/* Countdown */}
        {cd && !cd.done && (
          <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
            {[
              { label: 'Days', value: cd.days },
              { label: 'Hours', value: cd.hours },
              { label: 'Mins', value: cd.mins },
              { label: 'Secs', value: cd.secs },
            ].map((u) => (
              <div key={u.label} className="rounded-md border bg-secondary/50 p-3 text-center">
                <div className="text-2xl sm:text-3xl font-bold tabular-nums">{String(u.value).padStart(2, '0')}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{u.label}</div>
              </div>
            ))}
          </div>
        )}
        {cd?.done && (
          <div className="text-center text-sm text-muted-foreground">Match is live or kicking off now ⚽</div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(match.match_time).toLocaleString(undefined, {
              weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex justify-center">
          <Button asChild>
            <Link to="/predictions">Make your pick <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const TOURNAMENT_FACTS = [
  { Icon: Users,    label: 'Teams',         value: '48',           sub: 'first ever 48-team edition' },
  { Icon: Target,   label: 'Matches',       value: '104',          sub: 'expanded from 64' },
  { Icon: MapPin,   label: 'Host nations',  value: '3',            sub: 'USA · Canada · Mexico' },
  { Icon: Calendar, label: 'Dates',         value: 'Jun 11 – Jul 19', sub: '39 days of football' },
];

function RecentResults({ matches }) {
  const recent = matches
    .filter((m) => m.finished)
    .sort((a, b) => new Date(b.match_time) - new Date(a.match_time))
    .slice(0, 5);

  if (!recent.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No matches played yet. Check back after kickoff.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Results</CardTitle>
        <CardDescription>Last {recent.length} finished matches</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">{getFlag(m.home_team)}</span>
              <span className="text-sm font-medium truncate">{m.home_team}</span>
            </div>
            <div className="font-bold tabular-nums px-3">{m.home_score} – {m.away_score}</div>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-sm font-medium truncate text-right">{m.away_team}</span>
              <span className="text-xl">{getFlag(m.away_team)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TopLeaders({ leaderboard }) {
  const top = (leaderboard.standings || []).slice(0, 3);
  if (!top.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Top of the Pool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold w-6 text-center">{['🥇', '🥈', '🥉'][i]}</span>
              <div>
                <div className="font-medium">{p.name}</div>
                {p.pickedChampion && (
                  <div className="text-xs text-muted-foreground">🏆 {p.pickedChampion}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{p.total}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">pts</div>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" asChild className="w-full">
          <Link to="/leaderboard">See full standings <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [matches, setMatches]         = useState([]);
  const [leaderboard, setLeaderboard] = useState({ standings: [], champion: null });
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/matches'),
      api.get('/api/leaderboard'),
    ])
      .then(([m, lb]) => { setMatches(m.matches || []); setLeaderboard(lb); })
      .finally(() => setLoading(false));
  }, []);

  const nextMatch = useMemo(
    () => matches
      .filter((m) => !m.finished && m.home_team !== 'TBD' && m.away_team !== 'TBD')
      .sort((a, b) => new Date(a.match_time) - new Date(b.match_time))[0],
    [matches]
  );

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">FIFA World Cup 2026</h1>
        <p className="text-muted-foreground">USA · Canada · Mexico · June 11 – July 19</p>
      </div>

      {nextMatch && <NextMatchHero match={nextMatch} />}

      {/* Tournament facts */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {TOURNAMENT_FACTS.map(({ Icon, label, value, sub }) => (
          <Card key={label}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentResults matches={matches} />
        <TopLeaders leaderboard={leaderboard} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About the Pool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Predict every match of the 2026 World Cup and pick the eventual champion. Live scores
            update from ESPN every minute during the tournament.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground mb-1">How scoring works</div>
              <ul className="space-y-0.5 text-xs">
                <li><b className="text-foreground">+7</b> · perfect score (both teams exact)</li>
                <li><b className="text-foreground">+5</b> · right result + one team's goals</li>
                <li><b className="text-foreground">+3</b> · correct win / draw / loss</li>
                <li><b className="text-foreground">+2</b> · one team's goals (wrong result)</li>
                <li><b className="text-foreground">+50</b> · pick the champion</li>
              </ul>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground mb-1">Format</div>
              <ul className="space-y-0.5 text-xs">
                <li>12 groups of 4 teams</li>
                <li>Top 2 + 8 best 3rd advance</li>
                <li>Round of 32 → Final</li>
                <li>Opening: Estadio Azteca, CDMX</li>
                <li>Final: MetLife Stadium, NJ</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
