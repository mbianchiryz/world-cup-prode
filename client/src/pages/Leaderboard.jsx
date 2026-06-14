import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getFlag, getAbbr } from '@/lib/matches-data';
import Flag from '@/components/Flag';
import { getLeaderboard, getUserPicks, getBracketLeaderboard, getGroupStandings, getThirdPlaceRanking } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase';
import { calcBracketScore } from '@/lib/bracket-data';

const CLOSE = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>
  </svg>
);

// Champion picks hidden until knockout stage (pick deadline = same date)
const CHAMPION_LOCK_DATE = new Date('2026-06-28T19:00:00.000Z');

// Grid columns (shared between header and row so they always align)
function cols(showChampion) {
  return showChampion
    ? '44px 1fr 64px 68px 60px 64px 70px 110px'
    : '44px 1fr 64px 68px 60px 64px 70px';
}

// ── Trend badge ▲2 / ▼1 / — ──────────────────────────────────────────────────
function TrendBadge({ v }) {
  if (v == null || v === 0) {
    return (
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>—</span>
    );
  }
  const up = v > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
      color: up ? 'var(--green)' : 'var(--red)',
    }}>
      {up ? '▲' : '▼'}{Math.abs(v)}
    </span>
  );
}

// ── Streak badge 5🔥 / 2 / — ─────────────────────────────────────────────────
function StreakBadge({ v }) {
  if (!v) {
    return <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>—</span>;
  }
  const hot = v >= 3;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: hot ? 'var(--orange)' : 'var(--bg-2)',
      color: hot ? '#fff' : 'var(--ink)',
      borderRadius: 999,
      padding: '3px 9px',
      fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11,
    }}>
      {v}{hot ? ' 🔥' : ''}
    </span>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ players, onSelect, showChampion }) {
  const order = [
    { p: players[1], rank: 2, h: 130, color: 'var(--blue)',   fg: '#fff' },
    { p: players[0], rank: 1, h: 170, color: 'var(--yellow)', fg: 'var(--ink)' },
    { p: players[2], rank: 3, h: 100, color: 'var(--red)',    fg: '#fff' },
  ];

  return (
    <div style={{
      background: 'var(--ink)',
      borderRadius: 'var(--r-lg)',
      padding: '28px 24px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative trophy */}
      <div style={{ position: 'absolute', right: 22, top: 20, color: 'var(--yellow)', opacity: 0.9 }}>
        <svg width={52} height={52} viewBox="0 0 24 24" fill="none">
          <path d="M7 3h10v3a5 5 0 0 1-10 0V3z" fill="var(--yellow)"/>
          <path d="M7 5H4v2a3 3 0 0 0 3 3" stroke="var(--yellow)" strokeWidth="1.6" fill="none"/>
          <path d="M17 5h3v2a3 3 0 0 1-3 3" stroke="var(--yellow)" strokeWidth="1.6" fill="none"/>
          <rect x="9" y="11" width="6" height="3" rx="0.5" fill="var(--yellow)"/>
          <rect x="7" y="14" width="10" height="2.5" rx="0.5" fill="var(--yellow)"/>
          <rect x="6" y="17" width="12" height="3" rx="0.5" fill="var(--yellow)"/>
        </svg>
      </div>

      <div className="label" style={{ color: '#8B8B90', marginBottom: 6 }}>CURRENT PODIUM</div>
      <h2 style={{
        fontFamily: 'var(--display)', fontSize: 32,
        color: 'var(--bg)', letterSpacing: '-0.03em',
        margin: '0 0 28px',
      }}>Top of the pool.</h2>

      <div className="podium-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'flex-end' }}>
        {order.map((o) => {
          if (!o.p) return <div key={o.rank} />;
          return (
            <div key={o.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
              <div
                onClick={() => onSelect(o.p)}
                className="podium-card"
                style={{
                  background: 'var(--bg)', color: 'var(--ink)',
                  padding: '12px 14px', borderRadius: 'var(--r)',
                  width: '100%', textAlign: 'center',
                  marginBottom: 8, cursor: 'pointer',
                }}
              >
                {showChampion && o.p.pickedChampion && (
                  <div className="label" style={{ color: 'var(--muted)', marginBottom: 2 }}>
                    <Flag team={o.p.pickedChampion} size={18} /> {o.p.pickedChampion.toUpperCase()} TO WIN
                  </div>
                )}
                <div className="podium-name" style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.p.name}
                </div>
                {/* Mini stat row — hidden on mobile */}
                <div className="podium-mini label" style={{ color: 'var(--muted)', marginTop: 5, display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <span>{o.p.exact ?? 0} perfect</span>
                  <span>{o.p.correct ?? 0} correct</span>
                </div>
                <div className="podium-pts" style={{
                  fontFamily: 'var(--display)', fontSize: 28,
                  letterSpacing: '-0.04em', color: o.color, marginTop: 6, lineHeight: 1,
                }}>
                  {o.p.total}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, marginLeft: 3, fontWeight: 500, color: 'var(--muted)' }}>PTS</span>
                </div>
              </div>
              <div className="podium-block" style={{
                background: o.color, color: o.fg,
                height: o.h, width: '100%',
                borderRadius: 'var(--r-sm) var(--r-sm) 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontSize: 80, letterSpacing: '-0.06em', lineHeight: 0.85,
              }}>{o.rank}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Full Table ────────────────────────────────────────────────────────────────
function FullTable({ players, onSelect, showChampion }) {
  const grid = cols(showChampion);
  return (
    <div style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: grid,
        gap: 8,
        padding: '10px 16px',
        background: 'var(--ink)',
        color: 'var(--bg)',
      }} className="lb-grid lb-header label">
        <div>#</div>
        <div>PLAYER</div>
        <div style={{ textAlign: 'right' }}>TOTAL</div>
        <div style={{ textAlign: 'center' }}>TREND</div>
        <div style={{ textAlign: 'center' }}>PERFECT</div>
        <div style={{ textAlign: 'center' }}>CORRECT</div>
        <div style={{ textAlign: 'center' }}>STREAK</div>
        {showChampion && <div style={{ textAlign: 'center' }}>CHAMPION</div>}
      </div>

      {/* Rows */}
      {players.map((p, i) => {
        const rankColor =
          i === 0 ? 'var(--yellow)' :
          i === 1 ? 'var(--blue)'   :
          i === 2 ? 'var(--red)'    : 'transparent';
        const rankFg =
          i === 0 ? 'var(--ink)' :
          i === 1 || i === 2 ? '#fff' : 'var(--muted)';
        return (
          <TableRow key={p.id} p={p} i={i} rankColor={rankColor} rankFg={rankFg}
                    onSelect={onSelect} showChampion={showChampion} grid={grid} />
        );
      })}

      {players.length === 0 && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No players yet
        </div>
      )}
    </div>
  );
}

function TableRow({ p, i, rankColor, rankFg, onSelect, showChampion, grid }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onSelect(p)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: grid,
        gap: 8,
        padding: '12px 16px',
        alignItems: 'center',
        borderBottom: '1px solid var(--line)',
        cursor: 'pointer',
        background: hovered ? 'var(--bg-2)' : 'transparent',
        transition: 'background .12s',
      }}
      className="lb-grid row-hover"
    >
      {/* Rank badge */}
      <div style={{
        width: 32, height: 32,
        background: rankColor,
        color: rankFg,
        borderRadius: 'var(--r-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.03em',
        border: rankColor === 'transparent' ? '1.5px solid var(--line)' : 'none',
        flexShrink: 0,
      }}>{i + 1}</div>

      {/* Player name + mobile compact stats (hidden on desktop) */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </div>
        {/* Shown only on mobile via CSS */}
        <div className="lb-mobile-stats" style={{ display: 'none', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>
            {p.exact ?? 0} ★
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)', fontWeight: 700 }}>
            {p.correct ?? 0} ✓
          </span>
          {(p.streak ?? 0) > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: (p.streak ?? 0) >= 3 ? 'var(--orange)' : 'var(--muted)', fontWeight: 700 }}>
              {p.streak}{(p.streak ?? 0) >= 3 ? ' 🔥' : ' str'}
            </span>
          )}
        </div>
      </div>

      {/* Total points */}
      <div style={{
        textAlign: 'right',
        fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.03em',
      }}>{p.total ?? 0}</div>

      {/* Trend */}
      <div className="lb-col-trend" style={{ display: 'flex', justifyContent: 'center' }}>
        <TrendBadge v={p.trend} />
      </div>

      {/* Perfect (exact scores = 7 pts) */}
      <div className="lb-col-perfect" style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
          color: (p.exact ?? 0) > 0 ? 'var(--green)' : 'var(--muted)',
        }}>{p.exact ?? 0}</span>
      </div>

      {/* Correct (right direction) */}
      <div className="lb-col-correct" style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
          color: (p.correct ?? 0) > 0 ? 'var(--blue)' : 'var(--muted)',
        }}>{p.correct ?? 0}</span>
      </div>

      {/* Streak */}
      <div className="lb-col-streak" style={{ display: 'flex', justifyContent: 'center' }}>
        <StreakBadge v={p.streak ?? 0} />
      </div>

      {/* Champion — only after knockout starts */}
      {showChampion && (
        <div className="lb-col-champion" style={{ textAlign: 'center', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', minWidth: 0 }}>
          {p.pickedChampion ? (
            <>
              <Flag team={p.pickedChampion} size={18} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pickedChampion}</span>
            </>
          ) : (
            <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Player Modal ──────────────────────────────────────────────────────────────
function PlayerModal({ player, onClose, showChampion }) {
  const [picks, setPicks]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getUserPicks(player.id)
      .then((d) => setPicks(d.picks || []))
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [player.id]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-lg)',
        maxWidth: 720, width: '100%',
        maxHeight: '88vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--ink)', color: 'var(--bg)',
          padding: '20px 26px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div className="label" style={{ color: '#8B8B90', marginBottom: 6 }}>
              PLAYER DETAIL · LOCKED & FINISHED MATCHES
            </div>
            <h3 style={{
              fontFamily: 'var(--display)', fontSize: 34,
              letterSpacing: '-0.03em', margin: '0 0 4px',
            }}>{player.name}</h3>
            {showChampion && player.pickedChampion && (
              <div style={{ fontSize: 13, color: '#8B8B90' }}>
                Champion pick: <b style={{ color: 'var(--bg)' }}>
                  <Flag team={player.pickedChampion} size={18} /> {player.pickedChampion}
                </b>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8B8B90', borderRadius: 999,
            border: '1px solid var(--line-2)',
          }}>{CLOSE}</button>
        </div>

        {/* Stats strip */}
        <div className="modal-stats" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--line)',
        }}>
          {[
            { l: 'TOTAL POINTS', v: player.total ?? 0,   c: 'var(--ink)'   },
            { l: 'PERFECT',      v: player.exact ?? 0,   c: 'var(--green)' },
            { l: 'CORRECT',      v: player.correct ?? 0, c: 'var(--blue)'  },
            { l: 'STREAK',       v: player.streak ?? 0,  c: (player.streak ?? 0) >= 3 ? 'var(--orange)' : 'var(--ink)' },
          ].map((s, i) => (
            <div key={s.l} style={{
              padding: '12px 16px',
              borderRight: i < 3 ? '1px solid var(--line)' : 'none',
            }}>
              <div className="label" style={{ color: 'var(--muted)', marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '-0.03em', color: s.c }}>
                {s.v}{s.l === 'STREAK' && (player.streak ?? 0) >= 3 ? ' 🔥' : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Picks list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em' }}>
              LOADING…
            </div>
          )}
          {error && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && picks !== null && (
            picks.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No finished matches yet.
              </div>
            ) : (
              picks.map((pk, i) => <PickRow key={pk.match_id} pick={pk} last={i === picks.length - 1} isMobile={isMobile} />)
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PickRow({ pick, last, isMobile }) {
  const hasPred = pick.pred_home !== null;
  const pts = hasPred ? (pick.points ?? 0) : null;

  const ptsColor =
    pts === 7    ? 'var(--green)'  :
    pts >= 5     ? 'var(--cyan)'   :
    pts >= 3     ? 'var(--blue)'   :
    pts >= 2     ? 'var(--orange)' :
    pts !== null ? 'var(--line)'   : 'var(--bg-2)';
  const ptsFg = ptsColor === 'var(--line)' || ptsColor === 'var(--bg-2)' ? 'var(--muted)' : '#fff';

  // Use abbreviations on mobile so rows fit without horizontal scroll
  const homeLabel = isMobile ? getAbbr(pick.home_team) : pick.home_team;
  const awayLabel = isMobile ? getAbbr(pick.away_team) : pick.away_team;

  const scoreText = (pick.finished || pick.home_score != null)
    ? `${pick.home_score ?? 0} – ${pick.away_score ?? 0}` : 'vs';

  const ptsBadge = (
    <div style={{
      background: pick.finished ? ptsColor : 'transparent',
      color: pick.finished ? ptsFg : 'var(--green)',
      borderRadius: 999, textAlign: 'center',
      padding: '4px 8px',
      fontFamily: 'var(--mono)', fontWeight: 700, fontSize: pick.finished ? 12 : 9,
      whiteSpace: 'nowrap',
    }}>
      {pick.finished ? (hasPred ? (pts > 0 ? `+${pts}` : '0') : '–') : 'LIVE'}
    </div>
  );

  if (isMobile) {
    // Compact 3-column layout: HOME | score+pick | AWAY, with pts badge on the score
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 8, alignItems: 'center',
        padding: '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--line)',
        opacity: hasPred ? 1 : 0.55,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-start', minWidth: 0 }}>
          <Flag team={pick.home_team} size={18} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>{homeLabel}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15 }}>{scoreText}</div>
          {hasPred ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
              pick {pick.pred_home}–{pick.pred_away}
            </div>
          ) : (
            <div style={{ fontSize: 9, color: 'var(--muted)', fontStyle: 'italic' }}>no pick</div>
          )}
          <div style={{ marginTop: 2 }}>{ptsBadge}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>{awayLabel}</span>
          <Flag team={pick.away_team} size={18} />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 90px 1fr 56px',
      gap: 12,
      alignItems: 'center',
      padding: '13px 20px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
      opacity: hasPred ? 1 : 0.55,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{pick.home_team}</span>
        <Flag team={pick.home_team} size={20} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>{scoreText}</div>
        {hasPred ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            {pick.pred_home} – {pick.pred_away}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>no pick</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Flag team={pick.away_team} size={20} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{pick.away_team}</span>
      </div>
      {ptsBadge}
    </div>
  );
}

// ── Bracket tab table ─────────────────────────────────────────────────────────
function BracketTable({ brackets, currentUserId, showChampion }) {
  const sorted = [...brackets].sort((a, b) =>
    (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name)
  );

  if (!sorted.length) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        No brackets submitted yet.
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: showChampion ? '1fr 160px 120px 80px' : '1fr 120px 80px',
        gap: 8, padding: '10px 16px',
        background: 'var(--ink)', color: 'var(--bg)',
      }} className="label">
        <div>PLAYER</div>
        {showChampion && <div style={{ textAlign: 'center' }}>CHAMPION</div>}
        <div style={{ textAlign: 'center' }}>STATUS</div>
        <div style={{ textAlign: 'right' }}>SCORE</div>
      </div>
      {/* Rows */}
      {sorted.map(b => {
        const isMe = b.userId === currentUserId;
        const isComplete = b.locked || b.phase === 'complete';
        const champion = b.knockoutPicks?.['final'];
        return (
          <div key={b.userId} className="row-hover" style={{
            display: 'grid', gridTemplateColumns: showChampion ? '1fr 160px 120px 80px' : '1fr 120px 80px',
            gap: 8, padding: '12px 16px', alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            background: 'transparent',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
              {b.name}
              {isMe && <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 9,
                color: 'var(--muted)', fontWeight: 500 }}>YOU</span>}
            </div>
            {showChampion && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {champion ? (
                <>
                  <Flag team={champion} size={20} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                    color: 'var(--ink)' }}>{getAbbr(champion)}</span>
                </>
              ) : (
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>–</span>
              )}
            </div>
            )}
            <div style={{ textAlign: 'center' }}>
              {isComplete ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                  color: 'var(--green)' }}>Complete ✓</span>
              ) : (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10,
                  color: 'var(--muted)' }}>In progress</span>
              )}
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--display)', fontSize: 20,
              letterSpacing: '-0.03em', color: b.score > 0 ? 'var(--ink)' : 'var(--muted)' }}>
              {b.score ?? 0}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Leaderboard ──────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [data, setData]               = useState({ standings: [], champion: null });
  const [loading, setLoading]         = useState(true);
  const [selectedPlayer, setSelected] = useState(null);
  const [bracketData, setBracketData]     = useState([]);
  const [activeTab, setActiveTab]         = useState('prode');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [actualStandings, setActualStandings]   = useState({});
  const [actualThirdRank, setActualThirdRank]   = useState([]);
  const [showScoring, setShowScoring]           = useState(false);

  useEffect(() => {
    getLeaderboard().then(setData).finally(() => setLoading(false));
    const i = setInterval(() => getLeaderboard().then(setData).catch(() => {}), 60_000);
    getBracketLeaderboard().then(setBracketData).catch(() => {});
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    }).catch(() => {});
    // Load live group standings + best-3rds ranking for bracket scoring
    function loadStandings() {
      Promise.all([getGroupStandings(), getThirdPlaceRanking()]).then(([groups, thirds]) => {
        const map = {};
        for (const { letter, standings } of groups) {
          map[letter] = standings.map(s => s.team);
        }
        setActualStandings(map);
        setActualThirdRank(thirds);
      }).catch(() => {});
    }
    loadStandings();
    const j = setInterval(loadStandings, 60_000);
    return () => { clearInterval(i); clearInterval(j); };
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  // Hooks must come before any early return (Rules of Hooks)
  // Only score once at least one group match has been played (standings are meaningful)
  const hasPlayedMatches = useMemo(() =>
    Object.values(actualStandings).some(teams =>
      teams.length > 0 && teams !== Object.values(actualStandings)[0]  // non-trivial check
    )
  , [actualStandings]);

  // More reliable check: any team with pts > 0 or played > 0
  const tournamentStarted = Date.now() >= new Date('2026-06-11T16:00:00.000Z').getTime();

  const actualForScoring = useMemo(() => ({
    groupStandings:  tournamentStarted ? actualStandings : {},
    thirdQualifiers: tournamentStarted ? actualThirdRank : [],
    knockoutResults: {},
  }), [actualStandings, actualThirdRank, tournamentStarted]);

  const scoredBracketData = useMemo(() =>
    bracketData.map(b => ({
      ...b,
      score: tournamentStarted ? calcBracketScore(
        { groupPicks: b.groupPicks || {}, thirdPicks: b.thirdPicks || [], knockoutPicks: b.knockoutPicks || {} },
        actualForScoring
      ).total : 0,
    }))
  , [bracketData, actualForScoring, tournamentStarted]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.1em' }}>
        LOADING…
      </div>
    );
  }

  const standings = data.standings || [];
  const knockoutStarted = Date.now() >= CHAMPION_LOCK_DATE.getTime();

  // Convert to Podium-compatible format (sorted by score)
  const bracketPlayers = [...scoredBracketData]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map(b => ({
      id: b.userId,
      name: b.name,
      total: b.score,
      exact: 0,
      correct: 0,
      streak: 0,
      pickedChampion: b.knockoutPicks?.['final'] || null,
    }));

  // Tab switcher — shared pill component
  function TabSwitcher() {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { key: 'prode',   label: 'Prode' },
          { key: 'bracket', label: 'Bracket Challenge' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            all: 'unset', cursor: 'pointer',
            padding: '8px 18px', borderRadius: 999,
            fontWeight: 700, fontSize: 13,
            background: activeTab === key ? 'var(--ink)' : 'transparent',
            color:      activeTab === key ? '#fff'        : 'var(--muted)',
            border: `1.5px solid ${activeTab === key ? 'var(--ink)' : 'var(--line)'}`,
            transition: 'all .12s',
          }}>{label}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, width: '100%', margin: '0 auto' }}>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 4,
      }}>
        <div>
          <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            {activeTab === 'prode'
              ? `POOL STANDINGS · ${standings.length} PLAYERS · SEASON 2026`
              : `BRACKET CHALLENGE · ${bracketData.length} BRACKET${bracketData.length !== 1 ? 'S' : ''} · SEASON 2026`}
            {activeTab === 'prode' && data.champion && (
              <span style={{ marginLeft: 10, color: 'var(--green)' }}>
                ● CHAMPION: {data.champion.toUpperCase()}
              </span>
            )}
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0 }}>
            {activeTab === 'prode' ? 'Leaderboard' : 'Bracket'}
          </h2>
        </div>
        {activeTab === 'prode' && !knockoutStarted && (
          <div className="label" style={{ color: 'var(--muted)', fontSize: 10, textAlign: 'right' }}>
            🔒 Champion picks hidden<br />until knockout stage
          </div>
        )}
      </div>

      {/* Podium — reacts to active tab */}
      {activeTab === 'prode' && standings.length >= 3 && (
        <Podium players={standings} onSelect={setSelected} showChampion={knockoutStarted} />
      )}
      {activeTab === 'bracket' && bracketPlayers.length >= 3 && (
        <Podium players={bracketPlayers} onSelect={() => {}} showChampion={tournamentStarted} />
      )}

      {/* Tab switcher — between podium and table */}
      <TabSwitcher />

      {/* Prode table */}
      {activeTab === 'prode' && (
        <FullTable players={standings} onSelect={setSelected} showChampion={knockoutStarted} />
      )}

      {/* Bracket table + scoring guide */}
      {activeTab === 'bracket' && (
        <>
          {/* Scoring system — collapsible */}
          <div style={{ background: 'var(--ink)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <button
              onClick={() => setShowScoring(v => !v)}
              style={{
                all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 28px',
              }}
            >
              <div className="label" style={{ color: '#8B8B90' }}>HOW SCORING WORKS</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#8B8B90' }}>
                {showScoring ? '▲ hide' : '▼ show'}
              </span>
            </button>
            {showScoring && <div style={{ padding: '0 28px 24px', color: 'var(--bg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {/* Groups */}
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.02em', color: 'var(--yellow)', marginBottom: 8 }}>
                  Phase of Groups
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    ['+1', 'per team in correct position'],
                    ['+2', 'bonus for full group correct'],
                  ].map(([pts, txt]) => (
                    <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                        background: 'var(--yellow)', color: 'var(--ink)',
                        borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{pts}</span>
                      <span style={{ fontSize: 13, color: '#C9C6BB' }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Best 3rds */}
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.02em', color: 'var(--cyan)', marginBottom: 8 }}>
                  Best 3rd-place teams
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    ['+1', 'per correct qualifier'],
                    ['+1', 'extra for correct rank position'],
                  ].map(([pts, txt]) => (
                    <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                        background: 'var(--cyan)', color: 'var(--ink)',
                        borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{pts}</span>
                      <span style={{ fontSize: 13, color: '#C9C6BB' }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Knockout */}
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.02em', color: 'var(--green)', marginBottom: 8 }}>
                  Knockout bracket
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    ['+1',  'R32 correct pick'],
                    ['+2',  'R16 correct pick'],
                    ['+4',  'Quarter-final'],
                    ['+8',  'Semi-final'],
                    ['+16', 'Final'],
                    ['+32', 'Champion 🏆'],
                  ].map(([pts, txt]) => (
                    <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                        background: 'var(--green)', color: '#fff',
                        borderRadius: 4, padding: '1px 6px', flexShrink: 0, minWidth: 28, textAlign: 'center' }}>{pts}</span>
                      <span style={{ fontSize: 13, color: '#C9C6BB' }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Tiebreakers */}
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.02em', color: 'var(--orange)', marginBottom: 8 }}>
                  Tiebreakers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    ['1°', 'Most total points'],
                    ['2°', 'Closest Final score'],
                    ['3°', 'Most knockout picks correct'],
                    ['4°', 'Submitted first'],
                  ].map(([n, txt]) => (
                    <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                        color: 'var(--orange)', flexShrink: 0, width: 24 }}>{n}</span>
                      <span style={{ fontSize: 13, color: '#C9C6BB' }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>}
          </div>

          <BracketTable brackets={scoredBracketData} currentUserId={currentUserId} showChampion={tournamentStarted} />
        </>
      )}

      {/* Modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={handleClose} showChampion={knockoutStarted} />
      )}
    </div>
  );
}
