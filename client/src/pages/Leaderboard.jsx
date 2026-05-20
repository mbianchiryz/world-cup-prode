import { useEffect, useState, useCallback } from 'react';
import { getFlag } from '@/lib/matches-data';
import { getLeaderboard, getUserPicks } from '@/lib/supabase-db';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trophy, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Points badge ──────────────────────────────────────────────────────────────
function PtsBadge({ pts }) {
  if (pts === null) {
    return <span className="text-xs text-muted-foreground italic">no pick</span>;
  }
  const color =
    pts === 7 ? 'bg-emerald-500 text-white' :
    pts >= 5  ? 'bg-green-500 text-white'   :
    pts >= 3  ? 'bg-blue-500 text-white'    :
    pts >= 2  ? 'bg-yellow-500 text-white'  :
    pts > 0   ? 'bg-orange-500 text-white'  :
                'bg-muted text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', color)}>
      {pts > 0 ? `+${pts}` : '0'}
    </span>
  );
}

// ── Stage label ───────────────────────────────────────────────────────────────
function stageLabel(stage, group) {
  if (stage === 'group') return group ? `Group ${group}` : 'Group';
  const map = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', final: 'Final', third: '3rd Place' };
  return map[stage] ?? stage;
}

// ── Player detail modal ───────────────────────────────────────────────────────
function PlayerModal({ player, onClose }) {
  const [picks, setPicks]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getUserPicks(player.id)
      .then((d) => setPicks(d.picks || []))
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [player.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalEarned = picks?.reduce((s, p) => s + (p.points ?? 0), 0) ?? 0;
  const picksWithPred = picks?.filter((p) => p.pred_home !== null) ?? [];

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />

      {/* panel */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-background shadow-2xl border overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-primary text-primary-foreground flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <Trophy className="h-5 w-5 opacity-80" />
              {player.name}
            </div>
            <div className="text-xs text-primary-foreground/70 mt-0.5">
              Predictions on finished matches
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          )}
          {error && (
            <div className="p-8 text-center text-destructive text-sm">{error}</div>
          )}
          {!loading && !error && picks !== null && (
            <>
              {/* summary strip */}
              <div className="flex items-center gap-6 px-5 py-3 border-b bg-secondary/30 text-sm flex-shrink-0">
                <span className="text-muted-foreground">
                  Matches picked: <b className="text-foreground">{picksWithPred.length}</b> / {picks.length}
                </span>
                <span className="text-muted-foreground">
                  Points earned: <b className="text-foreground">{totalEarned}</b>
                </span>
              </div>

              {/* picks table */}
              {picks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No finished matches yet.
                </div>
              ) : (
                <div className="divide-y">
                  {picks.map((pick) => (
                    <PickRow key={pick.match_id} pick={pick} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PickRow({ pick }) {
  const hasPred = pick.pred_home !== null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 text-sm',
      !hasPred && 'opacity-60',
    )}>
      {/* stage badge */}
      <span className="hidden sm:inline-flex flex-shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground w-20 text-right">
        {stageLabel(pick.stage, pick.group_name)}
      </span>

      {/* match: home */}
      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
        <span className="font-medium truncate">{pick.home_team}</span>
        <span className="text-lg flex-shrink-0">{getFlag(pick.home_team)}</span>
      </div>

      {/* scores block */}
      <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
        {/* actual result */}
        <div className="flex items-center gap-1 tabular-nums font-bold text-base leading-none">
          <span>{pick.home_score}</span>
          <span className="text-muted-foreground text-xs">–</span>
          <span>{pick.away_score}</span>
        </div>
        {/* prediction */}
        {hasPred ? (
          <div className="flex items-center gap-1 tabular-nums text-xs text-muted-foreground leading-none">
            <span>{pick.pred_home}</span>
            <span>–</span>
            <span>{pick.pred_away}</span>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground italic leading-none">–</div>
        )}
      </div>

      {/* match: away */}
      <div className="flex items-center gap-1.5 flex-1 justify-start min-w-0">
        <span className="text-lg flex-shrink-0">{getFlag(pick.away_team)}</span>
        <span className="font-medium truncate">{pick.away_team}</span>
      </div>

      {/* points */}
      <div className="flex-shrink-0 w-12 text-right">
        <PtsBadge pts={hasPred ? pick.points : null} />
      </div>
    </div>
  );
}

// ── Main Leaderboard page ─────────────────────────────────────────────────────
export default function Leaderboard() {
  const [data, setData]               = useState({ standings: [], champion: null });
  const [loading, setLoading]         = useState(true);
  const [selectedPlayer, setSelected] = useState(null);

  useEffect(() => {
    getLeaderboard().then(setData).finally(() => setLoading(false));
    const i = setInterval(() => getLeaderboard().then(setData).catch(() => {}), 60_000);
    return () => clearInterval(i);
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Standings</h1>
        {data.champion && (
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            <span>Champion: <b>{data.champion}</b></span>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center" title="Exact-score picks (7 pts each)">Exact</TableHead>
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.standings.map((s, i) => (
                <TableRow
                  key={s.id}
                  className={cn(
                    selectedPlayer?.id === s.id && 'bg-secondary/60',
                  )}
                >
                  <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelected(s)}
                      className="text-left group flex flex-col gap-0.5 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-1 font-medium group-hover:underline underline-offset-2">
                        {s.name}
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {s.pickedChampion && (
                        <div className="text-xs text-muted-foreground">🏆 {s.pickedChampion}</div>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{s.exact ?? 0}</TableCell>
                  <TableCell className="text-center font-bold text-lg">{s.total ?? 0}</TableCell>
                </TableRow>
              ))}
              {data.standings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No players yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={handleClose} />
      )}
    </div>
  );
}
