import { db } from "./index";
import { CATEGORIES, CATEGORY_BUDGETS } from "@/lib/constants";
import { nowISO } from "@/lib/dates";
import { toCentavos } from "@/lib/money";
import { getUserId } from "@/stores/session";
import type {
  Bill,
  BillPayment,
  Budget,
  Client,
  Expense,
  ExpenseCategory,
  SavingsGoal,
} from "@/types";

const stamp = () => {
  const t = nowISO();
  return { user_id: getUserId(), created_at: t, updated_at: t, deleted_at: null };
};

// Raw seed (peso amounts) ported from CashflowOS.dc.html.
const EXPENSES: [string, number, string, string, string][] = [
  ["e1", 2340, "food", "Landers grocery run", "2026-06-17"],
  ["e2", 480, "transport", "Grab — client meeting", "2026-06-17"],
  ["e3", 185, "coffee", "Tim Hortons", "2026-06-16"],
  ["e4", 1200, "software", "Figma — annual", "2026-06-15"],
  ["e5", 860, "food", "Ramen Nagi", "2026-06-14"],
  ["e6", 1500, "shopping", "Uniqlo basics", "2026-06-13"],
  ["e7", 6800, "shopping", "AirPods Pro", "2026-06-12"],
  ["e8", 320, "coffee", "Local roastery", "2026-06-11"],
  ["e9", 2890, "health", "Mercury Drug + checkup", "2026-06-10"],
  ["e10", 540, "ent", "Netflix + movie night", "2026-06-09"],
  ["e11", 3200, "food", "Weekly market", "2026-06-07"],
  ["e12", 1290, "transport", "Grab — week", "2026-06-05"],
  ["e13", 990, "software", "ChatGPT + iCloud", "2026-06-04"],
  ["e14", 1750, "food", "Dinner w/ client", "2026-06-03"],
];

const BILLS: [string, string, number, number, Bill["status"], Bill["base_status"]][] = [
  ["b1", "Rent", 18000, 5, "paid", "upcoming"],
  ["b2", "Maynilad — Water", 640, 18, "due", "due"],
  ["b3", "Credit Card", 4500, 16, "overdue", "overdue"],
  ["b4", "Meralco — Electricity", 3200, 20, "upcoming", "upcoming"],
  ["b5", "PLDT — Fiber", 1699, 22, "upcoming", "upcoming"],
  ["b6", "Globe — Postpaid", 999, 15, "paid", "upcoming"],
  ["b7", "Health Insurance", 2500, 28, "upcoming", "upcoming"],
  ["b8", "Spotify + iCloud", 194, 12, "paid", "upcoming"],
];

const CLIENTS: [string, string, number, Client["salary_frequency"], string][] = [
  ["c1", "Meridian Studio", 42000, "monthly", "2026-06-30"],
  ["c2", "Aki Tan — Retainer", 16000, "monthly", "2026-06-25"],
  ["c3", "Brightleaf Co.", 10500, "biweekly", "2026-06-20"],
  ["c4", "Nomad Apps", 18500, "monthly", "2026-07-05"],
];

const GOALS: [string, string, number, number, number][] = [
  ["g1", "Emergency Fund", 62000, 150000, 8000],
  ["g2", "New MacBook Pro", 48000, 90000, 6000],
  ["g3", "Japan Trip 2027", 15500, 120000, 5000],
];

/**
 * First-login defaults (§Phase 0): default expense categories + an empty budget
 * row, scoped to the current user. No demo clients/expenses/bills. Idempotent.
 */
export async function seedDefaultsIfEmpty(): Promise<void> {
  const haveCats = await db.expense_categories.count();
  if (haveCats > 0) return;

  const categories: ExpenseCategory[] = CATEGORIES.map((c) => ({
    id: crypto.randomUUID(),
    key: c.key,
    name: c.name,
    code: c.code,
    icon: c.icon,
    ...stamp(),
  }));
  const budget: Budget = {
    id: crypto.randomUUID(),
    monthly_limit_centavos: toCentavos(35000),
    category_limits: Object.entries(CATEGORY_BUDGETS).map(([key, peso]) => ({
      key,
      limit_centavos: toCentavos(peso),
    })),
    ...stamp(),
  };
  await db.transaction("rw", [db.expense_categories, db.budgets], async () => {
    await db.expense_categories.bulkAdd(categories);
    await db.budgets.add(budget);
  });
}

/** Full demo seed (preview/local mode). Idempotent: skips if data exists. */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.clients.count();
  if (existing > 0) return;

  const categories: ExpenseCategory[] = CATEGORIES.map((c) => ({
    id: crypto.randomUUID(),
    key: c.key,
    name: c.name,
    code: c.code,
    icon: c.icon,
    ...stamp(),
  }));

  const expenses: Expense[] = EXPENSES.map(([, amt, cat, desc, date]) => ({
    id: crypto.randomUUID(),
    category_key: cat,
    amount_centavos: toCentavos(amt),
    description: desc,
    expense_date: date,
    ...stamp(),
  }));

  const bills: Bill[] = BILLS.map(([, name, amt, due, status, base]) => ({
    id: crypto.randomUUID(),
    name,
    amount_centavos: toCentavos(amt),
    due_day: due,
    start_date: nowISO().slice(0, 7) + "-01",
    is_recurring: true,
    bill_type: "regular",
    term_months: null,
    reminder_days_before: 3,
    active: true,
    status,
    base_status: base,
    ...stamp(),
  }));

  const clients: Client[] = CLIENTS.map(([, name, amt, freq, next]) => ({
    id: crypto.randomUUID(),
    name,
    salary_centavos: toCentavos(amt),
    salary_frequency: freq,
    next_pay_date: next,
    notes: "",
    ...stamp(),
  }));

  const goals: SavingsGoal[] = GOALS.map(([, name, current, target, monthly]) => ({
    id: crypto.randomUUID(),
    name,
    current_centavos: toCentavos(current),
    target_centavos: toCentavos(target),
    monthly_contribution_centavos: toCentavos(monthly),
    ...stamp(),
  }));

  // Pre-paid seed bills carry a payment row this month so they read as paid via
  // the ledger (the per-cycle source of truth).
  const monthPrefix = nowISO().slice(0, 7);
  const billPayments: BillPayment[] = bills
    .filter((b) => b.status === "paid")
    .map((b) => ({
      id: crypto.randomUUID(),
      bill_id: b.id,
      amount_centavos: b.amount_centavos,
      paid_date: `${monthPrefix}-${String(Math.min(b.due_day, 28)).padStart(2, "0")}`,
      notes: "",
      ...stamp(),
    }));

  const budget: Budget = {
    id: crypto.randomUUID(),
    monthly_limit_centavos: toCentavos(35000),
    category_limits: Object.entries(CATEGORY_BUDGETS).map(([key, peso]) => ({
      key,
      limit_centavos: toCentavos(peso),
    })),
    ...stamp(),
  };

  await db.transaction(
    "rw",
    [
      db.clients,
      db.expenses,
      db.expense_categories,
      db.bills,
      db.bill_payments,
      db.savings_goals,
      db.budgets,
    ],
    async () => {
      await db.expense_categories.bulkAdd(categories);
      await db.expenses.bulkAdd(expenses);
      await db.bills.bulkAdd(bills);
      await db.bill_payments.bulkAdd(billPayments);
      await db.clients.bulkAdd(clients);
      await db.savings_goals.bulkAdd(goals);
      await db.budgets.add(budget);
    },
  );
}
