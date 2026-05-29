import { useEffect, useState, useCallback, useMemo } from 'react';
import { getFlag, getAbbr, GROUPS } from '@/lib/matches-data';
import { getBracketChallenge, saveBracketChallenge } from '@/lib/supabase-db';
import {
  GROUPS_LIST, BRACKET_LOCK, isBracketLocked,
  ROUND_LABELS, R32, BRACKET_TREE,
  defaultGroupPicks, assignThirds, getMatchTeams, matchesForStage, matchDate,
  groupsComplete, knockoutComplete, ALL_MATCH_IDS,
} from '@/lib/bracket-data';

// ── Palette ───────────────────────────────────────────────────────────────────
const GROUP_COLORS = {
  A:'var(--red)',   B:'var(--blue)',   C:'var(--green)',  D:'var(--pink)',
  E:'var(--yellow)',F:'var(--cyan)',   G:'var(--purple)', H:'var(--orange)',
  I:'var(--red)',   J:'var(--blue)',   K:'var(--green)',  L:'var(--pink)',
};
const groupColor = g => GROUP_COLORS[g] || 'var(--ink)';
const isYellowGroup = g => g === 'E';

const LOCK_DATE_STR = BRACKET_LOCK.toLocaleDateString('en-US',
  { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// ── Up/Down arrow icons ───────────────────────────────────────────────────────
const IUp   = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>;
const IDown = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>;
const ICheck = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const ITrophy = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <path d="M7 3h10v3a5 5 0 0 1-10 0V3z" fill="var(--yellow)"/>
    <path d="M7 5H4v2a3 3 0 0 0 3 3" stroke="var(--yellow)" strokeWidth="1.6" fill="none"/>
    <path d="M17 5h3v2a3 3 0 0 1-3 3" stroke="var(--yellow)" strokeWidth="1.6" fill="none"/>
    <rect x="9" y="11" width="6" height="3" rx="0.5" fill="var(--yellow)"/>
    <rect x="7" y="14" width="10" height="2.5" rx="0.5" fill="var(--yellow)"/>
    <rect x="6" y="17" width="12" height="3" rx="0.5" fill="var(--yellow)"/>
  </svg>
);

// ── Phase 1: Group Ranker ─────────────────────────────────────────────────────
function GroupRanker({ groupLetter, ranking, onChange, onNext, onPrev, groupIndex, locked }) {
  function move(idx, dir) {
    const arr = [...ranking];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    onChange(arr);
  }

  const gColor = groupColor(groupLetter);
  const gYellow = isYellowGroup(groupLetter);
  const LABELS = ['1st · Advances', '2nd · Advances', '3rd · Might advance', '4th · Eliminated'];
  const LABEL_COLORS = ['var(--green)', 'var(--cyan)', 'var(--muted)', 'var(--muted)'];
  const BORDER_STYLES = ['solid', 'solid', '2px dashed', 'none'];

  return (
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: gColor, color: gYellow ? 'var(--ink)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontSize: 22,
          }}>{groupLetter}</div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1 }}>
              Group {groupLetter}
            </div>
            <div className="label" style={{ color: 'var(--muted)', marginTop: 2 }}>
              Drag or use arrows to rank teams
            </div>
          </div>
        </div>
        <div className="label" style={{ color: 'var(--muted)' }}>{groupIndex + 1} / 12</div>
      </div>

      {/* Team rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranking.map((team, idx) => (
          <div key={team} style={{
            display: 'grid', gridTemplateColumns: '28px 1fr auto',
            alignItems: 'center', gap: 12,
            background: 'var(--bg)',
            border: `1.5px ${BORDER_STYLES[idx]} var(--line)`,
            borderRadius: 'var(--r)',
            padding: '12px 14px',
          }}>
            {/* Rank number */}
            <div style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.04em', color: idx < 2 ? gColor : 'var(--muted)' }}>
              {idx + 1}
            </div>
            {/* Team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{getFlag(team)}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{team}</div>
                <div className="label" style={{ color: LABEL_COLORS[idx], fontSize: 9, marginTop: 1 }}>{LABELS[idx]}</div>
              </div>
            </div>
            {/* Up / Down buttons */}
            {!locked && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  style={{ all: 'unset', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.25 : 1,
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-2)', borderRadius: 6 }}
                ><IUp /></button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === ranking.length - 1}
                  style={{ all: 'unset', cursor: idx === ranking.length - 1 ? 'default' : 'pointer',
                    opacity: idx === ranking.length - 1 ? 0.25 : 1,
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-2)', borderRadius: 6 }}
                ><IDown /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
        <button
          onClick={onPrev}
          disabled={groupIndex === 0}
          style={{ all: 'unset', cursor: groupIndex === 0 ? 'default' : 'pointer', opacity: groupIndex === 0 ? 0.3 : 1,
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, color: 'var(--muted)' }}
        >← Previous</button>
        <button
          onClick={onNext}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--ink)', color: '#fff',
            borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14, padding: '12px 22px',
          }}
        >
          {groupIndex < 11 ? `Next: Group ${GROUPS_LIST[groupIndex + 1]} →` : 'Pick 3rd-place teams →'}
        </button>
      </div>
    </div>
  );
}

// ── Phase 2: Third-place picker ───────────────────────────────────────────────
function ThirdsPicker({ groupPicks, selected, onToggle, onFinish, onBack, locked }) {
  const thirds = GROUPS_LIST.map(g => ({
    group: g,
    team: (groupPicks[g] || [])[2] || '?',
  }));

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>STEP 2 OF 3</div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Choose best 3rd-place teams
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
          Select exactly <b>8 of 12</b> groups' third-place teams that will advance to the Round of 32.
        </p>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: '8px 14px', marginBottom: 16,
      }}>
        <span className="label" style={{ color: 'var(--muted)' }}>Selected</span>
        <span style={{
          fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.04em',
          color: selected.length === 8 ? 'var(--green)' : 'var(--ink)',
        }}>
          {selected.length}<span style={{ fontSize: 14, fontFamily: 'var(--mono)', color: 'var(--muted)' }}> / 8</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {thirds.map(({ group, team }) => {
          const isSelected = selected.includes(team);
          const isFull = selected.length >= 8 && !isSelected;
          const gColor = groupColor(group);
          const gYellow = isYellowGroup(group);

          return (
            <button
              key={group}
              onClick={() => !locked && !isFull && onToggle(team)}
              disabled={locked || (isFull)}
              style={{
                all: 'unset', cursor: locked || isFull ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 8px',
                background: isSelected ? 'var(--ink)' : 'var(--bg)',
                border: `1.5px ${isSelected ? 'solid var(--ink)' : '1.5px solid var(--line)'}`,
                borderRadius: 'var(--r)',
                opacity: isFull ? 0.4 : 1,
                transition: 'all .12s',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 5,
                background: isSelected ? '#fff' : gColor,
                color: isSelected ? 'var(--ink)' : (gYellow ? 'var(--ink)' : '#fff'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontSize: 11,
              }}>{group}</div>
              <span style={{ fontSize: 22 }}>{getFlag(team)}</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', color: isSelected ? '#fff' : 'var(--ink)',
                textAlign: 'center',
              }}>{getAbbr(team)}</span>
              {isSelected && (
                <div style={{ color: 'var(--green)', lineHeight: 0 }}><ICheck /></div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
        <button onClick={onBack}
          style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Groups
        </button>
        <button
          onClick={onFinish}
          disabled={selected.length !== 8}
          style={{
            all: 'unset', cursor: selected.length === 8 ? 'pointer' : 'default',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: selected.length === 8 ? 'var(--ink)' : 'var(--line)',
            color: selected.length === 8 ? '#fff' : 'var(--muted)',
            borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14, padding: '12px 22px',
          }}
        >Fill in the bracket →</button>
      </div>
    </div>
  );
}

// ── Phase 3: Knockout bracket ─────────────────────────────────────────────────
function TeamSlot({ team, picked, onClick, locked }) {
  const canPick = team && !locked;
  return (
    <button
      onClick={() => canPick && onClick && onClick(team)}
      style={{
        all: 'unset',
        cursor: canPick && onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px',
        background: picked ? 'var(--ink)' : 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        transition: 'background .1s',
        opacity: team ? 1 : 0.4,
        minHeight: 40,
      }}
      onMouseEnter={e => { if (canPick && onClick) e.currentTarget.style.background = picked ? 'var(--ink-2)' : 'var(--bg-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = picked ? 'var(--ink)' : 'var(--bg)'; }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{team ? getFlag(team) : '·'}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        color: picked ? '#fff' : (team ? 'var(--ink)' : 'var(--muted)') }}>
        {team ? getAbbr(team) : 'TBD'}
      </span>
      {picked && <span style={{ marginLeft: 'auto', color: 'var(--yellow)', fontSize: 14 }}>✓</span>}
    </button>
  );
}

function MatchCard({ matchId, groupPicks, thirdAssignments, knockoutPicks, onPick, locked, stage }) {
  const { home, away } = getMatchTeams(matchId, groupPicks, thirdAssignments, knockoutPicks);
  const winner = knockoutPicks[matchId];
  const date = matchDate(matchId);
  const stageColor = { r32: 'var(--blue)', r16: 'var(--green)', qf: 'var(--orange)', sf: 'var(--pink)', final: 'var(--yellow)' }[stage] || 'var(--ink)';

  return (
    <div style={{
      border: `1.5px solid ${winner ? 'var(--ink)' : 'var(--line)'}`,
      borderRadius: 'var(--r)',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <div style={{ background: 'var(--bg-2)', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="label" style={{ color: stageColor, fontSize: 9 }}>{ROUND_LABELS[stage]?.toUpperCase()}</div>
        {date && <div className="label" style={{ color: 'var(--muted)', fontSize: 9 }}>{date}</div>}
      </div>
      <TeamSlot team={home} picked={winner === home} onClick={home && away ? () => onPick(matchId, home) : null} locked={locked} />
      <TeamSlot team={away} picked={winner === away} onClick={home && away ? () => onPick(matchId, away) : null} locked={locked} />
    </div>
  );
}

function KnockoutPhase({ groupPicks, thirdPicks, knockoutPicks, onPick, onBack, onLock, locked, saving }) {
  const [activeStage, setActiveStage] = useState('r32');
  const thirdAssignments = useMemo(() => assignThirds(thirdPicks), [thirdPicks]);
  const stages = ['r32','r16','qf','sf','final'];

  // Determine which stages are unlocked (prior stage fully picked)
  function isStageUnlocked(stage) {
    if (stage === 'r32') return true;
    const stageOrder = stages;
    const prev = stageOrder[stageOrder.indexOf(stage) - 1];
    const prevIds = matchesForStage(prev);
    return prevIds.every(id => !!knockoutPicks[id]);
  }

  const stageIds = matchesForStage(activeStage);
  const isComplete = knockoutComplete(knockoutPicks);

  return (
    <div>
      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {stages.map(s => {
          const unlocked = isStageUnlocked(s);
          const done = matchesForStage(s).every(id => !!knockoutPicks[id]);
          return (
            <button
              key={s}
              onClick={() => unlocked && setActiveStage(s)}
              disabled={!unlocked}
              style={{
                all: 'unset',
                cursor: unlocked ? 'pointer' : 'default',
                padding: '7px 14px',
                borderRadius: 999,
                fontWeight: 600, fontSize: 13,
                background: activeStage === s ? 'var(--ink)' : done ? 'var(--bg-2)' : 'transparent',
                color: activeStage === s ? '#fff' : unlocked ? 'var(--ink)' : 'var(--muted)',
                border: `1.5px solid ${activeStage === s ? 'var(--ink)' : 'var(--line)'}`,
                opacity: !unlocked ? 0.4 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {ROUND_LABELS[s]}
              {done && <span style={{ fontSize: 10 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Matches grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {stageIds.map(id => (
          <MatchCard
            key={id}
            matchId={id}
            groupPicks={groupPicks}
            thirdAssignments={thirdAssignments}
            knockoutPicks={knockoutPicks}
            onPick={onPick}
            locked={locked}
            stage={activeStage}
          />
        ))}
      </div>

      {/* Progress hint */}
      {!isStageUnlocked(stages[stages.indexOf(activeStage) + 1] || 'final') && !isComplete && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)',
          color: 'var(--muted)', fontSize: 13 }}>
          Complete all {ROUND_LABELS[activeStage]} picks to unlock the next round.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <button onClick={onBack}
          style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        {!locked && isComplete && (
          <button
            onClick={onLock}
            disabled={saving}
            style={{
              all: 'unset', cursor: saving ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--green)', color: '#fff',
              borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14, padding: '12px 22px',
            }}
          >
            {saving ? 'Saving…' : '🔒 Lock in my bracket'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Summary sidebar ───────────────────────────────────────────────────────────
function GroupSummary({ groupPicks, onEdit, locked }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {GROUPS_LIST.map(g => {
        const ranking = groupPicks[g] || [];
        const gColor = groupColor(g);
        const gYellow = isYellowGroup(g);
        return (
          <div key={g} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 4,
                background: gColor, color: gYellow ? 'var(--ink)' : '#fff',
                fontFamily: 'var(--display)', fontSize: 11,
              }}>{g}</div>
              {!locked && (
                <button onClick={() => onEdit(g)}
                  style={{ all: 'unset', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9,
                    letterSpacing: '0.08em', color: 'var(--blue)', fontWeight: 700 }}>EDIT</button>
              )}
            </div>
            {ranking.slice(0,2).map((team, i) => (
              <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', width: 12 }}>{i+1}</span>
                <span style={{ fontSize: 14 }}>{getFlag(team)}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{team}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Landing / intro ───────────────────────────────────────────────────────────
function Landing({ onStart, locked, hasPicks }) {
  const steps = [
    { n: 1, title: 'Rank each group', desc: 'Predict the final standings for all 12 groups.' },
    { n: 2, title: 'Pick best 3rds',  desc: 'Choose 8 of the 12 third-place teams to advance.' },
    { n: 3, title: 'Fill the bracket', desc: 'Pick the winner of every knockout match.' },
  ];
  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: 'var(--ink)', borderRadius: 'var(--r-xl)', padding: '32px 32px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -16, top: -24, fontFamily: 'var(--display)', fontSize: 160, lineHeight: 0.82, color: 'var(--yellow)', opacity: 0.12, pointerEvents: 'none' }}>BC</div>
        <div className="label" style={{ color: '#8B8B90', marginBottom: 8 }}>BRACKET CHALLENGE · WORLD CUP 2026</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--bg)', margin: '0 0 14px' }}>
          Predict<br/>the entire<br/>tournament.
        </h1>
        <p style={{ color: '#C9C6BB', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          Lock in all your picks before Jun 11. Score points for every group ranking, 3rd-place qualifier, and knockout winner you get right.
        </p>
        <div className="label" style={{ marginTop: 14, color: '#8B8B90' }}>
          🔒 LOCKS {LOCK_DATE_STR}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px',
            background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontFamily: 'var(--display)', fontSize: 14 }}>{s.n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={locked && !hasPicks}
        style={{
          all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: locked ? 'var(--muted)' : 'var(--ink)',
          color: '#fff', borderRadius: 'var(--r)', fontWeight: 700, fontSize: 15, padding: '16px',
        }}
      >
        {locked ? (hasPicks ? '🔒 View my locked bracket' : '🔒 Bracket locked') : (hasPicks ? 'Continue my bracket →' : 'Start bracket challenge →')}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Bracket() {
  const locked = isBracketLocked();

  const [view, setView]               = useState('landing'); // landing | groups | thirds | knockout
  const [groupIndex, setGroupIndex]   = useState(0);
  const [groupPicks, setGroupPicks]   = useState(defaultGroupPicks);
  const [thirdPicks, setThirdPicks]   = useState([]);
  const [knockoutPicks, setKnockout]  = useState({});
  const [phase, setPhase]             = useState('groups');
  const [hasPicks, setHasPicks]       = useState(false);
  const [saving, setSaving]           = useState(false);

  // Load from DB
  useEffect(() => {
    getBracketChallenge().then(data => {
      if (!data) return;
      if (data.group_picks && Object.keys(data.group_picks).length)  setGroupPicks(data.group_picks);
      if (data.third_place_picks?.length)  setThirdPicks(data.third_place_picks);
      if (data.knockout_picks && Object.keys(data.knockout_picks).length) setKnockout(data.knockout_picks);
      setPhase(data.phase || 'groups');
      setHasPicks(true);
      // Restore view to appropriate phase
      if (data.phase === 'knockout' || data.phase === 'complete') setView('knockout');
      else if (data.phase === 'thirds') setView('thirds');
    }).catch(() => {});
  }, []);

  const persist = useCallback(async (updates) => {
    setSaving(true);
    try {
      await saveBracketChallenge(updates);
      setHasPicks(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }, []);

  // ── Group picks handlers
  function updateGroupRanking(g, newRanking) {
    const next = { ...groupPicks, [g]: newRanking };
    setGroupPicks(next);
  }

  function saveGroupsAndContinue() {
    const next = { group_picks: groupPicks, phase: 'thirds' };
    setPhase('thirds');
    setView('thirds');
    persist(next);
  }

  // Jump back to edit a specific group from the knockout view
  function editGroup(g) {
    setGroupIndex(GROUPS_LIST.indexOf(g));
    setView('groups');
  }

  // ── Third picks handlers
  function toggleThird(team) {
    setThirdPicks(prev => {
      if (prev.includes(team)) return prev.filter(t => t !== team);
      if (prev.length >= 8) return prev;
      return [...prev, team];
    });
  }

  function saveThirdsAndContinue() {
    const next = { group_picks: groupPicks, third_place_picks: thirdPicks, phase: 'knockout' };
    setPhase('knockout');
    setView('knockout');
    persist(next);
  }

  // ── Knockout pick handler
  function handlePick(matchId, team) {
    if (locked) return;
    const next = { ...knockoutPicks, [matchId]: team };

    // Cascade: if a team that was already picked in later rounds is now being replaced,
    // clear later picks that reference the old winner
    const old = knockoutPicks[matchId];
    if (old && old !== team) {
      // Remove all downstream picks that had the old winner
      const cleared = { ...next };
      function clearDownstream(id) {
        const dep = BRACKET_TREE.find(m => m.from.includes(id));
        if (!dep) return;
        if (cleared[dep.id] === old) {
          delete cleared[dep.id];
          clearDownstream(dep.id);
        }
      }
      clearDownstream(matchId);
      setKnockout(cleared);
      persist({ knockout_picks: cleared, phase: knockoutComplete(cleared) ? 'complete' : 'knockout' });
      return;
    }

    setKnockout(next);
    persist({ knockout_picks: next, phase: knockoutComplete(next) ? 'complete' : 'knockout' });
  }

  // ── Lock bracket
  async function handleLock() {
    await persist({ group_picks: groupPicks, third_place_picks: thirdPicks, knockout_picks: knockoutPicks, phase: 'complete', locked: true });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const currentGroup = GROUPS_LIST[groupIndex];
  const currentRanking = groupPicks[currentGroup] || GROUPS[currentGroup] || [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 28 }}>
        <div>
          <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            BRACKET CHALLENGE · WORLD CUP 2026
            {locked && <span style={{ marginLeft: 10, color: 'var(--orange)' }}>🔒 LOCKED</span>}
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0 }}>
            Bracket
          </h2>
        </div>
        {view !== 'landing' && (
          <button onClick={() => setView('landing')}
            style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Overview
          </button>
        )}
        {saving && <div className="label" style={{ color: 'var(--muted)', fontSize: 10 }}>Saving…</div>}
      </div>

      {view === 'landing' && (
        <Landing
          onStart={() => setView(phase === 'knockout' || phase === 'complete' ? 'knockout' : phase === 'thirds' ? 'thirds' : 'groups')}
          locked={locked}
          hasPicks={hasPicks}
        />
      )}

      {view === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 32, alignItems: 'start' }}>
          <GroupRanker
            groupLetter={currentGroup}
            ranking={currentRanking}
            onChange={r => updateGroupRanking(currentGroup, r)}
            onPrev={() => setGroupIndex(i => Math.max(0, i - 1))}
            onNext={() => {
              if (groupIndex < 11) setGroupIndex(i => i + 1);
              else saveGroupsAndContinue();
            }}
            groupIndex={groupIndex}
            locked={locked}
          />
          {/* Side summary */}
          <div>
            <div className="label" style={{ color: 'var(--muted)', marginBottom: 10 }}>YOUR GROUP PICKS</div>
            <GroupSummary groupPicks={groupPicks} onEdit={g => setGroupIndex(GROUPS_LIST.indexOf(g))} locked={locked} />
          </div>
        </div>
      )}

      {view === 'thirds' && (
        <ThirdsPicker
          groupPicks={groupPicks}
          selected={thirdPicks}
          onToggle={toggleThird}
          onFinish={saveThirdsAndContinue}
          onBack={() => setView('groups')}
          locked={locked}
        />
      )}

      {view === 'knockout' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px', gap: 32, alignItems: 'start' }}>
          <KnockoutPhase
            groupPicks={groupPicks}
            thirdPicks={thirdPicks}
            knockoutPicks={knockoutPicks}
            onPick={handlePick}
            onBack={() => setView('thirds')}
            onLock={handleLock}
            locked={locked}
            saving={saving}
          />
          {/* Side: champion pick display */}
          <div>
            <div className="label" style={{ color: 'var(--muted)', marginBottom: 10 }}>CHAMPION</div>
            <div style={{ background: 'var(--ink)', borderRadius: 'var(--r)', padding: '18px 16px', textAlign: 'center' }}>
              <div style={{ marginBottom: 8 }}><ITrophy /></div>
              {knockoutPicks['final'] ? (
                <>
                  <div style={{ fontSize: 36 }}>{getFlag(knockoutPicks['final'])}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, letterSpacing: '-0.03em', color: 'var(--bg)', marginTop: 6 }}>
                    {knockoutPicks['final']}
                  </div>
                </>
              ) : (
                <div style={{ color: '#8B8B90', fontSize: 13 }}>
                  Fill in the bracket<br/>to pick your champion
                </div>
              )}
            </div>

            {/* 3rd picks summary */}
            <div style={{ marginTop: 20 }}>
              <div className="label" style={{ color: 'var(--muted)', marginBottom: 8 }}>YOUR 3RD-PLACE PICKS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {thirdPicks.map(team => (
                  <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                    <span style={{ fontSize: 16 }}>{getFlag(team)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{team}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
