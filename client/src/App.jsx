import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';

import Navbar       from '@/components/Navbar';
import Login        from '@/pages/Login';
import Predictions  from '@/pages/Predictions';
import Groups       from '@/pages/Groups';
import Leaderboard  from '@/pages/Leaderboard';
import Admin        from '@/pages/Admin';

export default function App() {
  const [user, setUser]   = useState(null);
  const [loaded, setLoaded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.get('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  // Dark mode init
  useEffect(() => {
    const dark = localStorage.getItem('prode_dark') === 'true';
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  if (!loaded) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;

  // Unauthenticated → only show login
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Login onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={() => setUser(null)} />
      <main className="container py-6">
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
