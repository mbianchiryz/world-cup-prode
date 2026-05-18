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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 gap-6 overflow-hidden">
      {/* Soccer pitch lines background */}
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full text-foreground opacity-[0.07]"
      >
        <rect x="50"   y="100" width="1100" height="600" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="600" y1="100" x2="600" y2="700"        stroke="currentColor" strokeWidth="2"/>
        <circle cx="600" cy="400" r="100" fill="none"    stroke="currentColor" strokeWidth="2"/>
        <rect x="50"   y="250" width="150"  height="300" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect x="1000" y="250" width="150"  height="300" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="600"  cy="400" r="6" fill="currentColor"/>
        <circle cx="175"  cy="400" r="4" fill="currentColor"/>
        <circle cx="1025" cy="400" r="4" fill="currentColor"/>
      </svg>

      <div className="relative z-10 flex items-center gap-2">
        <Trophy className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">World Cup 2026</h1>
      </div>
      <p className="relative z-10 text-sm text-muted-foreground">Office Pool · Season 2026</p>

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
