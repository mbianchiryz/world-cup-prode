/**
 * Flag — renders a team flag as an image (flagcdn.com).
 * Works on Windows, Mac and mobile unlike emoji flags.
 * Falls back to emoji for unknown teams.
 */
import { getFlagUrl, getFlag } from '@/lib/matches-data';

export default function Flag({ team, size = 24 }) {
  const url = getFlagUrl(team);
  if (!url) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{getFlag(team)}</span>;
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
