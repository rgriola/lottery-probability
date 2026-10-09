const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats an ISO calendar date string ("YYYY-MM-DD") as "Mon D, YYYY" (e.g.
 * "Oct 9, 2026"). Parses the parts directly rather than through `Date`,
 * since these strings represent calendar days (not exact instants) -
 * routing them through `new Date(...)` risks shifting the displayed day
 * depending on the browser's local timezone.
 */
export function formatIsoDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  const monthName = MONTH_NAMES[Number(month) - 1];
  return monthName ? `${monthName} ${Number(day)}, ${year}` : isoDate;
}

/**
 * Formats a Date instant as its US Eastern Time calendar date, in the same
 * "Mon D, YYYY" style, for instants (like a scheduled draw time) where the
 * Eastern Time calendar day is what matters.
 */
export function formatEasternDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
