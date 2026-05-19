import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { hd: 'ryzlabs.com' },  // hint: only show ryzlabs accounts
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
    // On success, browser redirects to Google → comes back → App.jsx handles session
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
      <p className="relative z-10 text-sm text-muted-foreground">RYZ Labs · Office Pool · Season 2026</p>

      <Card className="w-full max-w-md relative z-10">
        <CardHeader>
          <CardTitle>Join the Pool</CardTitle>
          <CardDescription>
            Sign in with your RYZ Labs Google account to participate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center max-w-md relative z-10">
        Points: <b>+7</b> exact · <b>+5</b> winner + one team · <b>+3</b> winner · <b>+2</b> one team (wrong result) · <b>+50</b> champion
      </div>
    </div>
  );
}
