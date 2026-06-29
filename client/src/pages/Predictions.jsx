import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';

// ── Error Boundary — silently auto-recovers on render errors ─────────────────
// Prevents the whole-app crash when a section throws during render.
// Shows a spinner and re-renders automatically after 400ms.
class SectionErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidUpdate() {
    if (this.state.hasError) {
      // Auto-reset so the section re-renders with fresh data
      setTimeout(() => this.setState({ hasError: false }), 400);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.12em', color: 'var(--muted)' }}>
          LOADING…
        </div>
      );
    }
    return this.props.children;
  }
}
import { getFlag, getAbbr, getTeamGroup } from '@/lib/matches-data';
import Flag from '@/components/Flag';
import { getMatches, getMyPredictions, savePrediction, getChampionData, saveChampionPick, getChampionPickStats, getGroupStandings } from '@/lib/supabase-db';
import { R32 } from '@/lib/bracket-data';
import { calcMatchPoints } from '@/lib/scoring';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Group color palette (matches Groups.jsx) ──────────────────────────────────
const GROUP_COLORS = {
  A: 'var(--red)',    B: 'var(--blue)',   C: 'var(--green)',  D: 'var(--pink)',
  E: 'var(--yellow)', F: 'var(--cyan)',   G: 'var(--purple)', H: 'var(--orange)',
  I: 'var(--red)',    J: 'var(--blue)',   K: 'var(--green)',  L: 'var(--pink)',
};

function groupColor(letter) {
  return GROUP_COLORS[letter] || 'var(--ink)';
}
function isYellowGroup(letter) {
  return groupColor(letter) === 'var(--yellow)';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LOCK_OFFSET_MS = 60 * 60 * 1000; // 1 hour before kickoff

function isLocked(matchTime) {
  return Date.now() >= new Date(matchTime).getTime() - LOCK_OFFSET_MS;
}

/** Returns ms remaining until the pick deadline (matchTime − 1h). Negative = already locked. */
function msUntilLock(matchTime) {
  return new Date(matchTime).getTime() - LOCK_OFFSET_MS - Date.now();
}

/**
 * Live countdown to pick deadline.
 * Updates every second while open, every minute when > 10 min away.
 * Returns { label, urgency: 'open'|'soon'|'imminent'|'locked'|'finished' }
 */
function usePickCountdown(matchTime, finished) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (finished) return;
    const ms = msUntilLock(matchTime);
    // tick every second if < 10 min left, otherwise every 30s
    const interval = ms > 0 && ms < 10 * 60_000 ? 1000 : 30_000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [matchTime, finished]);

  if (finished) return { label: null, urgency: 'finished' };

  const ms = new Date(matchTime).getTime() - LOCK_OFFSET_MS - now;
  if (ms <= 0) return { label: null, urgency: 'locked' };

  const totalSecs = Math.floor(ms / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;

  let label;
  if (days > 0)        label = `${days}d ${hours}h`;
  else if (hours > 0)  label = `${hours}h ${mins}m`;
  else if (mins >= 1)  label = `${mins}m ${secs}s`;
  else                 label = `${secs}s`;

  const urgency =
    ms > 6 * 3_600_000  ? 'open'     :  // > 6h  → neutral
    ms > 2 * 3_600_000  ? 'soon'     :  // > 2h  → amber
                          'imminent';    // < 2h  → red

  return { label, urgency };
}

const LOCK_SVG = (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="11" width="16" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>
);
const CHECK_SVG = (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="4 12 10 18 20 6"/>
  </svg>
);
const ARROW_SVG = (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
  </svg>
);

function CountdownBadge({ matchTime, finished }) {
  const { label, urgency } = usePickCountdown(matchTime, finished);

  if (urgency === 'finished') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--green)', fontWeight: 600 }}>
        {CHECK_SVG} FINAL
      </span>
    );
  }
  if (urgency === 'locked') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--muted)' }}>
        {LOCK_SVG} LOCKED
      </span>
    );
  }

  const color =
    urgency === 'imminent' ? 'var(--red)'    :
    urgency === 'soon'     ? 'var(--orange)' : 'var(--muted)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.1em', color, fontWeight: urgency !== 'open' ? 600 : 500 }}>
      {LOCK_SVG} {label} LEFT
    </span>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────
function MatchCard({ match, pred, onSave, syncAll = 0 }) {
  const locked  = isLocked(match.match_time);
  const canEdit = !match.finished && !locked && !isPlaceholder(match.home_team) && !isPlaceholder(match.away_team);

  const [h, setH] = useState(pred?.home_score ?? '');
  const [a, setA] = useState(pred?.away_score ?? '');
  // saved = true when current h/a matches what's in DB; false = unsaved changes
  const [saved, setSaved] = useState(() => pred?.home_score !== undefined && pred?.home_score !== null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setH(pred?.home_score ?? '');
    setA(pred?.away_score ?? '');
    setSaved(pred?.home_score !== undefined && pred?.home_score !== null);
  }, [pred?.home_score, pred?.away_score]);

  function handleChange(setter, val) {
    setter(val);
    setSaved(false);
  }

  // Trigger save when parent requests "Save All"
  useEffect(() => {
    if (syncAll > 0 && canEdit && !saved && h !== '' && a !== '') {
      handleSave();
    }
  }, [syncAll]); // eslint-disable-line

  async function handleSave() {
    if (h === '' || a === '') return;
    setSaving(true);
    try {
      await onSave(match.id, Number(h), Number(a));
      setSaved(true);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const gColor = match.group_name ? groupColor(match.group_name) : 'var(--ink)';
  const gIsYellow = match.group_name ? isYellowGroup(match.group_name) : false;

  // Score box: editable input or static display
  function ScoreBox({ value, onChange, isResult }) {
    if (isResult) {
      return (
        <div style={{
          width: 48, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22,
          background: 'var(--ink)', color: 'var(--bg)',
          borderRadius: 'var(--r-sm)',
        }}>{value ?? '–'}</div>
      );
    }
    if (canEdit) {
      return (
        <input
          type="number" min="0" max="20"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Math.min(20, Number(e.target.value))))}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          style={{
            width: 48, height: 48,
            textAlign: 'center',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22,
            background: 'var(--bg)',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--r-sm)',
            outline: 'none',
            color: 'var(--ink)',
          }}
        />
      );
    }
    // Locked: disabled input — visually greyed out, clearly non-editable
    return (
      <input
        type="number"
        disabled
        value={value !== '' && value !== undefined ? value : ''}
        placeholder="–"
        style={{
          width: 48, height: 48,
          textAlign: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22,
          background: 'var(--bg-2)',
          border: '1.5px solid var(--line)',
          borderRadius: 'var(--r-sm)',
          color: 'var(--muted)',
          cursor: 'not-allowed',
          opacity: 0.7,
        }}
      />
    );
  }

  // Visual state: finished = normal, locked-not-finished = greyed, open = normal
  const isLockedNotFinished = locked && !match.finished;

  return (
    <div style={{
      background: isLockedNotFinished ? 'var(--bg-2)' : 'var(--bg)',
      border: `1.5px solid var(--line)`,
      borderRadius: 'var(--r)',
      overflow: 'hidden',
      opacity: isLockedNotFinished ? 0.6 : 1,
      transition: 'opacity 0.3s ease',
    }}>
      {/* Card header: group badge + meta + time */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {match.group_name && (
            <div style={{
              width: 26, height: 26,
              background: gColor,
              color: gIsYellow ? 'var(--ink)' : '#fff',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--display)', fontSize: 14,
              flexShrink: 0,
            }}>{match.group_name}</div>
          )}
          <span className="label" style={{ color: 'var(--muted)', fontSize: 10 }}>
            {match.group_name ? `GROUP ${match.group_name} · ` : ''}MD{match.matchday ?? '–'}
          </span>
        </div>
        <span className="label" style={{ color: 'var(--muted)', fontSize: 10 }}>
          {new Date(match.match_time).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
          {' '}{new Date(match.match_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
          {' · '}
          {new Date(match.match_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>

      {/* Match row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
        padding: '18px 20px',
      }}>
        {/* Home */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <Flag team={match.home_team} size={28} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink)' }}>
            {isPlaceholder(match.home_team) ? match.home_team : getAbbr(match.home_team)}
          </span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Live score — shown when match is in progress */}
          {isLockedNotFinished && match.home_score !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {match.home_score}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>–</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {match.away_score}
              </span>
            </div>
          )}
          {isLockedNotFinished && match.home_score !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--green)', display: 'inline-block', animation: 'pulse-green 2s infinite' }} />
              LIVE
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScoreBox value={match.finished ? match.home_score : h} onChange={v => handleChange(setH, v)} isResult={match.finished} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: isLockedNotFinished ? 14 : 18, color: 'var(--muted)', fontWeight: 700 }}>–</span>
            <ScoreBox value={match.finished ? match.away_score : a} onChange={v => handleChange(setA, v)} isResult={match.finished} />
          </div>
          {isLockedNotFinished && match.home_score !== null && (
            <div className="label" style={{ fontSize: 8, color: 'var(--muted)' }}>YOUR PICK</div>
          )}
        </div>

        {/* Away */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <Flag team={match.away_team} size={28} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink)' }}>
            {isPlaceholder(match.away_team) ? match.away_team : getAbbr(match.away_team)}
          </span>
        </div>
      </div>

      {/* Footer: countdown + save (or your pick + points when finished) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--line)',
      }}>
        {match.finished && pred?.home_score != null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>YOUR PICK</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
              {pred.home_score} – {pred.away_score}
            </span>
            {(() => {
              const pts = calcMatchPoints(pred, match);
              const color = pts === 7 ? 'var(--green)' : pts >= 5 ? 'var(--cyan)' : pts >= 3 ? 'var(--blue)' : pts >= 2 ? 'var(--orange)' : 'var(--muted)';
              return (
                <span style={{
                  fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11,
                  background: pts > 0 ? color : 'var(--line)',
                  color: pts > 0 ? '#fff' : 'var(--muted)',
                  borderRadius: 999, padding: '2px 9px',
                }}>
                  {pts > 0 ? `+${pts}` : '0'} pts
                </span>
              );
            })()}
          </div>
        ) : match.finished ? (
          <span className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>NO PICK · FINAL</span>
        ) : (
          <CountdownBadge matchTime={match.match_time} finished={match.finished} />
        )}

        {canEdit && (
          <button
            onClick={handleSave}
            disabled={h === '' || a === '' || saving}
            style={{
              all: 'unset', cursor: h === '' || a === '' ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: saved ? 'var(--green)' : (h === '' || a === '') ? 'var(--line)' : 'var(--ink)',
              color: saved ? '#fff' : (h === '' || a === '') ? 'var(--muted)' : 'var(--bg)',
              borderRadius: 999,
              fontWeight: 700, fontSize: 12,
              padding: '7px 14px',
              fontFamily: 'var(--sans)',
              transition: 'background .15s',
            }}
          >
            {saved ? <>{CHECK_SVG} Saved</> : <>Save {ARROW_SVG}</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Bracket match tile ────────────────────────────────────────────────────────
function BracketTile({ match, pred, onSave }) {
  const isTBD   = isPlaceholder(match.home_team) || isPlaceholder(match.away_team);
  const locked  = isLocked(match.match_time);
  const canEdit = !match.finished && !locked && !isTBD;

  const [h, setH] = useState(pred?.home_score ?? '');
  const [a, setA] = useState(pred?.away_score ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setH(pred?.home_score ?? '');
    setA(pred?.away_score ?? '');
  }, [pred?.home_score, pred?.away_score]);

  async function handleSave() {
    if (h === '' || a === '') return;
    try {
      await onSave(match.id, Number(h), Number(a));
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) { alert(e.message); }
  }

  const homeWin = match.finished && match.home_score > match.away_score;
  const awayWin = match.finished && match.away_score > match.home_score;

  const inlineInputStyle = {
    width: 38, height: 30, textAlign: 'center',
    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
    background: 'var(--bg)', border: '1.5px solid var(--line)',
    borderRadius: 6, outline: 'none', color: 'var(--ink)',
    flexShrink: 0,
  };

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1.5px solid var(--line)',
      borderRadius: 'var(--r)',
      overflow: 'hidden',
      fontSize: 13,
      opacity: isTBD ? 0.5 : 1,
    }}>
      {/* Home row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px',
        fontWeight: homeWin ? 700 : 500,
        borderBottom: '1px solid var(--line)',
      }}>
        <Flag team={match.home_team} size={16} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.home_team === 'TBD' ? '?' : match.home_team}
        </span>
        {canEdit ? (
          <input type="number" min="0" max="20" value={h}
            onChange={(e) => setH(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            style={inlineInputStyle} />
        ) : match.finished ? (
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: homeWin ? 'var(--ink)' : 'var(--muted)' }}>
            {match.home_score}
          </span>
        ) : pred?.home_score !== undefined ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{pred.home_score}</span>
        ) : null}
      </div>

      {/* Away row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px',
        fontWeight: awayWin ? 700 : 500,
      }}>
        <Flag team={match.away_team} size={16} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.away_team === 'TBD' ? '?' : match.away_team}
        </span>
        {canEdit ? (
          <input type="number" min="0" max="20" value={a}
            onChange={(e) => setA(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            style={inlineInputStyle} />
        ) : match.finished ? (
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: awayWin ? 'var(--ink)' : 'var(--muted)' }}>
            {match.away_score}
          </span>
        ) : pred?.away_score !== undefined ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{pred.away_score}</span>
        ) : null}
      </div>

      {/* Save button */}
      {canEdit && (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '6px 8px',
          background: 'var(--bg-2)',
          borderTop: '1px solid var(--line)',
        }}>
          <button
            onClick={handleSave}
            disabled={h === '' || a === ''}
            style={{
              all: 'unset', cursor: h === '' || a === '' ? 'not-allowed' : 'pointer',
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: saved ? 'var(--green)' : (h === '' || a === '') ? 'var(--line)' : 'var(--ink)',
              color: saved ? '#fff' : (h === '' || a === '') ? 'var(--muted)' : 'var(--bg)',
              borderRadius: 999, fontWeight: 700, fontSize: 11,
              padding: '5px 12px', transition: 'background .15s',
            }}
          >
            {saved ? <>{CHECK_SVG} OK</> : <>Save {ARROW_SVG}</>}
          </button>
        </div>
      )}

      {/* Footer: finished → your pick + points earned; locked → countdown */}
      {!canEdit && !isTBD && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '6px 10px', background: 'var(--bg-2)' }}>
          {match.finished && pred?.home_score != null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>TU PICK</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>
                {pred.home_score}–{pred.away_score}
              </span>
              {(() => {
                const pts = calcMatchPoints(pred, match);
                const color = pts === 7 ? 'var(--green)' : pts >= 5 ? 'var(--cyan)' : pts >= 3 ? 'var(--blue)' : pts >= 2 ? 'var(--orange)' : 'var(--muted)';
                return (
                  <span style={{
                    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 10,
                    background: pts > 0 ? color : 'var(--line)',
                    color: pts > 0 ? '#fff' : 'var(--muted)',
                    borderRadius: 999, padding: '2px 8px', marginLeft: 'auto',
                  }}>
                    {pts > 0 ? `+${pts}` : '0'} pts
                  </span>
                );
              })()}
            </div>
          ) : match.finished ? (
            <span className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>SIN PICK · FINAL</span>
          ) : (
            <CountdownBadge matchTime={match.match_time} finished={match.finished} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Bracket ordering ──────────────────────────────────────────────────────────
// Orders knockout matches by their position in the OFFICIAL bracket (not by
// kickoff time), so the tree is drawn structurally. Every knockout team played
// exactly one R32 match, so ordering ANY round by the smallest R32-slot among
// its teams reproduces the real top-to-bottom bracket order.
function buildBracketOrder(matches, standings) {
  // descriptor ("1st E", "2nd A"…) → R32 slot index 0..15 (fixed positions only —
  // every R32 slot has at least one, and each is unique, so no 3rd-place guessing)
  const descSlot = {};
  R32.forEach((slot, i) => {
    [slot.home, slot.away].forEach((d) => {
      if (/^(1st|2nd)\s/.test(d)) descSlot[d] = i;
    });
  });
  // team → descriptor, from final group standings (rank 0 = 1st, 1 = 2nd)
  const teamDesc = {};
  (standings || []).forEach(({ letter, standings: rows }) => {
    if (rows?.[0]) teamDesc[rows[0].team] = `1st ${letter}`;
    if (rows?.[1]) teamDesc[rows[1].team] = `2nd ${letter}`;
  });
  // team → R32 slot: assign each R32 match's slot to BOTH its teams (covers thirds)
  const teamSlot = {};
  (matches || []).filter((m) => m && m.stage === 'r32').forEach((m) => {
    let slot;
    [m.home_team, m.away_team].forEach((t) => {
      const d = teamDesc[t];
      if (d != null && descSlot[d] != null) slot = descSlot[d];
    });
    if (slot != null) {
      teamSlot[m.home_team] = slot;
      teamSlot[m.away_team] = slot;
    }
  });
  // order key per match = min traceable R32 slot among its teams (null if none)
  const order = {};
  (matches || []).forEach((m) => {
    if (!m) return;
    const slots = [m.home_team, m.away_team].map((t) => teamSlot[t]).filter((s) => s != null);
    order[m.id] = slots.length ? Math.min(...slots) : null;
  });
  return order;
}

// Comparator: structural bracket order, falling back to kickoff time when a
// match can't be placed yet (e.g. all teams still TBD).
function bracketSort(order) {
  return (a, b) => {
    const ka = order[a.id], kb = order[b.id];
    if (ka != null && kb != null && ka !== kb) return ka - kb;
    if (ka != null && kb == null) return -1;
    if (ka == null && kb != null) return 1;
    return new Date(a.match_time) - new Date(b.match_time);
  };
}

// ── Bracket view ──────────────────────────────────────────────────────────────
const MAIN_ROUNDS = [
  { key: 'r32', label: 'Round of 32',    stage: 'r32' },
  { key: 'r16', label: 'Round of 16',    stage: 'r16' },
  { key: 'qf',  label: 'Quarter-finals', stage: 'qf'  },
  { key: 'sf',  label: 'Semi-finals',    stage: 'sf'  },
];

function BracketView({ matches, preds, onSave, standings }) {
  const finalMatch = matches.find((m) => m.stage === 'final');
  const thirdMatch = matches.find((m) => m.stage === '3rd');

  // Structural bracket order (falls back to kickoff time per match)
  const order = useMemo(() => buildBracketOrder(matches, standings), [matches, standings]);
  const sortBracket = bracketSort(order);

  // Height scales with the largest round (R32 = 16 matches)
  const maxRoundSize = Math.max(
    ...MAIN_ROUNDS.map((r) => matches.filter((m) => m.stage === r.stage).length),
    1
  );
  const bracketMinHeight = Math.max(maxRoundSize * 88, 680);

  // ── Mobile: stacked rounds (each round as its own section) ──────────────────
  const mobileBracket = (
    <div className="md:hidden space-y-5">
      {MAIN_ROUNDS.map((round) => {
        const roundMatches = matches
          .filter((m) => m.stage === round.stage)
          .sort(sortBracket);
        if (!roundMatches.length) return null;
        return (
          <section key={round.key}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-2 mb-2 border-b">
              {round.label}
            </h3>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {roundMatches.map((m) => (
                <BracketTile key={m.id} match={m} pred={preds[m.id]} onSave={onSave} />
              ))}
            </div>
          </section>
        );
      })}
      {finalMatch && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary pb-2 mb-2 border-b border-primary/30 flex items-center gap-1">
            🏆 World Cup Final
          </h3>
          <BracketTile match={finalMatch} pred={preds[finalMatch.id]} onSave={onSave} />
        </section>
      )}
      {thirdMatch && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-2 mb-2 border-b flex items-center gap-1">
            🥉 3rd Place Play-off
          </h3>
          <BracketTile match={thirdMatch} pred={preds[thirdMatch.id]} onSave={onSave} />
        </section>
      )}
    </div>
  );

  // ── Desktop: horizontal bracket columns ─────────────────────────────────────
  const desktopBracket = (
    <div className="hidden md:block overflow-x-auto pb-4 -mx-1 px-1">
      <div className="flex gap-3 items-stretch" style={{ minHeight: `${bracketMinHeight}px`, minWidth: '960px' }}>
        {MAIN_ROUNDS.map((round) => {
          const roundMatches = matches
            .filter((m) => m.stage === round.stage)
            .sort(sortBracket);
          return (
            <div key={round.key} className="flex flex-col flex-1 min-w-[180px]">
              <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b mb-3">
                {round.label}
              </div>
              <div className="flex-1 flex flex-col justify-around gap-2">
                {roundMatches.map((m) => (
                  <BracketTile key={m.id} match={m} pred={preds[m.id]} onSave={onSave} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Final column: Final at 50%, 3rd place at 75% */}
        <div className="flex flex-col flex-1 min-w-[200px]">
          <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b mb-3">
            Final
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-x-0 flex flex-col gap-1.5"
                 style={{ top: '50%', transform: 'translateY(-50%)' }}>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-primary tracking-wide">
                🏆 World Cup Final
              </div>
              {finalMatch && <BracketTile match={finalMatch} pred={preds[finalMatch.id]} onSave={onSave} />}
            </div>
            <div className="absolute inset-x-0 flex flex-col gap-1.5"
                 style={{ top: '75%', transform: 'translateY(-50%)' }}>
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                🥉 3rd Place Play-off
              </div>
              {thirdMatch && <BracketTile match={thirdMatch} pred={preds[thirdMatch.id]} onSave={onSave} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileBracket}
      {desktopBracket}
    </>
  );
}

// ── Bracket position label — "TBD", "1st A", "2nd B", "Best 3rd", etc. ───────
// "TBD", "1st A", "2nd B", "3rd ABCDF", etc. → not a real team, no editing
function isPlaceholder(teamName) {
  if (!teamName) return true;
  if (teamName === 'TBD') return true;
  if (/^(1st|2nd|3rd)\s/.test(teamName)) return true;
  return false;
}

// ── Helper: is a match still pickable & unpicked? ─────────────────────────────
function isPending(match, pred) {
  if (pred) return false;
  if (match.finished) return false;
  if (isLocked(match.match_time)) return false;
  if (isPlaceholder(match.home_team) || isPlaceholder(match.away_team)) return false;
  return true;
}

// ── Sub-tab pill bar ──────────────────────────────────────────────────────────
function PillBar({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <PillBtn key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </PillBtn>
      ))}
    </div>
  );
}

function PillBtn({ active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: 'unset', cursor: 'pointer',
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 12, fontWeight: 600,
        background: active ? 'var(--ink)' : hovered ? 'var(--bg-2)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--ink)',
        border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
        transition: 'all .12s',
      }}
    >{children}</button>
  );
}

// ── Group Stage section ───────────────────────────────────────────────────────
function GroupStageSection({ matches, preds, onSave, pendingOnly, syncAll }) {
  const [md, setMd] = useState('all');

  const filtered = useMemo(() => {
    let list = (matches || []).filter((m) => m && m.stage === 'group');
    if (md !== 'all' && md !== 'groups') list = list.filter((m) => m.matchday === Number(md));
    if (pendingOnly) list = list.filter((m) => isPending(m, preds[m.id]));
    if (md === 'groups') list = [...list].sort((a, b) =>
      (a.group_name || '').localeCompare(b.group_name || '') ||
      new Date(a.match_time) - new Date(b.match_time)
    );
    return list;
  }, [matches, md, preds, pendingOnly]);

  const mdOptions = [
    { value: 'all',    label: 'All Matches' },
    { value: '1',      label: 'Matchday 1'  },
    { value: '2',      label: 'Matchday 2'  },
    { value: '3',      label: 'Matchday 3'  },
    { value: 'groups', label: 'Groups'      },
  ];

  // Groups view: matches split into sections per group letter
  const byGroup = useMemo(() => {
    if (md !== 'groups') return null;
    const map = {};
    for (const m of filtered) {
      const g = m.group_name || '?';
      if (!map[g]) map[g] = [];
      map[g].push(m);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [md, filtered]);

  return (
    <div className="space-y-4">
      <PillBar options={mdOptions} value={md} onChange={setMd} />
      {filtered.length === 0 ? (
        <EmptyState pendingOnly={pendingOnly} />
      ) : md === 'groups' ? (
        <div className="space-y-6">
          {(byGroup || []).map(([letter, groupMatches]) => (
            <div key={letter} className="space-y-3">
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26,
                  background: groupColor(letter),
                  color: isYellowGroup(letter) ? 'var(--ink)' : '#fff',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontSize: 14, flexShrink: 0,
                }}>{letter}</div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                  GROUP {letter}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {groupMatches.map((m) => (
                  <MatchCard key={m.id} match={m} pred={preds[m.id]} onSave={onSave} syncAll={syncAll} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} pred={preds[m.id]} onSave={onSave} syncAll={syncAll} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ pendingOnly }) {
  return (
    <div style={{
      border: '2px dashed var(--line)', borderRadius: 'var(--r)',
      padding: '40px 24px', textAlign: 'center',
      color: 'var(--muted)', fontSize: 13, fontWeight: 500,
    }}>
      {pendingOnly
        ? '🎉 All matches in this section have a pick — nothing pending here.'
        : 'No matches to show in this section.'}
    </div>
  );
}

// ── Knockout section ──────────────────────────────────────────────────────────
function KnockoutSection({ matches, preds, onSave, pendingOnly, syncAll, standings }) {
  const [view, setView] = useState('bracket');

  const viewOptions = [
    { value: 'bracket', label: '🏆 Bracket'      },
    { value: 'r32',     label: 'Round of 32'     },
    { value: 'r16',     label: 'Round of 16'     },
    { value: 'qf',      label: 'Quarter-finals'  },
    { value: 'sf',      label: 'Semi-finals'     },
    { value: 'finals',  label: 'Finals'          },
  ];

  const knockoutMatches = useMemo(() => {
    let list = (matches || []).filter((m) => m && m.stage !== 'group');
    if (pendingOnly) list = list.filter((m) => isPending(m, preds[m.id]));
    return list;
  }, [matches, preds, pendingOnly]);

  const filtered = useMemo(() => {
    if (view === 'bracket') return knockoutMatches;
    if (view === 'finals')  return knockoutMatches.filter((m) => ['3rd', 'final'].includes(m.stage));
    return knockoutMatches.filter((m) => m.stage === view);
  }, [knockoutMatches, view]);

  return (
    <div className="space-y-4">
      <PillBar options={viewOptions} value={view} onChange={setView} />
      {pendingOnly && knockoutMatches.length === 0 ? (
        <EmptyState pendingOnly />
      ) : view === 'bracket' ? (
        <BracketView matches={knockoutMatches} preds={preds} onSave={onSave} standings={standings} />
      ) : view === 'finals' ? (
        /* Finals view: Final + 3rd place with distinct labels */
        <div className="grid gap-6 sm:grid-cols-2">
          {/* 3rd place first (earlier date), then Final */}
          {[
            { stage: '3rd',   icon: '🥉', label: '3rd Place Play-off' },
            { stage: 'final', icon: '🏆', label: 'World Cup Final'    },
          ].map(({ stage, icon, label }) => {
            const m = knockoutMatches.find((x) => x.stage === stage);
            if (!m) return null;
            return (
              <div key={stage} className="space-y-2">
                <div className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold',
                  stage === 'final' ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {icon} {label}
                </div>
                <MatchCard match={m} pred={preds[m.id]} onSave={onSave} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} pred={preds[m.id]} onSave={onSave} syncAll={syncAll} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section switcher button ───────────────────────────────────────────────────
function SectionBtn({ active, onClick, children, accent }) {
  const bg = active ? (accent || 'var(--ink)') : 'transparent';
  const fg = active ? (accent === 'var(--yellow)' ? 'var(--ink)' : 'var(--bg)') : 'var(--muted)';
  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset', cursor: 'pointer',
        padding: '8px 18px',
        borderRadius: 8,
        background: bg,
        color: fg,
        fontWeight: 700, fontSize: 13,
        letterSpacing: '-0.01em',
        transition: 'all .12s',
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

function PendingToggle({ active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: 'unset', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderRadius: 'var(--r)',
        border: active ? '1.5px solid var(--orange)' : '1.5px solid var(--line)',
        background: active ? 'rgba(255,106,26,0.1)' : hovered ? 'var(--bg-2)' : 'transparent',
        color: active ? 'var(--orange)' : 'var(--muted)',
        fontWeight: 600, fontSize: 13,
        transition: 'all .12s',
      }}
    >
      {active ? '⏰' : '📋'}
      {active ? 'Pending only' : 'Show pending only'}
    </button>
  );
}

// ── Champion Section ──────────────────────────────────────────────────────────
function ChampionSection({ champ, onSave }) {
  const [search, setSearch] = useState('');
  const [pickStats, setPickStats] = useState([]);
  const teams = useMemo(() => (champ.teams || []).sort(), [champ.teams]);

  // Load real pick stats and poll every 30 s
  useEffect(() => {
    let cancelled = false;
    function load() {
      getChampionPickStats()
        .then((stats) => { if (!cancelled) setPickStats(stats); })
        .catch(() => {}); // silent fail — show stale data
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // All teams with picks, sorted by pct desc
  const allPicks = pickStats.filter(s => s.pct > 0);
  const maxPct = allPicks[0]?.pct || 1; // avoid divide-by-zero in the bar
  // Build a quick lookup for percentages used in the team grid
  const pctMap = Object.fromEntries(pickStats.map(s => [s.team, s.pct]));

  const filtered = teams.filter((t) => t.toLowerCase().includes(search.toLowerCase()));
  const isLocked = champ.locked || !!champ.champion;
  const current = champ.champion || champ.prediction;

  // After user saves a pick, refresh stats immediately
  function handlePick(team) {
    if (isLocked) return;
    onSave(team).then(() => {
      getChampionPickStats()
        .then(setPickStats)
        .catch(() => {});
    }).catch(() => {});
  }

  return (
    <div className="mob-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
      {/* Left: yellow hero panel */}
      <div style={{
        background: 'var(--yellow)', color: 'var(--ink)',
        borderRadius: 'var(--r-xl)', padding: '32px 30px',
        position: 'relative', overflow: 'hidden', minHeight: 340,
      }}>
        {/* Decorative 26 */}
        <div style={{
          position: 'absolute', right: -20, bottom: -30,
          fontFamily: 'var(--display)', fontSize: 260, lineHeight: 0.8,
          letterSpacing: '-0.06em', color: 'rgba(0,0,0,0.07)',
          pointerEvents: 'none', userSelect: 'none',
        }}>26</div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="label" style={{ opacity: 0.6, marginBottom: 14 }}>WHO LIFTS THE TROPHY · +30 PTS</div>
          <h2 style={{
            fontFamily: 'var(--display)', fontSize: 46,
            lineHeight: 0.9, letterSpacing: '-0.04em', margin: '0 0 14px',
          }}>Pick the<br />champion.</h2>
          <p style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.75, margin: '0 0 28px', maxWidth: 280 }}>
            Your single highest-value pick. Locks at the start of the Round of 16 — change it any time before that.
          </p>

          {current ? (
            <div style={{
              background: 'var(--ink)', color: 'var(--bg)',
              borderRadius: 'var(--r)', padding: '14px 18px',
              display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 200,
            }}>
              <div className="label" style={{ color: '#8B8B90', fontSize: 9.5 }}>
                {champ.champion ? 'TOURNAMENT CHAMPION' : 'YOUR PICK'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em' }}>
                <Flag team={current} size={28} />
                {current.toUpperCase()}
              </div>
            </div>
          ) : (
            <div style={{
              border: '2px dashed rgba(0,0,0,0.25)', borderRadius: 'var(--r)',
              padding: '14px 18px', display: 'inline-flex', alignItems: 'center', gap: 8,
              fontWeight: 600, fontSize: 14, opacity: 0.65,
            }}>
              Select a team →
            </div>
          )}

          {isLocked && (
            <div className="label" style={{ marginTop: 14, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}>
              {LOCK_SVG} {champ.champion ? 'TOURNAMENT DECIDED' : 'PICKS LOCKED'}
            </div>
          )}
        </div>
      </div>

      {/* Right: popular picks + team grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Popular picks — live from Supabase */}
        <div>
          <div className="label" style={{ color: 'var(--muted)', marginBottom: 14 }}>
            POPULAR PICKS · OFFICE POOL
            {pickStats.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--green)' }}>● LIVE</span>
            )}
          </div>
          {allPicks.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
              No picks yet — be the first!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allPicks.map((row) => {
                const isSelected = row.team === current;
                return (
                  <div key={row.team} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 130, flexShrink: 0 }}>
                      <Flag team={row.team} size={16} />
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500 }}>{row.team}</span>
                    </div>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 999 }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        background: isSelected ? 'var(--ink)' : 'var(--line)',
                        width: `${(row.pct / maxPct) * 100}%`,
                        transition: 'width .4s',
                      }} />
                    </div>
                    <div className="label" style={{ color: 'var(--muted)', fontSize: 10, width: 32, textAlign: 'right' }}>
                      {row.pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All 48 teams grid */}
        {!isLocked && (
          <div>
            <div className="label" style={{ color: 'var(--muted)', marginBottom: 12 }}>ALL {teams.length} TEAMS</div>
            <input
              type="text"
              placeholder="Search team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px', marginBottom: 10,
                background: 'var(--bg)', border: '1.5px solid var(--line)',
                borderRadius: 'var(--r-sm)', fontSize: 13,
                fontFamily: 'var(--sans)', color: 'var(--ink)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div className="mob-3col" style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
              maxHeight: 260, overflowY: 'auto',
            }}>
              {filtered.map((t) => {
                const isSel = t === current;
                return (
                  <TeamBtn key={t} team={t} selected={isSel} onClick={() => handlePick(t)} pct={pctMap[t] ?? 0} />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamBtn({ team, selected, onClick, pct }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px',
        borderRadius: 'var(--r-sm)',
        background: selected ? 'var(--ink)' : hovered ? 'var(--bg-2)' : 'var(--bg)',
        color: selected ? 'var(--bg)' : 'var(--ink)',
        border: `1.5px solid ${selected ? 'var(--ink)' : 'var(--line)'}`,
        fontSize: 12, fontWeight: selected ? 700 : 500,
        transition: 'all .1s',
        overflow: 'hidden',
      }}
    >
      <Flag team={team} size={16} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{team}</span>
      {pct > 0 && (
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, flexShrink: 0,
          color: selected ? 'var(--yellow)' : 'var(--muted)',
        }}>{pct}%</span>
      )}
    </button>
  );
}

// ── Main Predictions page ─────────────────────────────────────────────────────
export default function Predictions() {
  const [matches, setMatches] = useState([]);
  const [preds, setPreds]     = useState({});
  const [champ, setChamp]     = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('group');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [syncAll, setSyncAll] = useState(0);
  const [savingAll, setSavingAll] = useState(false);

  const loadAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [ms, predictions, champData, groupStandings] = await Promise.all([
        getMatches(),
        getMyPredictions(),
        getChampionData(),
        getGroupStandings().catch(() => []),
      ]);
      // Derive group_name from team names when DB has it as null
      const enriched = (ms || []).map((m) => {
        if (!m) return m; // guard against null entries
        if (m.stage === 'group' && !m.group_name) {
          const g = getTeamGroup(m.home_team) || getTeamGroup(m.away_team);
          return g ? { ...m, group_name: g } : m;
        }
        return m;
      });
      setMatches(enriched);
      const map = {};
      for (const p of (predictions || [])) if (p) map[p.match_id] = p;
      setPreds(map);
      setChamp(champData);
      setStandings(groupStandings || []);

    } catch (err) {
      // Swallow network/auth errors on background refreshes — keep stale data
      // rather than crashing React. On initial load show error in console only.
      console.error('[Predictions] loadAll failed:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial load — show spinner
  useEffect(() => { loadAll(true); }, [loadAll]);

  // Warn when leaving the page if there are unsaved predictions
  // (tracks via a ref so we can check inside the event listener)
  const hasUnsavedRef = useRef(false);
  // We can't easily know per-card state from the parent, so we use a simpler
  // heuristic: if there are any editable matches (not locked, not finished),
  // show the warning. Users see the green "Saved" indicators to know what's safe.
  useEffect(() => {
    function handleBeforeUnload(e) {
      const editableCount = matches.filter(m =>
        !m.finished && !isLocked(m.match_time) &&
        !isPlaceholder(m.home_team) && !isPlaceholder(m.away_team)
      ).length;
      if (editableCount > 0) {
        e.preventDefault();
        e.returnValue = 'You may have unsaved predictions. Are you sure you want to leave?';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [matches]);
  // Background refresh every 60s — silent, no spinner, no UI reset
  useEffect(() => {
    const i = setInterval(() => loadAll(false), 60_000);
    return () => clearInterval(i);
  }, [loadAll]);

  const savePred = useCallback(async (matchId, homeScore, awayScore) => {
    await savePrediction(matchId, homeScore, awayScore);
    setPreds((p) => ({ ...p, [matchId]: { match_id: matchId, home_score: homeScore, away_score: awayScore } }));
  }, []);

  const saveChamp = useCallback(async (team) => {
    await saveChampionPick(team);
    setChamp((c) => ({ ...c, prediction: team }));
  }, []);

  const made  = Object.keys(preds).length;
  const total = 104; // Full WC 2026: 72 group + 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3rd + 1 Final
  const pct   = Math.round((made / total) * 100);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.12em', color: 'var(--muted)' }}>
        LOADING…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
      {/* Progress header */}
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        borderRadius: 'var(--r-lg)', padding: '24px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div className="label" style={{ color: '#8B8B90', marginBottom: 8 }}>YOUR PREDICTIONS · LOCK 1H BEFORE KICKOFF</div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 0.9, letterSpacing: '-0.04em', margin: 0 }}>
              Make your predictions.
            </h1>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(52px, 6vw, 80px)', lineHeight: 0.85, letterSpacing: '-0.05em', color: 'var(--yellow)' }}>
              {made}<span style={{ color: '#3A3A45', fontSize: '55%' }}>/{total}</span>
            </div>
            <div className="label" style={{ color: '#8B8B90', marginTop: 4 }}>MATCHES PICKED</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 20, height: 6, background: 'var(--ink-2)', borderRadius: 999 }}>
          <div style={{ height: '100%', background: 'var(--yellow)', borderRadius: 999, width: `${pct}%`, transition: 'width .4s ease' }} />
        </div>
      </div>

      {/* Section switcher */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div className="section-tabs" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--r)', background: 'var(--bg-2)', border: '1.5px solid var(--line)' }}>
          {[
            { value: 'group',    label: 'Group stage'   },
            { value: 'knockout', label: 'Knockout'      },
            { value: 'champion', label: 'Champion pick' },
          ].map((s) => (
            <SectionBtn key={s.value} active={section === s.value} accent={s.value === 'champion' ? 'var(--yellow)' : null} onClick={() => setSection(s.value)}>
              {s.label}
            </SectionBtn>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {section !== 'champion' && (
            <PendingToggle active={pendingOnly} onClick={() => setPendingOnly((v) => !v)} />
          )}
          {section !== 'champion' && (
            <button
              onClick={async () => {
                setSavingAll(true);
                setSyncAll(c => c + 1);
                await new Promise(r => setTimeout(r, 1500));
                setSavingAll(false);
              }}
              disabled={savingAll}
              style={{
                all: 'unset', cursor: savingAll ? 'default' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: savingAll ? 'var(--green)' : 'var(--ink)',
                color: '#fff',
                borderRadius: 999, fontWeight: 700, fontSize: 12,
                padding: '7px 14px', fontFamily: 'var(--sans)',
                transition: 'background .15s',
              }}
            >
              {savingAll ? '✓ Saving all…' : 'Save all →'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {section === 'group' && (
        <SectionErrorBoundary key="group">
          <GroupStageSection matches={matches} preds={preds} onSave={savePred} pendingOnly={pendingOnly} syncAll={syncAll} />
        </SectionErrorBoundary>
      )}
      {section === 'knockout' && (
        <SectionErrorBoundary key="knockout">
          <KnockoutSection matches={matches} preds={preds} onSave={savePred} pendingOnly={pendingOnly} syncAll={syncAll} standings={standings} />
        </SectionErrorBoundary>
      )}
      {section === 'champion' && champ && (
        <SectionErrorBoundary key="champion">
          <ChampionSection champ={champ} onSave={saveChamp} />
        </SectionErrorBoundary>
      )}
    </div>
  );
}
