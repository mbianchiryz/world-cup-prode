import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFlag } from '@/lib/matches-data';
import Flag from '@/components/Flag';
import { getMatches, getLeaderboard } from '@/lib/supabase-db';

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { done: true };
  return {
    days:  Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    mins:  Math.floor((ms % 3_600_000) / 60_000),
    secs:  Math.floor((ms % 60_000) / 1000),
  };
}

function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtWeekday(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

const ARROW = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
  </svg>
);
const BOLT = (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="13 2 4 14 11 14 9 22 20 10 13 10"/>
  </svg>
);

const FACTS_STATIC = [
  { label: 'Teams',    value: '48',  sub: 'First ever 48-team edition', color: 'var(--red)' },
  { label: 'Matches',  value: '104', sub: 'Expanded from 64',           color: 'var(--blue)' },
  { label: 'Nations',  value: '3',   sub: 'USA · Canada · Mexico',      color: 'var(--green)' },
];

const SCORING = [
  { pts: '+7', text: 'Exact score — both goals correct' },
  { pts: '+5', text: 'Correct result + one team\'s goals' },
  { pts: '+3', text: 'Correct win / draw / loss' },
  { pts: '+2', text: 'One team\'s goals (wrong result)' },
  { pts: '+30', text: 'Pick the tournament champion' },
];
const SCORING_COLORS = ['var(--green)', 'var(--cyan)', 'var(--blue)', 'var(--orange)', 'var(--yellow)'];

// All 16 official 2026 FIFA World Cup host cities (USA ×11, MEX ×3, CAN ×2)
const CITIES = [
  { name: 'New York',       country: 'USA', color: 'var(--red)'    },
  { name: 'Los Angeles',    country: 'USA', color: 'var(--blue)'   },
  { name: 'Dallas',         country: 'USA', color: 'var(--green)'  },
  { name: 'San Francisco',  country: 'USA', color: 'var(--orange)' },
  { name: 'Miami',          country: 'USA', color: 'var(--pink)'   },
  { name: 'Seattle',        country: 'USA', color: 'var(--cyan)'   },
  { name: 'Atlanta',        country: 'USA', color: 'var(--purple)' },
  { name: 'Boston',         country: 'USA', color: 'var(--red)'    },
  { name: 'Philadelphia',   country: 'USA', color: 'var(--blue)'   },
  { name: 'Kansas City',    country: 'USA', color: 'var(--green)'  },
  { name: 'Houston',        country: 'USA', color: 'var(--orange)' },
  { name: 'Toronto',        country: 'CAN', color: 'var(--cyan)'   },
  { name: 'Vancouver',      country: 'CAN', color: 'var(--pink)'   },
  { name: 'Mexico City',    country: 'MEX', color: 'var(--yellow)' },
  { name: 'Guadalajara',    country: 'MEX', color: 'var(--purple)' },
  { name: 'Monterrey',      country: 'MEX', color: 'var(--red)'    },
];

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ nextMatch, upNext = [], isNextLive, onNavigate }) {
  const cd = useCountdown(nextMatch?.match_time);

  return (
    <div className="hero-pad" style={{
      background: 'var(--ink)',
      color: 'var(--bg)',
      borderRadius: 'var(--r-xl)',
      padding: '40px 44px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 340,
    }}>
      {/* Decorative 26 — sized/positioned via CSS (.hero-26) */}
      <div className="hero-26">26</div>

      <div className="mob-1col" style={{
        position: 'relative',
        zIndex: 1,
        display: 'grid',
        gridTemplateColumns: nextMatch ? '1.1fr 1fr' : '1fr',
        gap: 32,
        alignItems: 'stretch',
        minHeight: 260,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="label" style={{ color: '#8B8B90', marginBottom: 14 }}>
              <span style={{ color: 'var(--yellow)' }}>●</span> SEASON 2026 · RYZ LABS POOL
            </div>
            <h1 style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(52px, 6vw, 84px)',
              lineHeight: 0.88,
              letterSpacing: '-0.045em',
              margin: '0 0 16px',
            }}>
              PREDICT<br />EVERY<br />MATCH.
            </h1>
            <p style={{ maxWidth: 360, fontSize: 15, lineHeight: 1.55, color: '#C9C6BB', margin: 0, textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
              104 matches. 48 nations. One champion. Lock in your picks for the entire bracket — exact scores win.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('/predictions')}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--yellow)', color: 'var(--ink)',
                borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14,
                padding: '13px 22px',
              }}
            >
              Continue picks {ARROW}
            </button>
            <button
              onClick={() => onNavigate('/bracket')}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: '1.5px solid #3A3A45', color: '#fff',
                borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14,
                padding: '13px 22px',
              }}
            >
              Bracket {ARROW}
            </button>
            <button
              onClick={() => onNavigate('/leaderboard')}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: '1.5px solid #3A3A45', color: '#fff',
                borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14,
                padding: '13px 22px',
              }}
            >
              Standings
            </button>
          </div>
        </div>

        {/* Right: next match card */}
        {nextMatch && (
          <div className="card-hover" style={{
            background: 'var(--bg)',
            color: 'var(--ink)',
            borderRadius: 'var(--r-lg)',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="label" style={{ color: 'var(--yellow)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {BOLT} NEXT KICKOFF
              </div>
              <div className="label" style={{ color: 'var(--muted)' }}>
                {nextMatch.group_name ? `GRP ${nextMatch.group_name} · ` : ''}MD {nextMatch.matchday ?? '–'}
              </div>
            </div>

            {/* Teams + score (integrated when live) */}
            {cd?.done ? (
              /* LIVE layout — flag · name · score · name · flag, all in one row */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, width: '100%' }}>
                  {/* Home */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <Flag team={nextMatch.home_team} size={32} />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '-0.02em' }}>
                      {nextMatch.home_team.toUpperCase()}
                    </span>
                  </div>
                  {/* Score */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 44, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {nextMatch.home_score ?? '–'}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--muted)', fontWeight: 700 }}>–</span>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 44, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {nextMatch.away_score ?? '–'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--green)', display: 'inline-block', animation: 'pulse-green 2s infinite' }} />
                      LIVE
                    </div>
                  </div>
                  {/* Away */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Flag team={nextMatch.away_team} size={32} />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '-0.02em', textAlign: 'right' }}>
                      {nextMatch.away_team.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* PRE-MATCH layout */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <Flag team={nextMatch.home_team} size={32} />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '-0.02em' }}>
                      {nextMatch.home_team.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--muted)', letterSpacing: '-0.04em' }}>VS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Flag team={nextMatch.away_team} size={32} />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '-0.02em', textAlign: 'right' }}>
                      {nextMatch.away_team.toUpperCase()}
                    </span>
                  </div>
                </div>
                {cd && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[{ v: cd.days, l: 'DAYS' }, { v: cd.hours, l: 'HRS' }, { v: cd.mins, l: 'MIN' }, { v: cd.secs, l: 'SEC' }].map((u, i) => (
                      <div key={i} style={{ background: i === 0 ? 'var(--yellow)' : 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: '9px 0 7px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 26, lineHeight: 0.95, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{String(u.v).padStart(2, '0')}</div>
                        <div className="label" style={{ fontSize: 8.5, marginTop: 3, opacity: 0.7 }}>{u.l}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <span>{fmtWeekday(nextMatch.match_time)} · {fmtDateShort(nextMatch.match_time)} · {fmtTime(nextMatch.match_time)}</span>
                </div>
              </>
            )}

            {/* Next upcoming matches (2 rows) */}
            {upNext.map((m, idx) => (
              <div key={m.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: idx === 0 ? 4 : 0 }}>
                <div className="label" style={{ color: 'var(--muted)', fontSize: 9, marginBottom: 6 }}>
                  {idx === 0 ? 'UP NEXT' : 'THEN'} · {m.group_name ? `GRP ${m.group_name} · ` : ''}MD {m.matchday ?? '–'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <Flag team={m.home_team} size={32} />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '-0.02em' }}>
                      {m.home_team.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--muted)', letterSpacing: '-0.04em' }}>VS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Flag team={m.away_team} size={32} />
                    <span style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '-0.02em', textAlign: 'right' }}>
                      {m.away_team.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                  {fmtWeekday(m.match_time)} · {fmtDateShort(m.match_time)} · {fmtTime(m.match_time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Facts row ─────────────────────────────────────────────────────────────────
function FactsRow({ participants }) {
  const facts = [
    ...FACTS_STATIC,
    { label: 'Players', value: String(participants), sub: 'RYZ Labs pool', color: 'var(--yellow)' },
  ];
  return (
    <div className="mob-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {facts.map((f) => {
        const isYellow = f.color === 'var(--yellow)';
        return (
          <div key={f.label} className="card-hover" style={{
            background: f.color,
            color: isYellow ? 'var(--ink)' : '#fff',
            borderRadius: 'var(--r)',
            padding: '18px 20px',
            minHeight: 120,
          }}>
            <div className="label" style={{ opacity: 0.8, marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 52, lineHeight: 0.9, letterSpacing: '-0.04em' }}>{f.value}</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85, fontWeight: 500 }}>{f.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent Results ────────────────────────────────────────────────────────────
function RecentResults({ matches }) {
  const recent = matches
    .filter((m) => m.finished)
    .sort((a, b) => new Date(b.match_time) - new Date(a.match_time))
    .slice(0, 5);

  return (
    <div style={{ background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        padding: '5px 12px',
        fontFamily: 'var(--mono)', fontSize: 10.5,
        letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
      }}>Recent Results</div>

      {recent.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          No matches played yet
        </div>
      ) : (
        <div>
          {recent.map((m, i) => {
            const homeWin = m.home_score > m.away_score;
            const awayWin = m.away_score > m.home_score;
            return (
              <div key={m.id} style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr auto 1fr 50px',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                borderBottom: i < recent.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div className="label" style={{ color: 'var(--muted)', fontSize: 9.5 }}>
                  {m.group_name ? `GR ${m.group_name}` : '–'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: homeWin ? 700 : 500 }}>
                  <Flag team={m.home_team} size={20} />
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home_team}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
                  background: 'var(--bg-2)', padding: '3px 10px', borderRadius: 'var(--r-sm)',
                  whiteSpace: 'nowrap',
                }}>
                  {m.home_score} – {m.away_score}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end', fontWeight: awayWin ? 700 : 500 }}>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.away_team}</span>
                  <Flag team={m.away_team} size={20} />
                </div>
                <div className="label" style={{ color: 'var(--muted)', textAlign: 'right', fontSize: 9.5 }}>
                  {fmtDateShort(m.match_time)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Top of Pool ───────────────────────────────────────────────────────────────
function TopOfPool({ standings, onNavigate }) {
  const top = standings.slice(0, 3);
  const podiumColors = ['var(--yellow)', 'var(--bg-2)', 'var(--orange)'];

  return (
    <div style={{ background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        padding: '5px 12px',
        fontFamily: 'var(--mono)', fontSize: 10.5,
        letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
      }}>Top of Pool</div>

      {top.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          No players yet
        </div>
      ) : (
        <>
          <div>
            {top.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 16px',
                borderBottom: i < top.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 'var(--r-sm)',
                  background: podiumColors[i],
                  color: i === 1 ? 'var(--ink)' : (podiumColors[i] === 'var(--yellow)' ? 'var(--ink)' : '#fff'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontSize: 17, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                </div>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 26,
                  letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {p.total}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, marginLeft: 3, fontWeight: 500, color: 'var(--muted)' }}>PTS</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('/leaderboard')}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px',
              background: 'var(--bg-2)',
              fontSize: 13, fontWeight: 600,
              width: '100%', boxSizing: 'border-box',
            }}
          >
            <span>View full standings</span>
            {ARROW}
          </button>
        </>
      )}
    </div>
  );
}

// ── Scoring Rules ─────────────────────────────────────────────────────────────
const BRACKET_SCORING = [
  { pts: '+1/+2', text: 'Group position correct (+2 bonus full group)', colors: ['var(--yellow)'] },
  { pts: '+1/+2', text: 'Best 3rd qualifier correct (+1 extra right rank)', colors: ['var(--cyan)'] },
  { pts: '+1',    text: 'Round of 32 correct pick',   colors: ['var(--blue)'] },
  { pts: '+2',    text: 'Round of 16 correct pick',   colors: ['var(--blue)'] },
  { pts: '+4',    text: 'Quarter-final correct pick', colors: ['var(--blue)'] },
  { pts: '+8',    text: 'Semi-final correct pick',    colors: ['var(--blue)'] },
  { pts: '+16',   text: 'Final correct pick',         colors: ['var(--green)'] },
  { pts: '+32',   text: 'Champion correct 🏆',        colors: ['var(--yellow)'] },
];
const BRACKET_SCORING_COLORS = [
  'var(--yellow)', 'var(--cyan)', 'var(--blue)', 'var(--blue)',
  'var(--blue)', 'var(--blue)', 'var(--green)', 'var(--yellow)',
];

function ScoringRules() {
  const [tab, setTab] = useState('prode');
  return (
    <div style={{ background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Header with tabs */}
      <div style={{ background: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 0 }}>
        {[{ key: 'prode', label: 'Prode' }, { key: 'bracket', label: 'Bracket Challenge' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            all: 'unset', cursor: 'pointer',
            padding: '8px 14px',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 600,
            color: tab === t.key ? 'var(--ink)' : '#8B8B90',
            background: tab === t.key ? 'var(--yellow)' : 'transparent',
            transition: 'all .12s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Prode scoring */}
      {tab === 'prode' && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SCORING.map((s, i) => (
            <div key={s.pts} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                background: SCORING_COLORS[i],
                color: SCORING_COLORS[i] === 'var(--yellow)' ? 'var(--ink)' : '#fff',
                borderRadius: 'var(--r-sm)', padding: '3px 10px',
                fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.03em',
                minWidth: 64, textAlign: 'center', flexShrink: 0,
              }}>{s.pts}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bracket scoring */}
      {tab === 'bracket' && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BRACKET_SCORING.map((s, i) => (
            <div key={i} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                background: BRACKET_SCORING_COLORS[i],
                color: BRACKET_SCORING_COLORS[i] === 'var(--yellow)' || BRACKET_SCORING_COLORS[i] === 'var(--cyan)' ? 'var(--ink)' : '#fff',
                borderRadius: 'var(--r-sm)', padding: '3px 8px',
                fontFamily: 'var(--display)', fontSize: 17, letterSpacing: '-0.03em',
                minWidth: 64, textAlign: 'center', flexShrink: 0,
              }}>{s.pts}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Host Cities ───────────────────────────────────────────────────────────────
function HostCities() {
  return (
    <div style={{ background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        padding: '5px 12px',
        fontFamily: 'var(--mono)', fontSize: 10.5,
        letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
      }}>Host Cities · 16 Stadiums</div>
      <div className="mob-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {CITIES.map((c, i) => {
          const cols = 4;
          const isYellow = c.color === 'var(--yellow)';
          return (
            <div key={c.name} className="card-hover" style={{
              background: c.color,
              color: isYellow ? 'var(--ink)' : '#fff',
              padding: '13px 12px',
              minHeight: 66,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRight: (i % cols !== cols - 1) ? '1px solid rgba(255,255,255,0.18)' : 'none',
              borderBottom: i < CITIES.length - cols ? '1px solid rgba(255,255,255,0.18)' : 'none',
            }}>
              <div className="label" style={{ opacity: 0.8, fontSize: 9 }}>{c.country}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {c.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [matches, setMatches]         = useState([]);
  const [leaderboard, setLeaderboard] = useState({ standings: [] });
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    function load() {
      Promise.all([getMatches(), getLeaderboard()])
        .then(([ms, lb]) => { setMatches(ms); setLeaderboard(lb); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    load();
    // Poll every 30s for live score updates (sync-results runs every 1 min)
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const upcomingMatches = useMemo(
    () => matches
      .filter((m) => !m.finished && m.home_team !== 'TBD' && m.away_team !== 'TBD')
      .sort((a, b) => new Date(a.match_time) - new Date(b.match_time)),
    [matches]
  );
  const nextMatch      = upcomingMatches[0];
  const isNextLive     = nextMatch && Date.now() >= new Date(nextMatch.match_time).getTime();
  // When live: show next 2 upcoming; when not live: show next 2 upcoming (so total shown = 3)
  const upNext         = isNextLive ? upcomingMatches.slice(1, 3) : upcomingMatches.slice(1, 3);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.1em' }}>
        LOADING…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
      <Hero nextMatch={nextMatch} upNext={upNext} isNextLive={isNextLive} onNavigate={navigate} />
      <FactsRow participants={leaderboard.standings?.length ?? 0} />
      <div className="mob-1col" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <RecentResults matches={matches} />
        <TopOfPool standings={leaderboard.standings || []} onNavigate={navigate} />
      </div>
      <div className="mob-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ScoringRules />
        <HostCities />
      </div>
    </div>
  );
}
