import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getFlag, ALL_TEAMS, STAGE_LABELS } from '@/lib/matches-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Check, Trophy } from 'lucide-react';

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];

function isLocked(matchTime) {
  return Date.now() >= new Date(matchTime).getTime() - 60 * 60 * 1000;
}

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
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{match.group_name ? `Group ${match.group_name} · ` : ''}MD{match.matchday ?? '–'}</span>
          <span>{new Date(match.match_time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          {/* Home */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{getFlag(match.home_team)}</span>
            <span className="font-semibold uppercase text-sm truncate">{match.home_team}</span>
          </div>

          {/* Score boxes */}
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

          {/* Away */}
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

export default function Predictions() {
  const [matches, setMatches] = useState([]);
  const [preds, setPreds]     = useState({});
  const [champ, setChamp]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage]     = useState('group');

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

  // Auto-refresh every 60s
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

  const filtered = useMemo(() => matches.filter((m) => m.stage === stage), [matches, stage]);
  const made = Object.keys(preds).length;

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Your Picks</h1>
          <span className="text-sm text-muted-foreground"><b className="text-foreground text-xl">{made}</b> of 104</span>
        </div>
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${(made / 104) * 100}%` }} />
        </div>
      </div>

      {/* Champion picker */}
      {champ && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Champion Pick
            </CardTitle>
          </CardHeader>
          <CardContent>
            {champ.champion ? (
              <div className="text-sm">🏆 Tournament champion: <b>{champ.champion}</b></div>
            ) : champ.locked ? (
              <div className="text-sm text-muted-foreground">
                <Lock className="inline h-3 w-3 mr-1" />
                Locked. Your pick: <b>{champ.prediction || '— none —'}</b>
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

      {/* Stage tabs */}
      <Tabs value={stage} onValueChange={setStage}>
        <TabsList className="flex-wrap h-auto">
          {STAGE_ORDER.map((s) => (
            <TabsTrigger key={s} value={s}>{STAGE_LABELS[s]}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={stage} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((m) => (
              <MatchCard key={m.id} match={m} pred={preds[m.id]} onSave={savePred} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
