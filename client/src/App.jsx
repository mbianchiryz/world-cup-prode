import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from '@/lib/api';

import Sidebar      from '@/components/Sidebar';
import Login        from '@/pages/Login';
import Predictions  from '@/pages/Predictions';
import Groups       from '@/pages/Groups';
import Leaderboard  from '@/pages/Leaderboard';
import Admin        from '@/pages/Admin';

export default function App() {
  const [user, setUser]     = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const dark = localStorage.getItem('prode_dark') === 'true';
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  if (!loaded) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Login onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} onLogout={() => setUser(null)} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/"            element={<Navigate to="/predictions" replace />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/groups"      element={<Groups />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin"       element={user.isAdmin ? <Admin /> : <Navigate to="/predictions" replace />} />
          <Route path="*"            element={<Navigate to="/predictions" replace />} />
        </Routes>
      </main>
    </div>
  );
}
