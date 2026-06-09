import { useEffect, useState } from 'react';
import { getGroupStandings } from '@/lib/supabase-db';
import { getFlag } from '@/lib/matches-data';
import Flag from '@/components/Flag';

const ARROW = (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
  </svg>
);

const GROUP_COLORS = {
  A: 'var(--red)',    B: 'var(--blue)',   C: 'var(--green)',  D: 'var(--pink)',
  E: 'var(--yellow)', F: 'var(--cyan)',   G: 'var(--purple)', H: 'var(--orange)',
  I: 'var(--red)',    J: 'var(--blue)',   K: 'var(--green)',  L: 'var(--pink)',
};

function Stat({ v }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500,
      color: 'var(--muted)', textAlign: 'center',
    }}>{v}</div>
  );
}

function GroupCard({ group }) {
  const color = GROUP_COLORS[group.letter] || 'var(--ink)';
  const isYellow = color === 'var(--yellow)';

  return (
    <div className="card-hover" style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: color,
        color: isYellow ? 'var(--ink)' : '#fff',
        padding: '10px 14px',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 0.85, letterSpacing: '-0.05em' }}>
            {group.letter}
          </span>
          <span className="label" style={{ opacity: 0.85 }}>GROUP</span>
        </div>
        <div className="label" style={{ opacity: 0.85 }}>{group.standings.length} TEAMS</div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '4px 18px 1fr repeat(5, 26px) 34px',
        gap: 5,
        padding: '6px 10px',
        background: 'var(--bg-2)',
      }}>
        <div /><div />
        <div className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>TEAM</div>
        {['P','W','D','L','GD'].map((h) => (
          <div key={h} className="label" style={{ color: 'var(--muted)', fontSize: 9, textAlign: 'center' }}>{h}</div>
        ))}
        <div className="label" style={{ color: 'var(--muted)', fontSize: 9, textAlign: 'center' }}>PTS</div>
      </div>

      {/* Rows */}
      <div>
        {group.standings.map((row, i) => {
          const advances = i < 2;
          const playoff  = i === 2;
          const indicator = advances ? 'var(--green)' : playoff ? 'var(--yellow)' : 'transparent';

          return (
            <div key={row.team} style={{
              display: 'grid',
              gridTemplateColumns: '4px 18px 1fr repeat(5, 26px) 34px',
              alignItems: 'center',
              gap: 5,
              padding: '9px 10px',
              borderBottom: i < group.standings.length - 1 ? '1px solid var(--line)' : 'none',
              background: advances ? 'rgba(0,184,82,0.05)' : 'transparent',
            }}>
              {/* Qualification indicator */}
              <div style={{ width: 3, height: 22, background: indicator, borderRadius: 2 }} />
              {/* Position */}
              <div className="label" style={{ color: 'var(--muted)', fontSize: 9.5 }}>{i + 1}</div>
              {/* Team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Flag team={row.team} size={16} />
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.team}
                </span>
              </div>
              <Stat v={row.p} />
              <Stat v={row.w} />
              <Stat v={row.d} />
              <Stat v={row.l} />
              <Stat v={row.gd > 0 ? `+${row.gd}` : row.gd} />
              {/* Points */}
              <div style={{
                fontFamily: 'var(--display)', fontSize: 18,
                letterSpacing: '-0.02em', textAlign: 'center',
              }}>{row.pts}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '7px 10px',
        background: 'var(--bg-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: 2, display: 'inline-block' }} />
            <span style={{ color: 'var(--muted)' }}>Advances</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, background: 'var(--yellow)', borderRadius: 2, display: 'inline-block' }} />
            <span style={{ color: 'var(--muted)' }}>Best 3rd</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Groups() {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroupStandings().then(setGroups).finally(() => setLoading(false));
    const i = setInterval(() => getGroupStandings().then(setGroups).catch(() => {}), 60_000);
    return () => clearInterval(i);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.1em' }}>
        LOADING…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        borderBottom: '1px solid var(--line)', paddingBottom: 14,
      }}>
        <div>
          <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            GROUP STAGE · {groups.filter(g => g.letter.length === 1).length} GROUPS · 4 TEAMS EACH
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0 }}>
            Group Standings
          </h2>
        </div>
        <div className="label" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: 999, display: 'inline-block', animation: 'pulse-green 2s infinite' }} />
          AUTO-SYNC · LIVE
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--bg-2)', padding: '10px 14px',
        borderRadius: 'var(--r-sm)', fontSize: 12,
      }}>
        <span className="label" style={{ color: 'var(--muted)' }}>QUALIFIES:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, background: 'var(--green)', borderRadius: 3, display: 'inline-block' }} />
          Top 2 advance
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, background: 'var(--yellow)', borderRadius: 3, display: 'inline-block' }} />
          Best 3rd (8 of 12)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
          <span style={{ width: 11, height: 11, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, display: 'inline-block' }} />
          Eliminated
        </span>
      </div>

      {/* Groups grid — real groups A–L only */}
      {groups.filter(g => g.letter.length === 1).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)', fontSize: 13 }}>
          No group data yet
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {groups.filter(g => g.letter.length === 1).map((g) => <GroupCard key={g.letter} group={g} />)}
        </div>
      )}

      {/* Best 3rd-place ranking — shown at the bottom */}
      {groups.find(g => g.letter === 'BEST_3RDS') && (() => {
        const best = groups.find(g => g.letter === 'BEST_3RDS');
        return (
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <div className="label" style={{ color: 'var(--muted)', marginBottom: 14 }}>
              BEST 3RD-PLACE TEAMS · TOP 8 ADVANCE TO ROUND OF 32
            </div>
            <div style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                background: 'var(--ink)', color: 'var(--bg)',
                padding: '10px 14px',
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 20, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    Ranking
                  </span>
                  <span className="label" style={{ opacity: 0.6 }}>BEST 3RD-PLACE</span>
                </div>
                <div className="label" style={{ opacity: 0.6 }}>{best.standings.length} TEAMS</div>
              </div>
              {/* Column headers */}
              <div style={{
                display: 'grid', gridTemplateColumns: '4px 18px 1fr repeat(5, 26px) 34px',
                gap: 5, padding: '6px 10px',
                background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
              }}>
                <div /><div />
                <div className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>TEAM</div>
                {['P','W','D','L','GD'].map(h => (
                  <div key={h} className="label" style={{ color: 'var(--muted)', fontSize: 9, textAlign: 'center' }}>{h}</div>
                ))}
                <div className="label" style={{ color: 'var(--muted)', fontSize: 9, textAlign: 'center' }}>PTS</div>
              </div>
              {/* Rows */}
              {best.standings.map((s, i) => {
                const advances  = i < 8;
                const indicator = advances ? 'var(--green)' : 'transparent';
                return (
                  <div key={s.team} style={{
                    display: 'grid',
                    gridTemplateColumns: '4px 18px 1fr repeat(5, 26px) 34px',
                    alignItems: 'center', gap: 5,
                    padding: '9px 10px',
                    borderBottom: i === 7
                      ? '2px solid var(--yellow)'
                      : i < best.standings.length - 1 ? '1px solid var(--line)' : 'none',
                    background: advances ? 'rgba(0,184,82,0.05)' : 'transparent',
                  }}>
                    {/* Indicator bar */}
                    <div style={{ width: 3, height: 22, background: indicator, borderRadius: 2 }} />
                    {/* Rank */}
                    <div className="label" style={{ color: 'var(--muted)', fontSize: 9.5 }}>{s.rank}</div>
                    {/* Team */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <Flag team={s.team} size={16} />
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.team}
                      </span>
                    </div>
                    <Stat v={s.p} />
                    <Stat v={s.w} />
                    <Stat v={s.d} />
                    <Stat v={s.l} />
                    <Stat v={s.gd > 0 ? `+${s.gd}` : s.gd} />
                    <div style={{ fontFamily: 'var(--display)', fontSize: 18, letterSpacing: '-0.02em', textAlign: 'center' }}>
                      {s.pts}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
