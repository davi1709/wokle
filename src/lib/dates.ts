/**
 * Date handling. EVERYTHING that decides "which day is it?" goes through this
 * file so that all users see the same session, whatever their own timezone is.
 *
 * A "date key" is a plain string `YYYY-MM-DD` in the publication timezone.
 * Never compare Date objects for game logic — compare date keys.
 */

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export const DEFAULT_LAUNCH_DATE = "2026-11-04";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** The calendar date at `now` in `timeZone`, as YYYY-MM-DD. */
export function dateKeyInZone(now: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  // The "en-CA" locale formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days between two date keys (b - a). Timezone-free (pure UTC maths). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** WOKLE #n — the launch day is #1. Never below 1. */
export function sessionNumber(
  dateKey: string,
  launchDate: string = DEFAULT_LAUNCH_DATE,
): number {
  return Math.max(1, daysBetween(launchDate, dateKey) + 1);
}

/** Human friendly, e.g. "Wednesday, 4 November 2026". Locale-aware. */
export function formatDateLong(dateKey: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

/** Milliseconds until the next local midnight in `timeZone`. */
export function msUntilNextDay(now: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  const today = dateKeyInZone(now, timeZone);
  const tomorrow = addDays(today, 1);
  // Find the instant at which the zone's date flips to `tomorrow` by bisection
  // (robust against DST without needing a timezone library).
  let lo = now.getTime();
  let hi = lo + 26 * 3_600_000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (dateKeyInZone(new Date(mid), timeZone) === tomorrow) hi = mid;
    else lo = mid;
  }
  return hi - now.getTime();
}
