import { useEffect, useState } from 'react';
import { getGroupStandings } from '@/lib/supabase-db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function Groups() {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroupStandings().then(setGroups).finally(() => setLoading(false));
    const i = setInterval(() => getGroupStandings().then(setGroups).catch(() => {}), 60_000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Group Standings</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.letter}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Group {g.letter}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 px-3">Team</TableHead>
                    <TableHead className="h-8 px-2 text-center w-8">P</TableHead>
                    <TableHead className="h-8 px-2 text-center w-8">GD</TableHead>
                    <TableHead className="h-8 px-2 text-center w-8 font-bold">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.standings.map((row, i) => (
                    <TableRow key={row.team} className={i < 2 ? 'bg-primary/5' : ''}>
                      <TableCell className="px-3 py-2 font-medium">
                        <span className="mr-1">{row.flag}</span>{row.team}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center text-muted-foreground">{row.p}</TableCell>
                      <TableCell className="px-2 py-2 text-center text-muted-foreground">
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center font-bold">{row.pts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
