import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Moon, Sun, LogOut, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('prode_dark', String(next));
  }

  async function handleLogout() {
    await api.post('/api/auth/logout').catch(() => {});
    onLogout();
    navigate('/');
  }

  const links = [
    { href: '/predictions', label: 'Predictions' },
    { href: '/groups',      label: 'Groups' },
    { href: '/leaderboard', label: 'Standings' },
    ...(user?.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to="/predictions" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5" />
          <span>World Cup '26</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {links.map((l) => (
            <Button
              key={l.href}
              variant={location.pathname === l.href ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate(l.href)}
            >
              {l.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleDark} title="Toggle dark mode">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-muted-foreground">{user?.name}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Out</span>
          </Button>
        </div>
      </div>

      <nav className="sm:hidden flex border-t">
        {links.map((l) => (
          <Button
            key={l.href}
            variant="ghost"
            size="sm"
            className={`flex-1 rounded-none ${location.pathname === l.href ? 'bg-secondary' : ''}`}
            onClick={() => navigate(l.href)}
          >
            {l.label}
          </Button>
        ))}
      </nav>
    </header>
  );
}
