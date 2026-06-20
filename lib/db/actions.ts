import { db } from "./index";
import { mutate, softDelete } from "@/lib/sync/queue";
import { cyclePayments, isPaidThisCycle } from "@/lib/bills";
import { CATEGORIES } from "@/lib/constants";
import { nowISO, todayISODate } from "@/lib/dates";
import { toCentavos } from "@/lib/money";
import { getUserId } from "@/stores/session";
import type {
  Bill,
  BillPayment,
  BillType,
  Budget,
  Client,
  Expense,
  IncomeTransaction,
  SalaryFrequency,
  SavingsContribution,
  SavingsGoal,
} from "@/types";

const base = () => {
  const t = nowISO();
  return {
    id: crypto.randomUUID(),
    user_id: getUserId(),
    created_at: t,
    updated_at: t,
    deleted_at: null as string | null,
  };
};

/** Quick-add an expense. `peso` is the decimal pesos entered on the keypad. */
export async function addExpense(peso: number, categoryKey: string, description: string) {
  if (peso <= 0) return;
  const meta = CATEGORIES.find((c) => c.key === categoryKey) ?? CATEGORIES[0];
  const expense: Expense = {
    ...base(),
    category_key: categoryKey,
    amount_centavos: toCentavos(peso),
    description: description.trim() || meta.name,
    expense_date: todayISODate(),
  };
  await mutate("expenses", "create", expense);
}

/** Soft-delete an expense. */
export async function deleteExpense(expense: Expense) {
  await softDelete("expenses", expense);
}

/**
 * Toggle whether a bill is paid for the CURRENT cycle (this month for
 * monthly/loan bills, ever for one-time). Marking paid records a bill_payment;
 * un-marking soft-deletes this cycle's payment(s). Recurring bills therefore
 * reset to payable each new month automatically.
 */
export async function toggleBill(bill: Bill, payments: BillPayment[]) {
  const today = todayISODate();
  const paidNow = isPaidThisCycle(bill, payments, today);

  if (!paidNow) {
    const payment: BillPayment = {
      ...base(),
      bill_id: bill.id,
      amount_centavos: bill.amount_centavos,
      paid_date: today,
      notes: "",
    };
    await mutate("bill_payments", "create", payment);
    await mutate("bills", "update", { ...bill, status: "paid" });
  } else {
    for (const p of cyclePayments(bill, payments, today)) {
      await softDelete("bill_payments", p);
    }
    await mutate("bills", "update", { ...bill, status: bill.base_status });
  }
}

/** Record income actually received from a client. */
export async function recordIncome(
  client: Client,
  peso: number,
  receivedDate = todayISODate(),
  notes = "",
) {
  if (peso <= 0) return;
  const tx: IncomeTransaction = {
    ...base(),
    client_id: client.id,
    amount_centavos: toCentavos(peso),
    received_date: receivedDate,
    notes,
  };
  await mutate("income_transactions", "create", tx);
}

/** Soft-delete an income transaction. */
export async function deleteIncome(tx: IncomeTransaction) {
  await softDelete("income_transactions", tx);
}

/**
 * Contribute one monthly increment toward a goal (capped at target) and record
 * a dated contribution so the dashboard can deduct what was actually set aside
 * this month. No-ops once the goal is reached.
 */
export async function contributeGoal(goal: SavingsGoal) {
  const next = Math.min(
    goal.target_centavos,
    goal.current_centavos + goal.monthly_contribution_centavos,
  );
  const delta = next - goal.current_centavos;
  if (delta <= 0) return;

  await mutate("savings_goals", "update", { ...goal, current_centavos: next });
  const contribution: SavingsContribution = {
    ...base(),
    goal_id: goal.id,
    amount_centavos: delta,
    contributed_date: todayISODate(),
    notes: "",
  };
  await mutate("savings_contributions", "create", contribution);
}

interface AddBillOptions {
  reminderDaysBefore?: number;
  isRecurring?: boolean;
  billType?: BillType;
  termMonths?: number | null;
  /** YYYY-MM-DD; the month the bill's billing begins. Defaults to this month. */
  startDate?: string;
}

/** Create a bill. `peso` is decimal pesos (the monthly installment for loans). */
export async function addBill(
  name: string,
  peso: number,
  dueDay: number,
  opts: AddBillOptions = {},
) {
  if (!name.trim() || peso <= 0) return;
  const {
    reminderDaysBefore = 3,
    isRecurring = true,
    billType = "regular",
    termMonths = null,
    startDate = todayISODate(),
  } = opts;
  const isLoan = billType === "loan";
  const bill: Bill = {
    ...base(),
    name: name.trim(),
    amount_centavos: toCentavos(peso),
    due_day: Math.min(31, Math.max(1, Math.round(dueDay) || 1)),
    start_date: startDate,
    // Loans recur monthly until their term is paid off.
    is_recurring: isLoan ? true : isRecurring,
    bill_type: billType,
    term_months: isLoan ? Math.max(1, Math.round(termMonths ?? 1)) : null,
    reminder_days_before: Math.max(0, Math.round(reminderDaysBefore) || 0),
    active: true,
    status: "upcoming",
    base_status: "upcoming",
  };
  await mutate("bills", "create", bill);
}

/** Soft-delete a bill. */
export async function deleteBill(bill: Bill) {
  await softDelete("bills", bill);
}

/** Create a savings goal. Amounts are decimal pesos. */
export async function addGoal(
  name: string,
  targetPeso: number,
  monthlyPeso: number,
  currentPeso = 0,
) {
  if (!name.trim() || targetPeso <= 0) return;
  const goal: SavingsGoal = {
    ...base(),
    name: name.trim(),
    target_centavos: toCentavos(targetPeso),
    monthly_contribution_centavos: toCentavos(Math.max(0, monthlyPeso)),
    current_centavos: toCentavos(Math.max(0, currentPeso)),
  };
  await mutate("savings_goals", "create", goal);
}

/** Soft-delete a savings goal. */
export async function deleteGoal(goal: SavingsGoal) {
  await softDelete("savings_goals", goal);
}

/** Update the monthly budget limit and per-category limits. Amounts in pesos. */
export async function updateBudget(
  budget: Budget,
  monthlyPeso: number,
  categoryLimits: { key: string; peso: number }[],
) {
  await mutate("budgets", "update", {
    ...budget,
    monthly_limit_centavos: toCentavos(Math.max(0, monthlyPeso)),
    category_limits: categoryLimits.map((c) => ({
      key: c.key,
      limit_centavos: toCentavos(Math.max(0, c.peso)),
    })),
  });
}

/** Add an income source. `peso` is decimal pesos. */
export async function addClient(name: string, peso: number, freq: SalaryFrequency) {
  if (!name.trim() || peso <= 0) return;
  const client: Client = {
    ...base(),
    name: name.trim(),
    salary_centavos: toCentavos(peso),
    salary_frequency: freq,
    next_pay_date: todayISODate(),
    notes: "",
  };
  await mutate("clients", "create", client);
}

/** Edit an income source. `peso` is decimal pesos. */
export async function updateClient(
  client: Client,
  name: string,
  peso: number,
  freq: SalaryFrequency,
) {
  if (!name.trim() || peso <= 0) return;
  await mutate("clients", "update", {
    ...client,
    name: name.trim(),
    salary_centavos: toCentavos(peso),
    salary_frequency: freq,
  });
}

/** Soft-delete an income source. */
export async function deleteClient(client: Client) {
  await softDelete("clients", client);
}

/** Convenience: live array of a table, filtered to non-deleted rows. */
export const active = <T extends { deleted_at: string | null }>(rows: T[] | undefined): T[] =>
  (rows ?? []).filter((r) => r.deleted_at == null);

export { db };
