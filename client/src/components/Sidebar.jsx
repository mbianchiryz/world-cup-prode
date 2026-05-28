import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LogOut, Menu, X } from 'lucide-react';

// ── Icon helpers ──────────────────────────────────────────────────────────────
function IHome(s = 18) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>;
}
function ITarget(s = 18) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>;
}
function IGrid(s = 18) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function IBars(s = 18) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="20" x2="5" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="19" y1="20" x2="19" y2="14"/></svg>;
}

const LINKS = [
  { href: '/',            label: 'Home',        icon: IHome,   color: 'var(--ink)'   },
  { href: '/predictions', label: 'Predictions', icon: ITarget, color: 'var(--red)'   },
  { href: '/groups',      label: 'Groups',      icon: IGrid,   color: 'var(--blue)'  },
  { href: '/leaderboard', label: 'Standings',   icon: IBars,   color: 'var(--green)' },
];

function NavLink({ link, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const isYellow = link.color === 'var(--yellow)';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        borderRadius: 'var(--r)',
        background: active ? link.color : hovered ? 'var(--ink-2)' : 'transparent',
        color: active ? (isYellow ? 'var(--ink)' : '#fff') : '#D8D5CB',
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: '-0.01em',
        transition: 'all .15s',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ display: 'inline-flex' }}>{link.icon(18)}</span>
      <span>{link.label}</span>
      {active && (
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11 }}>·</span>
      )}
    </button>
  );
}

function SidebarContent({ user, onLogout, location, navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Brand */}
      <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid var(--line-2)' }}>
        <div className="label" style={{ color: '#6B6B70', marginBottom: 8 }}>RYZ LABS · WORLD CUP 2026</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 38,
            lineHeight: 0.82,
            letterSpacing: '-0.04em',
            color: 'var(--bg)',
          }}>PRODE</div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            background: 'var(--yellow)',
            color: 'var(--ink)',
            fontFamily: 'var(--display)',
            fontSize: 38,
            lineHeight: 0.82,
            letterSpacing: '-0.05em',
            padding: '0 8px 2px',
            borderRadius: 6,
          }}>26</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        {LINKS.map((l) => (
          <NavLink
            key={l.href}
            link={l}
            active={location.pathname === l.href}
            onClick={() => navigate(l.href)}
          />
        ))}

        {/* Tournament status chip */}
        <div style={{
          marginTop: 'auto',
          padding: 12,
          background: 'var(--ink-2)',
          borderRadius: 'var(--r)',
          marginBottom: 4,
        }}>
          <div className="label" style={{ color: '#8B8B90', marginBottom: 8 }}>FIFA WORLD CUP 2026</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: 999,
              background: 'var(--green)',
              animation: 'pulse-green 2s infinite',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--bg)' }}>Season 2026</span>
          </div>
          <div style={{ fontSize: 11, color: '#8B8B90' }}>Jun 11 – Jul 19 · 104 matches</div>
        </div>
      </nav>

      {/* User */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--line-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 34, height: 34,
          background: 'var(--pink)',
          color: '#fff',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--display)',
          fontSize: 14,
          flexShrink: 0,
        }}>
          {(user?.name?.[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2, color: 'var(--bg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'Player'}
          </div>
          <div style={{ fontSize: 11, color: '#8B8B90' }}>
            {user?.email?.split('@')[0]}
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Logout"
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: 'var(--r-sm)',
            color: '#8B8B90',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-2)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B8B90'; }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const sidebarStyle = {
    width: 240,
    flexShrink: 0,
    background: 'var(--ink)',
    color: 'var(--bg)',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
  };

  return (
    <>
      {/* Mobile top bar */}
      <header style={{
        display: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: 56,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--line)',
        background: 'var(--ink)',
        padding: '0 16px',
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--bg)', letterSpacing: '-0.04em' }}>PRODE</span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 22, background: 'var(--yellow)', color: 'var(--ink)', padding: '0 5px 1px', borderRadius: 4, letterSpacing: '-0.04em' }}>26</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--bg)', display: 'flex' }}
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} className="sm:hidden">
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,15,0.6)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{ ...sidebarStyle, position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                all: 'unset', cursor: 'pointer',
                position: 'absolute', right: 12, top: 12,
                color: '#8B8B90', display: 'flex',
              }}
            >
              <X size={20} />
            </button>
            <SidebarContent user={user} onLogout={onLogout} location={location} navigate={navigate} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside style={sidebarStyle} className="hidden sm:flex">
        <SidebarContent user={user} onLogout={onLogout} location={location} navigate={navigate} />
      </aside>

    </>
  );
}
