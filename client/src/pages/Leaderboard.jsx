import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy } from 'lucide-react';

export default function Leaderboard() {
  const [data, setData] = useState({ standings: [], champion: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/leaderboard').then(setData).finally(() => setLoading(false));
    const i = setInterval(() => api.get('/api/leaderboard').then(setData).catch(() => {}), 60_000);
    return () => clearInterval(i);
  }, []);

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
                <TableHead className="text-center">Exact</TableHead>
                <TableHead className="text-center">Winner</TableHead>
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.standings.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    {s.pickedChampion && (
                      <div className="text-xs text-muted-foreground">🏆 {s.pickedChampion}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{s.exact ?? 0}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{s.winner ?? 0}</TableCell>
                  <TableCell className="text-center font-bold text-lg">{s.total ?? 0}</TableCell>
                </TableRow>
              ))}
              {data.standings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No players yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
