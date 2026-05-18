import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function Login({ onLogin }) {
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.post('/api/auth/login', { name });
      const me = await api.get('/api/auth/me');
      onLogin(me.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">World Cup 2026</h1>
      </div>
      <p className="text-sm text-muted-foreground">Office Pool · Season 2026</p>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join the Pool</CardTitle>
          <CardDescription>
            Enter your name — returning players sign in with the same name they used before.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your name or nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              minLength={2}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2">
            <Button type="submit" disabled={loading || name.trim().length < 2}>
              {loading ? 'Signing in…' : 'Start Predicting →'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="text-xs text-muted-foreground text-center max-w-md">
        🎯 Points: <b>+7</b> exact · <b>+5</b> winner + one team · <b>+3</b> winner · <b>+2</b> one team (wrong result) · <b>+50</b> champion
      </div>
    </div>
  );
}
