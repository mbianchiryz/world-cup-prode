export const TIMEZONES = [
  { id: 'UTC',  label: 'UTC',         tz: 'UTC' },
  { id: 'AR',   label: '🇦🇷 Argentina', tz: 'America/Argentina/Buenos_Aires' },
  { id: 'LA',   label: '🇺🇸 Los Angeles', tz: 'America/Los_Angeles' },
  { id: 'BR',   label: '🇧🇷 Brazil',    tz: 'America/Sao_Paulo' },
];

export const DEFAULT_TZ = 'UTC';
export const LS_KEY = 'prode_tz';

export function formatMatchTime(iso, tz = 'UTC') {
  const d = new Date(iso);
  const base = d.toLocaleString('en-US', {
    weekday: 'short', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: tz,
  });
  // Get short timezone name (e.g. "UTC", "ART", "PDT", "BRT")
  const tzName = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')?.value || tz;
  return `${base} ${tzName}`;
}
