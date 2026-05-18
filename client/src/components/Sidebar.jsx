import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Moon, Sun, LogOut, Trophy, Home as HomeIcon, Target, LayoutGrid, BarChart3, Settings, Menu, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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
    { href: '/',            label: 'Home',        Icon: HomeIcon },
    { href: '/predictions', label: 'Predictions', Icon: Target },
    { href: '/groups',      label: 'Groups',      Icon: LayoutGrid },
    { href: '/leaderboard', label: 'Standings',   Icon: BarChart3 },
    ...(user?.isAdmin ? [{ href: '/admin', label: 'Admin', Icon: Settings }] : []),
  ];

  const SidebarInner = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Trophy className="h-5 w-5 text-primary" />
        <div className="font-semibold leading-tight">
          World Cup '26
          <div className="text-xs font-normal text-muted-foreground">Office Pool</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ href, label, Icon }) => (
          <button
            key={href}
            onClick={() => navigate(href)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === href
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer: user + actions */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-medium truncate">{user?.name}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="flex-1" onClick={toggleDark} title="Toggle theme">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="flex-1" onClick={handleLogout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sm:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-semibold">World Cup '26</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-background shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            {SidebarInner}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-60 flex-shrink-0 border-r bg-background sticky top-0 h-screen">
        {SidebarInner}
      </aside>
    </>
  );
}
