import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
        queryParams: { hd: 'ryzlabs.com' },
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const GOOGLE_ICON = (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Soccer pitch lines */}
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0.06, pointerEvents: 'none', color: 'var(--bg)',
        }}
      >
        <rect x="50" y="100" width="1100" height="600" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="600" y1="100" x2="600" y2="700" stroke="currentColor" strokeWidth="2"/>
        <circle cx="600" cy="400" r="100" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect x="50" y="250" width="150" height="300" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect x="1000" y="250" width="150" height="300" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="600" cy="400" r="6" fill="currentColor"/>
        <circle cx="175" cy="400" r="4" fill="currentColor"/>
        <circle cx="1025" cy="400" r="4" fill="currentColor"/>
      </svg>

      {/* Brand */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 40 }}>
        <div className="label" style={{ color: '#6B6B70', marginBottom: 12 }}>RYZ LABS · OFFICE POOL · WORLD CUP 2026</div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--display)', fontSize: 72, lineHeight: 0.82,
            letterSpacing: '-0.04em', color: 'var(--bg)',
          }}>PRODE</span>
          <span style={{
            fontFamily: 'var(--display)', fontSize: 72, lineHeight: 0.82,
            letterSpacing: '-0.05em', background: 'var(--yellow)', color: 'var(--ink)',
            padding: '0 12px 4px', borderRadius: 8,
          }}>26</span>
        </div>
        <p style={{ color: '#8B8B90', fontSize: 15, marginTop: 16, fontWeight: 500 }}>
          104 matches · 48 nations · One champion
        </p>
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        background: 'var(--bg)',
        borderRadius: 'var(--r-xl)',
        padding: 32,
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--display)', fontSize: 28,
            letterSpacing: '-0.03em', margin: '0 0 6px',
          }}>Join the Pool</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
            Sign in with your RYZ Labs Google account to participate.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(230,48,34,0.1)', border: '1px solid var(--red)',
            color: 'var(--red)', borderRadius: 'var(--r-sm)',
            padding: '10px 14px', fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            all: 'unset',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10,
            width: '100%', boxSizing: 'border-box',
            background: loading ? 'var(--bg-2)' : 'var(--ink)',
            color: loading ? 'var(--muted)' : 'var(--bg)',
            borderRadius: 'var(--r)',
            fontWeight: 700, fontSize: 14,
            padding: '14px 0',
            transition: 'background .15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {GOOGLE_ICON}
          {loading ? 'Redirecting…' : 'Sign in with Google'}
        </button>
      </div>

      {/* Scoring hint */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 28, color: '#6B6B70',
        fontSize: 12, textAlign: 'center', maxWidth: 420,
        fontFamily: 'var(--mono)', letterSpacing: '0.04em',
      }}>
        +7 EXACT · +5 WINNER + ONE TEAM · +3 WINNER · +2 ONE TEAM · +50 CHAMPION
      </div>
    </div>
  );
}
