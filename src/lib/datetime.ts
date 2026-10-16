/**
 * Every timestamp is shown in UAE time, whatever the viewer's machine is set
 * to — the business runs on Asia/Dubai (UTC+4, no daylight saving).
 */
export const UAE_TIME_ZONE = "Asia/Dubai";

const exactFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: UAE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: UAE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Voucher dates are calendar days the backend stores as UTC midnight; read
// them back in UTC so "21 Sep" never shifts to "20 Sep" or "22 Sep".
const calendarFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

// en-CA formats as YYYY-MM-DD.
const isoDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: UAE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "16 Oct 2026, 2:05 pm (UAE)" */
export function formatExactUae(value: string | Date): string {
  return `${exactFormatter.format(toDate(value))} (UAE)`;
}

/** "16 Oct 2026", as the day falls in the UAE. */
export function formatDayUae(value: string | Date): string {
  return dayFormatter.format(toDate(value));
}

/** A voucher's calendar date — "21 Sep 2026". */
export function formatCalendarDate(value: string): string {
  return calendarFormatter.format(new Date(value));
}

/** The calendar part of a voucher date, for a date input — "2026-09-21". */
export function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

/** Today's date in the UAE, as YYYY-MM-DD. */
export function uaeToday(now: Date = new Date()): string {
  return isoDayFormatter.format(now);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.345],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function formatRelative(
  value: string | Date,
  now: number = Date.now(),
): string {
  let amount = (toDate(value).getTime() - now) / 1000;
  if (Math.abs(amount) < 45) return "just now";

  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(amount) < size) {
      return relativeFormatter.format(Math.round(amount), unit);
    }
    amount /= size;
  }
  return formatDayUae(value);
}

/** YYYY-MM-DD arithmetic, done in UTC so no local offset creeps in. */
function parseIsoDay(day: string): Date {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(day: string): string {
  const date = parseIsoDay(day);
  // UAE working week starts on Monday.
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return formatIsoDay(date);
}

export function endOfWeek(day: string): string {
  const date = parseIsoDay(startOfWeek(day));
  date.setUTCDate(date.getUTCDate() + 6);
  return formatIsoDay(date);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: string): string {
  const date = parseIsoDay(startOfMonth(day));
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return formatIsoDay(date);
}

export function startOfYear(day: string): string {
  return `${day.slice(0, 4)}-01-01`;
}

export function endOfYear(day: string): string {
  return `${day.slice(0, 4)}-12-31`;
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatIsoDay(parseIsoDay(value)) === value;
}
