/**
 * Parses an event date string that may be:
 *   - A datetime-local value:  "2026-03-08T22:00"   (no timezone, no seconds)
 *   - Full ISO 8601:           "2026-03-08T22:00:00Z"
 *   - A locale string:        "03/08/2026, 10:00 p.m."
 *
 * datetime-local strings have no timezone suffix. new Date() behaviour for
 * these is environment-dependent:
 *   • Safari:   "YYYY-MM-DDTHH:mm" (no seconds) → Invalid Date
 *   • Node/SSR: treated as UTC, not local time
 *
 * Fix: if the string has a time component but no timezone, append the
 * browser's local UTC offset so the string is always parsed as local time,
 * consistently across every environment.
 */
function parseDate(eventDate: string): Date {
  if (!eventDate) return new Date(NaN);

  const hasTimezone = /Z|[+-]\d{2}:\d{2}$/.test(eventDate);
  const hasTime = /T\d{2}:\d{2}/.test(eventDate);

  let toParse = eventDate;
  if (hasTime && !hasTimezone) {
    // Append local UTC offset: getTimezoneOffset() is positive for zones
    // behind UTC (e.g. UTC-5 → 300) and negative for zones ahead (UTC+5 → -300).
    const off = new Date().getTimezoneOffset();
    const absOff = Math.abs(off);
    const sign = off <= 0 ? '+' : '-';
    const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
    const mm = String(absOff % 60).padStart(2, '0');
    toParse = `${eventDate}${sign}${hh}:${mm}`;
  }

  const direct = new Date(toParse);
  if (!isNaN(direct.getTime())) return direct;

  // Slow path: locale strings like "03/08/2026, 10:00 p.m."
  const normalized = eventDate
    .replace(/\bp\.m\./gi, 'PM')
    .replace(/\ba\.m\./gi, 'AM');
  return new Date(normalized);
}

export function getEventStatus(eventDate: string): 'upcoming' | 'live' | 'ended' {
  const now = new Date();
  const date = parseDate(eventDate);

  console.log('Input date:', eventDate);
  console.log('Parsed:', isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString());
  console.log('Now:', now.toISOString());
  console.log('Hours diff:', (date.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (isNaN(date.getTime())) {
    console.warn('[getEventStatus] Unparseable date — defaulting to "upcoming":', eventDate);
    return 'upcoming';
  }

  const hoursBefore = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursAfter  = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (hoursBefore > 0) return 'upcoming';
  if (hoursAfter <= 24) return 'live';
  return 'ended';
}

export function eventExpiresAt(eventDate: string): Date {
  const date = new Date(eventDate)
  const expiry = new Date(date)
  expiry.setDate(expiry.getDate() + 30)
  return expiry
}

export function secondsUntilExpiry(expiryDate: Date): number {
  const ms = expiryDate.getTime();
  if (!isFinite(ms)) return 86400;
  return Math.max(Math.floor((ms - Date.now()) / 1000), 86400);
}

export function formatExpiryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
