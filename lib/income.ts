// Pay-schedule + accrual for income sources. Income is treated as ACTUALS: it
// starts at ₱0 each month and accrues only as each scheduled payday passes.
// `salary_centavos` is the amount PER PAYCHECK; the frequency + pay day(s)
// decide when (and how many times) it lands in a month. Pure functions, no I/O.

import type { Client } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (year: number, month1: number) => new Date(year, month1, 0).getDate();
const dateStr = (year: number, month1: number, day: number) =>
  `${year}-${pad(month1)}-${pad(day)}`;

/** Scheduled pay dates (YYYY-MM-DD) for a source within year/month1 (1-based). */
export function payDatesInMonth(c: Client, year: number, month1: number): string[] {
  const dim = lastDay(year, month1);
  switch (c.salary_frequency) {
    case "semimonthly":
      // PH "kinsenas" — the 15th and the last day of the month.
      return [dateStr(year, month1, Math.min(15, dim)), dateStr(year, month1, dim)];
    case "biweekly":
      return recurringInMonth(c.start_date, year, month1, 14);
    case "weekly":
      return recurringInMonth(c.start_date, year, month1, 7);
    case "monthly":
    default: {
      const day = Math.min(Math.max(1, c.pay_day || dim), dim);
      return [dateStr(year, month1, day)];
    }
  }
}

/** Occurrences of (anchor + k·stepDays) that fall within year/month1. */
function recurringInMonth(anchor: string, year: number, month1: number, stepDays: number): string[] {
  if (!anchor) return [];
  const first = dateStr(year, month1, 1);
  const last = dateStr(year, month1, lastDay(year, month1));
  const DAY = 86_400_000;
  const step = stepDays * DAY;
  const a = new Date(anchor + "T00:00:00").getTime();
  const f = new Date(first + "T00:00:00").getTime();
  let t = a + Math.max(0, Math.ceil((f - a) / step)) * step;
  const out: string[] = [];
  for (let guard = 0; guard < 6; guard++) {
    const d = new Date(t);
    const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (s > last) break;
    if (s >= first) out.push(s);
    t += step;
  }
  return out;
}

/** Pay dates this month that have actually occurred (≥ start_date, ≤ today). */
export function accruedDates(c: Client, todayISO: string): string[] {
  const [y, m] = todayISO.split("-").map(Number);
  return payDatesInMonth(c, y, m).filter((d) => d >= c.start_date && d <= todayISO);
}

/** Centavos received so far this month from a source. */
export const accruedThisMonth = (c: Client, todayISO: string): number =>
  accruedDates(c, todayISO).length * c.salary_centavos;

/** Centavos expected across the whole current month (all paydays ≥ start_date). */
export function expectedThisMonth(c: Client, todayISO: string): number {
  const [y, m] = todayISO.split("-").map(Number);
  return payDatesInMonth(c, y, m).filter((d) => d >= c.start_date).length * c.salary_centavos;
}

/** Centavos for any month — full for past months, accrued-to-date for the
 *  current month, 0 before the source started / for future months. (Analytics.) */
export function incomeForMonth(c: Client, year: number, month1: number, todayISO: string): number {
  const key = `${year}-${pad(month1)}`;
  const cur = todayISO.slice(0, 7);
  let dates = payDatesInMonth(c, year, month1).filter((d) => d >= c.start_date);
  if (key > cur) dates = [];
  else if (key === cur) dates = dates.filter((d) => d <= todayISO);
  return dates.length * c.salary_centavos;
}

/** Next upcoming payday (YYYY-MM-DD) on/after today, scanning this + next month. */
export function nextPayday(c: Client, todayISO: string): string | null {
  const [y, m] = todayISO.split("-").map(Number);
  const months: [number, number][] = [[y, m], m === 12 ? [y + 1, 1] : [y, m + 1]];
  for (const [yy, mm] of months) {
    const up = payDatesInMonth(c, yy, mm)
      .filter((d) => d >= c.start_date && d >= todayISO)
      .sort();
    if (up.length) return up[0];
  }
  return null;
}
