import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

import Sidebar from '@/components/Sidebar';
import Login   from '@/pages/Login';

// Code-split routes so the initial bundle stays small. Each page becomes its own chunk.
const Home        = lazy(() => import('@/pages/Home'));
const Predictions = lazy(() => import('@/pages/Predictions'));
const Groups      = lazy(() => import('@/pages/Groups'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Bracket     = lazy(() => import('@/pages/Bracket'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.12em', color: 'var(--muted)' }}>
      LOADING…
    </div>
  );
}

export default function App() {
  const [user, setUser]     = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    // Get initial session (covers OAuth redirect-back)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoaded(true);
    });

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!loaded) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.12em', color: 'var(--muted)' }}>
      LOADING…
    </div>
  );

  if (!user) return <Login />;

  // Build a user object compatible with existing components
  const appUser = {
    id:    user.id,
    name:  user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email,
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar user={appUser} onLogout={() => supabase.auth.signOut()} />
      <main className="main-pad" style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px 16px 40px' : '32px 36px', overflowX: 'hidden' }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/groups"      element={<Groups />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/bracket"     element={<Bracket />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
