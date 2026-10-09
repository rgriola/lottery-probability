import type { DrawSchedule } from '../types/lottery';

export interface NextDrawInfo {
  /** The next upcoming scheduled draw instant (strictly after `now`). */
  nextDraw: Date;
  /** The most recently scheduled draw instant that has already happened (at or before `now`). */
  lastScheduledDraw: Date;
}

/** Breaks a Date into its Eastern Time wall-clock components. */
function getEasternParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Midnight is sometimes formatted as "24" instead of "00" with hour12: false.
    hour: Number(parts.hour) % 24,
  };
}

/** Eastern Time's current UTC offset in minutes (negative; handles EST/EDT automatically). */
function getEasternOffsetMinutes(date: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  });
  const raw = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const match = raw.match(/GMT([+-]\d+)(?::(\d+))?/);
  const hours = match ? Number(match[1]) : -5;
  const minutes = match?.[2] ? Number(match[2]) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

/** Converts an Eastern Time wall-clock date+time into the matching UTC instant. */
function easternToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMinutes = getEasternOffsetMinutes(new Date(guessMs));
  return new Date(guessMs - offsetMinutes * 60000);
}

/**
 * Finds the next upcoming scheduled draw and the most recent one that should
 * have already happened, based on a game's weekly Eastern Time schedule.
 */
export function getNextDrawInfo(schedule: DrawSchedule, now: Date = new Date()): NextDrawInfo {
  const et = getEasternParts(now);
  const todayUtcMidnight = Date.UTC(et.year, et.month - 1, et.day);
  const todayWeekday = new Date(todayUtcMidnight).getUTCDay();

  // Build every scheduled draw instant from a few days before today through
  // the next week, which is always enough to find both neighbors of `now`.
  const candidates: Date[] = [];
  for (let offset = -8; offset <= 8; offset++) {
    const weekday = (((todayWeekday + offset) % 7) + 7) % 7;
    if (!schedule.days.includes(weekday)) continue;
    const dayMs = todayUtcMidnight + offset * 86400000;
    const d = new Date(dayMs);
    candidates.push(
      easternToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), schedule.hourET, schedule.minuteET),
    );
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());

  const nowMs = now.getTime();
  const nextDraw = candidates.find((d) => d.getTime() > nowMs);
  const lastScheduledDraw = [...candidates].reverse().find((d) => d.getTime() <= nowMs);

  if (!nextDraw || !lastScheduledDraw) {
    // Should be unreachable given the wide candidate window, but keeps the
    // return type non-nullable without an awkward caller-side check.
    throw new Error('Unable to compute draw schedule window.');
  }

  return { nextDraw, lastScheduledDraw };
}

/** Formats a Date as its Eastern Time calendar date in YYYY-MM-DD form, for comparing against cached draw dates. */
export function toEasternDateString(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Formats a millisecond duration as "Dd HH:MM:SS" (omitting the day part when under 24h). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
