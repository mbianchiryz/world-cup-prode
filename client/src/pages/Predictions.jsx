import { useEffect, useMemo, useState, useCallback } from 'react';
import { getFlag } from '@/lib/matches-data';
import { getMatches, getMyPredictions, savePrediction, getChampionData, saveChampionPick } from '@/lib/supabase-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Check, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
const LOCK_OFFSET_MS = 60 * 60 * 1000; // 1 hour before kickoff

function isLocked(matchTime) {
  return Date.now() >= new Date(matchTime).getTime() - LOCK_OFFSET_MS;
}

/** Returns ms remaining until the pick deadline (matchTime − 1h). Negative = already locked. */
function msUntilLock(matchTime) {
  return new Date(matchTime).getTime() - LOCK_OFFSET_MS - Date.now();
}

/**
 * Live countdown to pick deadline.
 * Updates every second while open, every minute when > 10 min away.
 * Returns { label, urgency: 'open'|'soon'|'imminent'|'locked'|'finished' }
 */
function usePickCountdown(matchTime, finished) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (finished) return;
    const ms = msUntilLock(matchTime);
    // tick every second if < 10 min left, otherwise every 30s
    const interval = ms > 0 && ms < 10 * 60_000 ? 1000 : 30_000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [matchTime, finished]);

  if (finished) return { label: null, urgency: 'finished' };

  const ms = new Date(matchTime).getTime() - LOCK_OFFSET_MS - now;
  if (ms <= 0) return { label: null, urgency: 'locked' };

  const totalSecs = Math.floor(ms / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;

  let label;
  if (days > 0)        label = `${days}d ${hours}h`;
  else if (hours > 0)  label = `${hours}h ${mins}m`;
  else if (mins >= 1)  label = `${mins}m ${secs}s`;
  else                 label = `${secs}s`;

  const urgency =
    ms > 6 * 3_600_000  ? 'open'     :  // > 6h  → neutral
    ms > 2 * 3_600_000  ? 'soon'     :  // > 2h  → amber
                          'imminent';    // < 2h  → red

  return { label, urgency };
}

const URGENCY_STYLES = {
  open:     'text-muted-foreground',
  soon:     'text-amber-500 font-medium',
  imminent: 'text-red-500 font-semibold',
};

function CountdownBadge({ matchTime, finished }) {
  const { label, urgency } = usePickCountdown(matchTime, finished);

  if (urgency === 'finished') return <span className="text-xs text-muted-foreground">✓ Final</span>;
  if (urgency === 'locked')   return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Lock className="h-3 w-3" />Picks closed
    </span>
  );

  return (
    <span className={cn('text-xs flex items-center gap-1', URGENCY_STYLES[urgency])}>
      <Lock className="h-3 w-3" />
      {label} left
    </span>
  );
}

// ── MatchCard (grid view) ─────────────────────────────────────────────────────
function MatchCard({ match, pred, onSave }) {
  const locked  = isLocked(match.match_time);
  const canEdit = !match.finished && !locked && match.home_team !== 'TBD' && match.away_team !== 'TBD';

  const [h, setH] = useState(pred?.home_score ?? '');
  const [a, setA] = useState(pred?.away_score ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setH(pred?.home_score ?? '');
    setA(pred?.away_score ?? '');
  }, [pred?.home_score, pred?.away_score]);

  async function handleSave() {
    if (h === '' || a === '') return;
    try {
      await onSave(match.id, Number(h), Number(a));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) { alert(e.message); }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{match.group_name ? `Group ${match.group_name} · ` : ''}
            {match.matchday ? `MD${match.matchday}` : '–'}</span>
          <span>{new Date(match.match_time).toLocaleString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{getFlag(match.home_team)}</span>
            <span className="font-semibold uppercase text-sm truncate">{match.home_team}</span>
          </div>

          <div className="flex items-center gap-1">
            {match.finished ? (
              <>
                <div className="w-10 h-10 rounded-md border-2 border-primary bg-primary/10 flex items-center justify-center font-bold text-lg">{match.home_score}</div>
                <span className="text-muted-foreground px-1">–</span>
                <div className="w-10 h-10 rounded-md border-2 border-primary bg-primary/10 flex items-center justify-center font-bold text-lg">{match.away_score}</div>
              </>
            ) : canEdit ? (
              <>
                <Input className="w-12 h-10 px-1 text-center text-lg font-bold leading-none" type="number" min="0" max="20"
                  value={h} onChange={(e) => setH(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
                <span className="text-muted-foreground px-1">–</span>
                <Input className="w-12 h-10 px-1 text-center text-lg font-bold leading-none" type="number" min="0" max="20"
                  value={a} onChange={(e) => setA(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-md border flex items-center justify-center text-muted-foreground">{pred?.home_score ?? '–'}</div>
                <span className="text-muted-foreground px-1">–</span>
                <div className="w-10 h-10 rounded-md border flex items-center justify-center text-muted-foreground">{pred?.away_score ?? '–'}</div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
            <span className="text-2xl">{getFlag(match.away_team)}</span>
            <span className="font-semibold uppercase text-sm truncate">{match.away_team}</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <CountdownBadge matchTime={match.match_time} finished={match.finished} />
          {canEdit && (
            <Button size="sm" variant={saved ? 'default' : 'secondary'} onClick={handleSave} disabled={h === '' || a === ''}>
              {saved ? <><Check className="h-3 w-3 mr-1" />Saved</> : 'Save Pick'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Bracket match tile ────────────────────────────────────────────────────────
function BracketTile({ match, pred, onSave }) {
  const isTBD   = match.home_team === 'TBD' || match.away_team === 'TBD';
  const locked  = isLocked(match.match_time);
  const canEdit = !match.finished && !locked && !isTBD;

  const [h, setH] = useState(pred?.home_score ?? '');
  const [a, setA] = useState(pred?.away_score ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setH(pred?.home_score ?? '');
    setA(pred?.away_score ?? '');
  }, [pred?.home_score, pred?.away_score]);

  async function handleSave() {
    if (h === '' || a === '') return;
    try {
      await onSave(match.id, Number(h), Number(a));
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) { alert(e.message); }
  }

  function TeamRow({ team, scoreVal, isHome }) {
    const isWinner = match.finished && (
      isHome
        ? match.home_score > match.away_score || match.winner === 'home'
        : match.away_score > match.home_score || match.winner === 'away'
    );
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1.5',
        isWinner && 'font-semibold',
        isTBD && 'opacity-40',
      )}>
        <span className="text-base leading-none flex-shrink-0">{getFlag(team)}</span>
        <span className="text-xs truncate flex-1">{team === 'TBD' ? '?' : team}</span>
        {scoreVal !== null && scoreVal !== undefined && (
          <span className={cn('text-xs font-bold tabular-nums flex-shrink-0', isWinner && 'text-primary')}>{scoreVal}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border bg-card overflow-hidden text-sm transition-shadow',
      canEdit && 'hover:shadow-md',
      match.finished && 'border-primary/30',
    )}>
      <TeamRow team={match.home_team}
        scoreVal={match.finished ? match.home_score : pred?.home_score}
        isHome />
      <div className="border-t" />
      <TeamRow team={match.away_team}
        scoreVal={match.finished ? match.away_score : pred?.away_score}
        isHome={false} />

      {/* Quick-pick on bracket tiles */}
      {canEdit && (
        <div className="border-t flex items-center gap-1 px-2 py-1.5 bg-secondary/30">
          <Input className="w-9 h-7 px-1 text-center text-sm font-bold leading-none" type="number" min="0" max="20"
            value={h} onChange={(e) => setH(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          <span className="text-muted-foreground text-xs">–</span>
          <Input className="w-9 h-7 px-1 text-center text-sm font-bold leading-none" type="number" min="0" max="20"
            value={a} onChange={(e) => setA(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          <Button size="sm" className="h-7 px-2 text-xs ml-auto" variant={saved ? 'default' : 'secondary'}
            onClick={handleSave} disabled={h === '' || a === ''}>
            {saved ? <Check className="h-3 w-3" /> : 'Save'}
          </Button>
        </div>
      )}
      {/* Countdown / status strip on bracket tile */}
      {!canEdit && !isTBD && (
        <div className="border-t px-2 py-1">
          <CountdownBadge matchTime={match.match_time} finished={match.finished} />
        </div>
      )}
    </div>
  );
}

// ── Bracket view ──────────────────────────────────────────────────────────────
const MAIN_ROUNDS = [
  { key: 'r32', label: 'Round of 32',    stage: 'r32' },
  { key: 'r16', label: 'Round of 16',    stage: 'r16' },
  { key: 'qf',  label: 'Quarter-finals', stage: 'qf'  },
  { key: 'sf',  label: 'Semi-finals',    stage: 'sf'  },
];

function BracketView({ matches, preds, onSave }) {
  const finalMatch = matches.find((m) => m.stage === 'final');
  const thirdMatch = matches.find((m) => m.stage === '3rd');

  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <div className="flex gap-3 items-stretch" style={{ minHeight: '680px', minWidth: '960px' }}>

        {/* Main rounds: R32 → R16 → QF → SF */}
        {MAIN_ROUNDS.map((round) => {
          const roundMatches = matches
            .filter((m) => m.stage === round.stage)
            .sort((a, b) => new Date(a.match_time) - new Date(b.match_time));
          return (
            <div key={round.key} className="flex flex-col flex-1 min-w-[180px]">
              <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b mb-3">
                {round.label}
              </div>
              <div className="flex-1 flex flex-col justify-around gap-2">
                {roundMatches.map((m) => (
                  <BracketTile key={m.id} match={m} pred={preds[m.id]} onSave={onSave} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Final column: Final at 50% (between SFs), 3rd place at 75% (beside 2nd SF) */}
        <div className="flex flex-col flex-1 min-w-[200px]">
          <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b mb-3">
            Final
          </div>
          <div className="flex-1 relative">

            {/* 🏆 Final — centered at 50% of column height (between the two semi-finals) */}
            <div className="absolute inset-x-0 flex flex-col gap-1.5"
                 style={{ top: '50%', transform: 'translateY(-50%)' }}>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-primary tracking-wide">
                🏆 World Cup Final
              </div>
              {finalMatch && (
                <BracketTile match={finalMatch} pred={preds[finalMatch.id]} onSave={onSave} />
              )}
            </div>

            {/* 🥉 3rd Place — at 75% (aligned alongside the second semi-final) */}
            <div className="absolute inset-x-0 flex flex-col gap-1.5"
                 style={{ top: '75%', transform: 'translateY(-50%)' }}>
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                🥉 3rd Place Play-off
              </div>
              {thirdMatch && (
                <BracketTile match={thirdMatch} pred={preds[thirdMatch.id]} onSave={onSave} />
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-tab pill bar ──────────────────────────────────────────────────────────
function PillBar({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Group Stage section ───────────────────────────────────────────────────────
function GroupStageSection({ matches, preds, onSave }) {
  const [md, setMd] = useState('all');

  const filtered = useMemo(() => {
    const group = matches.filter((m) => m.stage === 'group');
    if (md === 'all') return group;
    return group.filter((m) => m.matchday === Number(md));
  }, [matches, md]);

  const mdOptions = [
    { value: 'all', label: 'All Matches' },
    { value: '1',   label: 'Matchday 1'  },
    { value: '2',   label: 'Matchday 2'  },
    { value: '3',   label: 'Matchday 3'  },
  ];

  return (
    <div className="space-y-4">
      <PillBar options={mdOptions} value={md} onChange={setMd} />
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((m) => (
          <MatchCard key={m.id} match={m} pred={preds[m.id]} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

// ── Knockout section ──────────────────────────────────────────────────────────
function KnockoutSection({ matches, preds, onSave }) {
  const [view, setView] = useState('bracket');

  const viewOptions = [
    { value: 'bracket', label: '🏆 Bracket'      },
    { value: 'r32',     label: 'Round of 32'     },
    { value: 'r16',     label: 'Round of 16'     },
    { value: 'qf',      label: 'Quarter-finals'  },
    { value: 'sf',      label: 'Semi-finals'     },
    { value: 'finals',  label: 'Finals'          },
  ];

  const knockoutMatches = matches.filter((m) => m.stage !== 'group');

  const filtered = useMemo(() => {
    if (view === 'bracket') return knockoutMatches;
    if (view === 'finals')  return knockoutMatches.filter((m) => ['3rd', 'final'].includes(m.stage));
    return knockoutMatches.filter((m) => m.stage === view);
  }, [knockoutMatches, view]);

  return (
    <div className="space-y-4">
      <PillBar options={viewOptions} value={view} onChange={setView} />
      {view === 'bracket' ? (
        <BracketView matches={knockoutMatches} preds={preds} onSave={onSave} />
      ) : view === 'finals' ? (
        /* Finals view: Final + 3rd place with distinct labels */
        <div className="grid gap-6 sm:grid-cols-2">
          {/* 3rd place first (earlier date), then Final */}
          {[
            { stage: '3rd',   icon: '🥉', label: '3rd Place Play-off' },
            { stage: 'final', icon: '🏆', label: 'World Cup Final'    },
          ].map(({ stage, icon, label }) => {
            const m = knockoutMatches.find((x) => x.stage === stage);
            if (!m) return null;
            return (
              <div key={stage} className="space-y-2">
                <div className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold',
                  stage === 'final' ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {icon} {label}
                </div>
                <MatchCard match={m} pred={preds[m.id]} onSave={onSave} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} pred={preds[m.id]} onSave={onSave} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Predictions page ─────────────────────────────────────────────────────
export default function Predictions() {
  const [matches, setMatches] = useState([]);
  const [preds, setPreds]     = useState({});
  const [champ, setChamp]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('group'); // 'group' | 'knockout'

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, predictions, champData] = await Promise.all([
        getMatches(),
        getMyPredictions(),
        getChampionData(),
      ]);
      setMatches(ms);
      const map = {};
      for (const p of predictions) map[p.match_id] = p;
      setPreds(map);
      setChamp(champData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const i = setInterval(loadAll, 60_000);
    return () => clearInterval(i);
  }, [loadAll]);

  const savePred = useCallback(async (matchId, homeScore, awayScore) => {
    await savePrediction(matchId, homeScore, awayScore);
    setPreds((p) => ({ ...p, [matchId]: { match_id: matchId, home_score: homeScore, away_score: awayScore } }));
  }, []);

  const saveChamp = useCallback(async (team) => {
    await saveChampionPick(team);
    setChamp((c) => ({ ...c, prediction: team }));
  }, []);

  const made = Object.keys(preds).length;

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Your Picks</h1>
          <span className="text-sm text-muted-foreground">
            <b className="text-foreground text-xl">{made}</b> of 104
          </span>
        </div>
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${(made / 104) * 100}%` }} />
        </div>
      </div>

      {/* Champion picker */}
      {champ && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Champion Pick
            </CardTitle>
          </CardHeader>
          <CardContent>
            {champ.champion ? (
              <div className="text-sm">🏆 Tournament champion: <b>{champ.champion}</b></div>
            ) : champ.locked ? (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />Locked · Your pick: <b>{champ.prediction || '— none —'}</b>
              </div>
            ) : (
              <Select value={champ.prediction || ''} onValueChange={saveChamp}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {(champ.teams || []).sort().map((t) => (
                    <SelectItem key={t} value={t}>{getFlag(t)} {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top-level section switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary w-fit">
        {[
          { value: 'group',    label: '⚽ Group Stage' },
          { value: 'knockout', label: '🏆 Knockout'    },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setSection(s.value)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              section === s.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'group' ? (
        <GroupStageSection matches={matches} preds={preds} onSave={savePred} />
      ) : (
        <KnockoutSection matches={matches} preds={preds} onSave={savePred} />
      )}
    </div>
  );
}
