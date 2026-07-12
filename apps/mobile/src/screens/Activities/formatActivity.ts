const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const pad = (value: number): string => String(value).padStart(2, '0');

export const formatActivityDistance = (meters: number | null): string => {
  if (meters == null) return '—';
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
};

export const formatActivityDuration = (seconds: number | null): string => {
  if (seconds == null) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${pad(minutes)}min` : `${minutes}min`;
};

export const formatActivityPace = (secondsPerKm: number | null): string => {
  if (secondsPerKm == null) return '—';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${pad(seconds)} /km`;
};

export const formatActivityDate = (iso: string | null): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
