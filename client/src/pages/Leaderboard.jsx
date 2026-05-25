import { useEffect, useState, useCallback } from 'react';
import { getFlag } from '@/lib/matches-data';
import { getLeaderboard, getUserPicks } from '@/lib/supabase-db';

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

      <div className="podium-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'flex-end' }}>
        {order.map((o) => {
          if (!o.p) return <div key={o.rank} />;
          return (
            <div key={o.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                    {getFlag(o.p.pickedChampion)} {o.p.pickedChampion.toUpperCase()} TO WIN
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
      className="lb-grid"
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
              <span style={{ fontSize: 14, flexShrink: 0 }}>{getFlag(p.pickedChampion)}</span>
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

  return (
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
              PLAYER DETAIL · FINISHED MATCHES
            </div>
            <h3 style={{
              fontFamily: 'var(--display)', fontSize: 34,
              letterSpacing: '-0.03em', margin: '0 0 4px',
            }}>{player.name}</h3>
            {showChampion && player.pickedChampion && (
              <div style={{ fontSize: 13, color: '#8B8B90' }}>
                Champion pick: <b style={{ color: 'var(--bg)' }}>
                  {getFlag(player.pickedChampion)} {player.pickedChampion}
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
              picks.map((pk, i) => <PickRow key={pk.match_id} pick={pk} last={i === picks.length - 1} />)
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PickRow({ pick, last }) {
  const hasPred = pick.pred_home !== null;
  const pts = hasPred ? (pick.points ?? 0) : null;

  const ptsColor =
    pts === 7    ? 'var(--green)'  :
    pts >= 5     ? 'var(--cyan)'   :
    pts >= 3     ? 'var(--blue)'   :
    pts >= 2     ? 'var(--orange)' :
    pts !== null ? 'var(--line)'   : 'var(--bg-2)';
  const ptsFg = ptsColor === 'var(--line)' || ptsColor === 'var(--bg-2)' ? 'var(--muted)' : '#fff';

  const stageLabel =
    pick.stage === 'group' ? (pick.group_name ? `GR ${pick.group_name}` : 'GROUP') :
    ({ r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'FINAL', third: '3RD' }[pick.stage] ?? pick.stage.toUpperCase());

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 90px 1fr 56px',
      gap: 12,
      alignItems: 'center',
      padding: '13px 20px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
      opacity: hasPred ? 1 : 0.55,
    }}>
      <div className="label" style={{ color: 'var(--muted)', fontSize: 9.5 }}>{stageLabel}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{pick.home_team}</span>
        <span style={{ fontSize: 18 }}>{getFlag(pick.home_team)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>
          {pick.home_score} – {pick.away_score}
        </div>
        {hasPred ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            {pick.pred_home} – {pick.pred_away}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>no pick</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 18 }}>{getFlag(pick.away_team)}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{pick.away_team}</span>
      </div>
      <div style={{
        background: ptsColor, color: ptsFg,
        borderRadius: 999, textAlign: 'center',
        padding: '4px 8px',
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
      }}>
        {hasPred ? (pts > 0 ? `+${pts}` : '0') : '–'}
      </div>
    </div>
  );
}

// ── Main Leaderboard ──────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [data, setData]               = useState({ standings: [], champion: null });
  const [loading, setLoading]         = useState(true);
  const [selectedPlayer, setSelected] = useState(null);

  useEffect(() => {
    getLeaderboard().then(setData).finally(() => setLoading(false));
    const i = setInterval(() => getLeaderboard().then(setData).catch(() => {}), 60_000);
    return () => clearInterval(i);
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.1em' }}>
        LOADING…
      </div>
    );
  }

  const standings = data.standings || [];
  const knockoutStarted = Date.now() >= CHAMPION_LOCK_DATE.getTime();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 4,
      }}>
        <div>
          <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            POOL STANDINGS · {standings.length} PLAYERS · SEASON 2026
            {data.champion && (
              <span style={{ marginLeft: 10, color: 'var(--green)' }}>
                ● CHAMPION: {data.champion.toUpperCase()}
              </span>
            )}
          </div>
          <h2 style={{
            fontFamily: 'var(--display)', fontSize: 36,
            lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0,
          }}>Leaderboard</h2>
        </div>
        {!knockoutStarted && (
          <div className="label" style={{ color: 'var(--muted)', fontSize: 10, textAlign: 'right' }}>
            🔒 Champion picks hidden<br />until knockout stage
          </div>
        )}
      </div>

      {/* Podium (only when 3+ players) */}
      {standings.length >= 3 && (
        <Podium players={standings} onSelect={setSelected} showChampion={knockoutStarted} />
      )}

      {/* Full table */}
      <FullTable players={standings} onSelect={setSelected} showChampion={knockoutStarted} />

      {/* Modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={handleClose} showChampion={knockoutStarted} />
      )}
    </div>
  );
}
