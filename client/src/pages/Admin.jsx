import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];

export default function Admin() {
  const [matches, setMatches]   = useState([]);
  const [stage, setStage]       = useState('group');
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [drafts, setDrafts]     = useState({}); // { matchId: { home, away } }

  function loadMatches() {
    return api.get('/api/matches').then((d) => setMatches(d.matches || []));
  }

  useEffect(() => { loadMatches(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const r = await api.post('/api/fifa-sync');
      setSyncMsg(`✓ Synced — updated: ${r.updated}, skipped: ${r.skipped}`);
      await loadMatches();
    } catch (e) {
      setSyncMsg('✕ ' + e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave(m) {
    const d = drafts[m.id] || {};
    const homeScore = d.home === undefined ? m.home_score : (d.home === '' ? null : Number(d.home));
    const awayScore = d.away === undefined ? m.away_score : (d.away === '' ? null : Number(d.away));
    const finished = homeScore != null && awayScore != null;
    try {
      await api.post('/api/results', { matchId: m.id, homeScore, awayScore, finished });
      setDrafts((p) => { const x = { ...p }; delete x[m.id]; return x; });
      await loadMatches();
    } catch (e) {
      alert(e.message);
    }
  }

  const filtered = matches.filter((m) => m.stage === stage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-sm text-muted-foreground">{syncMsg}</span>}
          <Button onClick={handleSync} disabled={syncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from ESPN'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match Results</CardTitle>
          <CardDescription>Manually edit scores. The ESPN auto-sync handles most cases.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={stage} onValueChange={setStage}>
            <TabsList className="flex-wrap h-auto">
              {STAGE_ORDER.map((s) => <TabsTrigger key={s} value={s}>{s}</TabsTrigger>)}
            </TabsList>

            <TabsContent value={stage} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead className="text-center w-32">Score</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const d = drafts[m.id] || {};
                    const h = d.home ?? (m.home_score ?? '');
                    const a = d.away ?? (m.away_score ?? '');
                    const dirty = d.home !== undefined || d.away !== undefined;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.home_team} vs {m.away_team}
                          <div className="text-xs text-muted-foreground">
                            {new Date(m.match_time).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-center">
                            <Input className="w-12 h-8 px-1 text-center leading-none" type="number" min="0" max="20"
                              value={h} onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))} />
                            <span>–</span>
                            <Input className="w-12 h-8 px-1 text-center leading-none" type="number" min="0" max="20"
                              value={a} onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${m.finished ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                            {m.finished ? '✓ Final' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant={dirty ? 'default' : 'ghost'} disabled={!dirty} onClick={() => handleSave(m)}>
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
