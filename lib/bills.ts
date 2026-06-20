// Bill classification + per-cycle paid state, derived from the bill_payments
// ledger. "Paid" is cycle-scoped: this calendar month for monthly/loan bills,
// ever for one-time bills. This makes recurring bills reset to payable each
// month automatically (a new month simply has no payment yet).

import type { Bill, BillPayment } from "@/types";

export type BillGroup = "monthly" | "loan" | "onetime";

export function billGroup(bill: Bill): BillGroup {
  if (bill.bill_type === "loan") return "loan";
  return bill.is_recurring === false ? "onetime" : "monthly";
}

/**
 * Whether a bill's billing has begun as of `todayISO`. A bill whose `start_date`
 * is in a future month is "scheduled" — it doesn't yet count toward this month's
 * totals and is never overdue. Bills without a start_date (pre-v6) are always on.
 */
export function billStarted(bill: Bill, todayISO: string): boolean {
  if (!bill.start_date) return true;
  return bill.start_date.slice(0, 7) <= todayISO.slice(0, 7);
}

export function paymentsForBill(bill: Bill, payments: BillPayment[]): BillPayment[] {
  return payments.filter((p) => p.bill_id === bill.id);
}

/** Payments that count toward the current cycle (this month, or any for one-time). */
export function cyclePayments(
  bill: Bill,
  payments: BillPayment[],
  todayISO: string,
): BillPayment[] {
  const ps = paymentsForBill(bill, payments);
  if (billGroup(bill) === "onetime") return ps;
  const monthPrefix = todayISO.slice(0, 7);
  return ps.filter((p) => p.paid_date.startsWith(monthPrefix));
}

export function isPaidThisCycle(bill: Bill, payments: BillPayment[], todayISO: string): boolean {
  return cyclePayments(bill, payments, todayISO).length > 0;
}

/** Display status for an unpaid bill, from its due day vs today. */
export function unpaidStatus(bill: Bill, dayOfMonth: number): "overdue" | "due" | "upcoming" {
  if (bill.due_day < dayOfMonth) return "overdue";
  if (bill.due_day === dayOfMonth) return "due";
  return "upcoming";
}

/** Latest paid_date for the current cycle (for the "Paid <date>" subline). */
export function lastPaidDate(
  bill: Bill,
  payments: BillPayment[],
  todayISO: string,
): string | null {
  const ps = cyclePayments(bill, payments, todayISO);
  if (!ps.length) return null;
  return ps.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0].paid_date;
}
