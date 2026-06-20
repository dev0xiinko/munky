// Client-side browser notifications for bills due (§8). Permission is requested
// contextually (never on load). Dedupe markers live in Dexie meta so a reminder
// fires at most once per bill per due-cycle per kind.

import { billStarted } from "@/lib/bills";
import { getMeta, setMeta } from "@/lib/db";
import { formatPHP } from "@/lib/money";
import type { Bill } from "@/types";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Due date for the current billing cycle of an unpaid bill: this month's
 * occurrence of `dueDay` (clamped to month length). We deliberately do NOT roll
 * forward when the day has passed — an unpaid bill past its due day is overdue
 * for this cycle, not "due next month".
 */
export function nextDueDate(dueDay: number, today = new Date()): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = Math.min(dueDay, new Date(y, m + 1, 0).getDate());
  return new Date(y, m, day);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface Reminder {
  bill: Bill;
  kind: "ahead" | "tomorrow" | "today" | "overdue";
  dueISO: string;
  title: string;
  body: string;
  markerKey: string;
}

/** Which active, unpaid bills warrant a reminder right now. */
export function dueReminders(bills: Bill[], today = new Date()): Reminder[] {
  const out: Reminder[] = [];
  const todayISO = isoDate(today);
  for (const b of bills) {
    if (!b.active || b.deleted_at || b.status === "paid") continue;
    if (!billStarted(b, todayISO)) continue; // not yet started — no reminders
    const due = nextDueDate(b.due_day, today);
    const days = daysBetween(due, today); // >0 ahead, 0 today, <0 overdue
    const amt = formatPHP(b.amount_centavos);
    let kind: Reminder["kind"] | null = null;

    if (days < 0) kind = "overdue";
    else if (days === 0) kind = "today";
    else if (days === 1) kind = "tomorrow";
    else if (days === b.reminder_days_before) kind = "ahead";
    if (!kind) continue;

    const dueISO = isoDate(due);
    const body =
      kind === "overdue"
        ? `${b.name} (${amt}) is overdue.`
        : kind === "today"
          ? `${b.name} (${amt}) is due today.`
          : kind === "tomorrow"
            ? `${b.name} (${amt}) is due tomorrow.`
            : `${b.name} (${amt}) is due in ${days} days.`;

    out.push({
      bill: b,
      kind,
      dueISO,
      title: "Bill reminder",
      body,
      markerKey: `notif:${b.id}:${dueISO}:${kind}`,
    });
  }
  return out;
}

/** Fire any pending reminders the user hasn't seen for this cycle. */
export async function runBillReminders(bills: Bill[]): Promise<number> {
  if (permissionState() !== "granted") return 0;
  const reminders = dueReminders(bills);
  let fired = 0;
  for (const r of reminders) {
    const seen = await getMeta<boolean>(r.markerKey);
    if (seen) continue;
    try {
      new Notification(r.title, {
        body: r.body,
        tag: r.markerKey,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
      await setMeta(r.markerKey, true);
      fired++;
    } catch {
      // Notification constructor can throw inside some PWA contexts; ignore.
    }
  }
  return fired;
}
