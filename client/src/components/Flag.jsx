/**
 * Flag — renders a team flag.
 * - Mac / iOS / Android: emoji flags (crisp native look)
 * - Windows: flagcdn.com images (Windows doesn't render flag emoji)
 */
import { getFlagUrl, getFlag } from '@/lib/matches-data';

// Detect Windows once at module load
const IS_WINDOWS =
  typeof navigator !== 'undefined' &&
  (/Windows/.test(navigator.userAgent) || navigator.platform?.startsWith('Win'));

export default function Flag({ team, size = 24 }) {
  if (!IS_WINDOWS) {
    // Mac / mobile: native emoji
    return (
      <span style={{ fontSize: size, lineHeight: 1, display: 'inline-block', flexShrink: 0 }}>
        {getFlag(team)}
      </span>
    );
  }

  // Windows: image from flagcdn.com
  const url = getFlagUrl(team);
  if (!url) {
    return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-block', flexShrink: 0 }}>{getFlag(team)}</span>;
  }
  return (
    <img
      src={url}
      alt={team}
      style={{
        width: Math.round(size * 1.33),
        height: size,
        objectFit: 'cover',
        borderRadius: 2,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
      loading="lazy"
    />
  );
}
