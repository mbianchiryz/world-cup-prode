import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getFlag } from '@/lib/matches-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Check, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function isLocked(matchTime) {
  return Date.now() >= new Date(matchTime).getTime() - 60 * 60 * 1000;
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
          <span className="text-muted-foreground flex items-center gap-1">
            {locked && !match.finished ? <><Lock className="h-3 w-3" />Locked</> : null}
            {match.finished ? '✓ Final' : null}
          </span>
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
      {locked && !match.finished && !isTBD && (
        <div className="border-t px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
          <Lock className="h-2.5 w-2.5" />Locked
        </div>
      )}
    </div>
  );
}

// ── Bracket view ──────────────────────────────────────────────────────────────
const BRACKET_ROUNDS = [
  { key: 'r32',   label: 'Round of 32',    stages: ['r32'] },
  { key: 'r16',   label: 'Round of 16',    stages: ['r16'] },
  { key: 'qf',    label: 'Quarter-finals', stages: ['qf']  },
  { key: 'sf',    label: 'Semi-finals',    stages: ['sf']  },
  { key: 'final', label: 'Final',          stages: ['3rd', 'final'] },
];

function BracketView({ matches, preds, onSave }) {
  const roundMatches = BRACKET_ROUNDS.map((r) => ({
    ...r,
    matches: matches.filter((m) => r.stages.includes(m.stage))
      .sort((a, b) => new Date(a.match_time) - new Date(b.match_time)),
  }));

  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <div className="flex gap-3 items-stretch" style={{ minHeight: '640px', minWidth: '900px' }}>
        {roundMatches.map((round) => (
          <div key={round.key} className="flex flex-col flex-1 min-w-[180px]">
            {/* Round header */}
            <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b mb-3">
              {round.label}
            </div>
            {/* Matches evenly distributed in column height */}
            <div className="flex-1 flex flex-col justify-around gap-2">
              {round.matches.map((m) => (
                <BracketTile key={m.id} match={m} pred={preds[m.id]} onSave={onSave} />
              ))}
            </div>
          </div>
        ))}
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
    if (view === 'finals')  return knockoutMatches.filter((m) => ['sf', '3rd', 'final'].includes(m.stage));
    return knockoutMatches.filter((m) => m.stage === view);
  }, [knockoutMatches, view]);

  return (
    <div className="space-y-4">
      <PillBar options={viewOptions} value={view} onChange={setView} />
      {view === 'bracket' ? (
        <BracketView matches={knockoutMatches} preds={preds} onSave={onSave} />
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
      const [{ matches: ms }, { predictions }, champData] = await Promise.all([
        api.get('/api/matches'),
        api.get('/api/predictions'),
        api.get('/api/champion'),
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
    await api.post('/api/predictions', { matchId, homeScore, awayScore });
    setPreds((p) => ({ ...p, [matchId]: { match_id: matchId, home_score: homeScore, away_score: awayScore } }));
  }, []);

  const saveChamp = useCallback(async (team) => {
    await api.post('/api/champion', { team });
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
