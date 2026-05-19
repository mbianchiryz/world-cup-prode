import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

import Sidebar      from '@/components/Sidebar';
import Login        from '@/pages/Login';
import Home         from '@/pages/Home';
import Predictions  from '@/pages/Predictions';
import Groups       from '@/pages/Groups';
import Leaderboard  from '@/pages/Leaderboard';
import Admin        from '@/pages/Admin';

export default function App() {
  const [user, setUser]     = useState(null);
  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    const dark = localStorage.getItem('prode_dark') === 'true';
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  if (!loaded) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;

  if (!user) return <Login />;

  // Build a user object compatible with existing components
  const appUser = {
    id:      user.id,
    name:    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email:   user.email,
    isAdmin: false,  // will be fetched from profiles table later
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={appUser} onLogout={() => supabase.auth.signOut()} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/groups"      element={<Groups />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin"       element={appUser.isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
