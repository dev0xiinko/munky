// Calendar helpers anchored to the user's timezone (Asia/Manila). Calendar
// dates (expense_date, due dates, "today") must be the LOCAL date: using UTC
// (toISOString) rolls a Manila morning back to the previous day, landing
// early-AM entries on the wrong date and, at a month edge, the wrong month.
// Timestamps (created_at/updated_at via nowISO) stay UTC on purpose — they
// order writes for last-write-wins, where an absolute instant is what you want.

const TZ = "Asia/Manila";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Year/month/day in Asia/Manila regardless of the device/runtime timezone.
// en-CA formats as YYYY-MM-DD, which doubles as our ISO calendar-date string.
function manilaParts(d = new Date()): { y: number; m: number; d: number; iso: string } {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = iso.split("-").map(Number);
  return { y, m, d: day, iso };
}

/** Today's calendar date in Asia/Manila, as YYYY-MM-DD. */
export const todayISODate = () => manilaParts().iso;

/** Current instant as a full UTC ISO timestamp (for created_at/updated_at). */
export const nowISO = () => new Date().toISOString();

/** "Jun 18" style short label from a YYYY-MM-DD string. */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}

/** "June 2026" style full label for the current month (Asia/Manila). */
export function monthLabel(d = new Date()): string {
  const { y, m } = manilaParts(d);
  return `${new Date(y, m - 1, 15).toLocaleDateString("en-US", { month: "long" })} ${y}`;
}

/** "Jul 2026" style short month label from a YYYY-MM-DD (or YYYY-MM) string. */
export function shortMonthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** Days in the current Asia/Manila month. */
export function daysInMonth(d = new Date()): number {
  const { y, m } = manilaParts(d);
  return new Date(y, m, 0).getDate();
}

/** Day-of-month (1–31) in Asia/Manila. */
export function dayOfMonth(d = new Date()): number {
  return manilaParts(d).d;
}

/** Days remaining in the current Asia/Manila month (min 1, for safe division). */
export function daysLeftInMonth(d = new Date()): number {
  return Math.max(1, daysInMonth(d) - dayOfMonth(d));
}

/** The last `n` calendar months ending with the current one (Asia/Manila),
 *  oldest-first, as { key: "YYYY-MM", label: "Jun" }. */
export function lastNMonths(n: number, d = new Date()): { key: string; label: string }[] {
  const { y, m } = manilaParts(d); // m is 1-based
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(y, m - 1 - i, 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: MONTHS[dt.getMonth()] });
  }
  return out;
}
