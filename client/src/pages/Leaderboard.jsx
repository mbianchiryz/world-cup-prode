import { useEffect, useState, useCallback } from 'react';
import { getFlag } from '@/lib/matches-data';
import { getLeaderboard, getUserPicks } from '@/lib/supabase-db';

const CLOSE = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>
  </svg>
);

// ── FormSpark — mini bar chart of recent scores ───────────────────────────────
function FormSpark({ seed }) {
  const vals = [];
  let s = (seed || 1) * 13 + 7;
  for (let i = 0; i < 5; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    vals.push(s % 8);
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 22 }}>
      {vals.map((v, i) => {
        const h = 4 + v * 2.5;
        const color =
          v === 7 ? 'var(--green)' :
          v >= 5  ? 'var(--cyan)'  :
          v >= 3  ? 'var(--ink)'   :
          v >= 1  ? 'var(--orange)': 'var(--line)';
        return <div key={i} style={{ width: 4, height: h, background: color, borderRadius: 1 }} />;
      })}
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ players, onSelect }) {
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'flex-end' }}>
        {order.map((o) => {
          if (!o.p) return <div key={o.rank} />;
          return (
            <div key={o.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                onClick={() => onSelect(o.p)}
                style={{
                  background: 'var(--bg)', color: 'var(--ink)',
                  padding: '12px 14px', borderRadius: 'var(--r)',
                  width: '100%', textAlign: 'center',
                  marginBottom: 8, cursor: 'pointer',
                }}
              >
                {o.p.pickedChampion && (
                  <div className="label" style={{ color: 'var(--muted)' }}>
                    {getFlag(o.p.pickedChampion)} {o.p.pickedChampion.toUpperCase()} TO WIN
                  </div>
                )}
                <div style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1.1 }}>
                  {o.p.name}
                </div>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 28,
                  letterSpacing: '-0.04em', color: o.color, marginTop: 2, lineHeight: 1,
                }}>
                  {o.p.total}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, marginLeft: 3, fontWeight: 500, color: 'var(--muted)' }}>PTS</span>
                </div>
              </div>
              <div style={{
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
function FullTable({ players, onSelect }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '50px 1fr 110px 70px 60px 64px',
        gap: 10,
        padding: '11px 16px',
        background: 'var(--ink)',
        color: 'var(--bg)',
      }} className="label">
        <div>#</div>
        <div>PLAYER</div>
        <div style={{ textAlign: 'center' }}>CHAMPION</div>
        <div style={{ textAlign: 'center' }}>EXACT</div>
        <div style={{ textAlign: 'center' }}>FORM</div>
        <div style={{ textAlign: 'right' }}>PTS</div>
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
          <TableRow key={p.id} p={p} i={i} rankColor={rankColor} rankFg={rankFg} onSelect={onSelect} />
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

function TableRow({ p, i, rankColor, rankFg, onSelect }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onSelect(p)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '50px 1fr 110px 70px 60px 64px',
        gap: 10,
        padding: '13px 16px',
        alignItems: 'center',
        borderBottom: '1px solid var(--line)',
        cursor: 'pointer',
        background: hovered ? 'var(--bg-2)' : 'transparent',
        transition: 'background .12s',
      }}
    >
      {/* Rank */}
      <div style={{
        width: 32, height: 32,
        background: rankColor,
        color: rankFg,
        borderRadius: 'var(--r-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--display)', fontSize: 16, letterSpacing: '-0.03em',
        border: rankColor === 'transparent' ? '1.5px solid var(--line)' : 'none',
      }}>{i + 1}</div>

      {/* Name */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
        <div className="label" style={{ color: 'var(--muted)', marginTop: 1 }}>
          {p.exact} exact · {p.total} total pts
        </div>
      </div>

      {/* Champion */}
      <div style={{ textAlign: 'center', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
        {p.pickedChampion ? (
          <>
            <span style={{ fontSize: 14 }}>{getFlag(p.pickedChampion)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pickedChampion}</span>
          </>
        ) : (
          <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>
        )}
      </div>

      {/* Exact */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
          background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 4,
        }}>{p.exact ?? 0}</span>
      </div>

      {/* Form spark */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FormSpark seed={p.id?.charCodeAt?.(0) || i + 1} />
      </div>

      {/* Points */}
      <div style={{
        textAlign: 'right',
        fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.03em',
      }}>{p.total ?? 0}</div>
    </div>
  );
}

// ── Player Modal ──────────────────────────────────────────────────────────────
function PlayerModal({ player, onClose }) {
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

  const totalEarned = picks?.reduce((s, p) => s + (p.points ?? 0), 0) ?? 0;
  const withPred    = picks?.filter((p) => p.pred_home !== null) ?? [];

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
            {player.pickedChampion && (
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
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--line)',
        }}>
          {[
            { l: 'TOTAL POINTS', v: player.total, c: 'var(--ink)' },
            { l: 'EXACT SCORES', v: player.exact ?? 0, c: 'var(--green)' },
            { l: 'PTS SHOWN',    v: totalEarned,  c: 'var(--blue)' },
            { l: 'PICKS SHOWN',  v: withPred.length, c: 'var(--red)' },
          ].map((s, i) => (
            <div key={s.l} style={{
              padding: '12px 16px',
              borderRight: i < 3 ? '1px solid var(--line)' : 'none',
            }}>
              <div className="label" style={{ color: 'var(--muted)', marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '-0.03em', color: s.c }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Picks */}
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
    pts === 7   ? 'var(--green)'  :
    pts >= 5    ? 'var(--cyan)'   :
    pts >= 3    ? 'var(--blue)'   :
    pts >= 2    ? 'var(--orange)' :
    pts !== null ? 'var(--line)'  : 'var(--bg-2)';
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
        background: ptsColor,
        color: ptsFg,
        borderRadius: 999,
        textAlign: 'center',
        padding: '4px 8px',
        fontFamily: 'var(--mono)',
        fontWeight: 700,
        fontSize: 12,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 4,
      }}>
        <div>
          <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            POOL STANDINGS · {standings.length} PLAYERS · SEASON 2026
            {data.champion && <span style={{ marginLeft: 10, color: 'var(--green)' }}>● CHAMPION: {data.champion.toUpperCase()}</span>}
          </div>
          <h2 style={{
            fontFamily: 'var(--display)', fontSize: 36,
            lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0,
          }}>Leaderboard</h2>
        </div>
      </div>

      {/* Podium (only when 3+ players) */}
      {standings.length >= 3 && (
        <Podium players={standings} onSelect={setSelected} />
      )}

      {/* Full table */}
      <FullTable players={standings} onSelect={setSelected} />

      {/* Modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={handleClose} />
      )}
    </div>
  );
}
