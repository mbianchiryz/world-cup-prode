import { useEffect, useState } from 'react';
import { getAdminStats } from '@/lib/supabase-db';
import { getFlag } from '@/lib/matches-data';

function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1.5px solid var(--line)',
      borderRadius: 'var(--r)', padding: '18px 20px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 42, letterSpacing: '-0.04em', color: color || 'var(--ink)', lineHeight: 1 }}>
        {value}
      </div>
      <div className="label" style={{ color: 'var(--muted)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function Admin() {
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(e => setError(e.message || 'Unauthorized'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200,
        fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--muted)' }}>
        LOADING…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200,
        color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        🔒 {error}
      </div>
    );
  }

  const totalUsers      = stats.length;
  const activePickers   = stats.filter(s => s.prediction_count > 0).length;
  const bracketCount    = stats.filter(s => s.has_bracket).length;
  const lockedBrackets  = stats.filter(s => s.bracket_locked).length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 28 }}>
        <div className="label" style={{ color: 'var(--muted)', marginBottom: 6 }}>
          ADMIN MODE · RYZ LABS POOL
        </div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0 }}>
          Participation
        </h2>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard value={totalUsers}     label="TOTAL PLAYERS"      color="var(--ink)" />
        <StatCard value={activePickers}  label="ACTIVE IN PRODE"    color="var(--green)" />
        <StatCard value={bracketCount}   label="BRACKET STARTED"    color="var(--blue)" />
        <StatCard value={lockedBrackets} label="BRACKET LOCKED"      color="var(--yellow)" />
      </div>

      {/* Player table */}
      <div style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 180px 100px 140px 110px 140px',
          gap: 8, padding: '10px 16px',
          background: 'var(--ink)', color: 'var(--bg)',
        }} className="label">
          <div>PLAYER</div>
          <div style={{ textAlign: 'center' }}>EMAIL</div>
          <div style={{ textAlign: 'center' }}>PICKS</div>
          <div style={{ textAlign: 'center' }}>BRACKET</div>
          <div style={{ textAlign: 'center' }}>LOCKED</div>
          <div style={{ textAlign: 'center' }}>LAST LOGIN</div>
        </div>

        {stats.map(s => {
          const hasPicks     = s.prediction_count > 0;
          const bracketColor = s.bracket_locked ? 'var(--green)' : s.has_bracket ? 'var(--blue)' : 'var(--muted)';
          const bracketLabel = s.bracket_locked ? 'Locked ✓' : s.has_bracket ? 'In progress' : '–';
          const lastLogin    = s.last_login
            ? new Date(s.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
            : '–';
          const loginRecent  = s.last_login && (Date.now() - new Date(s.last_login).getTime()) < 24 * 3600_000;

          return (
            <div key={s.user_id} className="row-hover" style={{
              display: 'grid', gridTemplateColumns: '1fr 180px 100px 140px 110px 140px',
              gap: 8, padding: '12px 16px', alignItems: 'center',
              borderBottom: '1px solid var(--line)',
            }}>
              {/* Name */}
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name || '–'}</div>

              {/* Email */}
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.email}
              </div>

              {/* Prediction count */}
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
                  color: hasPicks ? 'var(--green)' : 'var(--muted)',
                }}>
                  {hasPicks ? `${s.prediction_count} picks` : '–'}
                </span>
              </div>

              {/* Bracket status */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: bracketColor }}>
                  {bracketLabel}
                </span>
              </div>

              {/* Lock status */}
              <div style={{ textAlign: 'center' }}>
                {s.bracket_locked ? (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>🔒 Yes</span>
                ) : (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>–</span>
                )}
              </div>

              {/* Last login */}
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: loginRecent ? 'var(--green)' : 'var(--muted)',
                  fontWeight: loginRecent ? 700 : 400,
                }}>
                  {lastLogin}
                </span>
              </div>
            </div>
          );
        })}

        {stats.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No players yet.
          </div>
        )}
      </div>
    </div>
  );
}
