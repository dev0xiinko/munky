// Pure financial computations over centavos. No I/O. Mirrors §7 of CLAUDE.md
// and the logic in CashflowOS.dc.html.

import type { Client, Expense, SavingsGoal } from "@/types";

/**
 * Normalize a client's pay into a monthly-equivalent figure.
 * Biweekly = 26 pay periods/yr, weekly = 52/yr — averaged over 12 months.
 * (Using ×2 / ×4 understates annual income.)
 */
export function monthlyIncomeOf(c: Pick<Client, "salary_centavos" | "salary_frequency">): number {
  switch (c.salary_frequency) {
    case "biweekly":
      return Math.round((c.salary_centavos * 26) / 12);
    case "weekly":
      return Math.round((c.salary_centavos * 52) / 12);
    default:
      return c.salary_centavos;
  }
}

export const totalIncome = (clients: Client[]) =>
  clients.reduce((s, c) => s + monthlyIncomeOf(c), 0);

export const totalSpent = (expenses: Expense[]) =>
  expenses.reduce((s, e) => s + e.amount_centavos, 0);

export const monthlySavings = (goals: SavingsGoal[]) =>
  goals.reduce((s, g) => s + g.monthly_contribution_centavos, 0);

export const monthlyBurnRate = (spent: number, daysElapsed: number) =>
  spent / Math.max(1, daysElapsed);

export const projectedMonthEnd = (spent: number, daysElapsed: number, daysInMonth: number) =>
  monthlyBurnRate(spent, daysElapsed) * daysInMonth;

export const savingsRate = (savings: number, income: number) =>
  income > 0 ? Math.round((savings / income) * 100) : 0;

export interface AffordVerdict {
  remaining: number;
  afterExpense: number;
  safe: boolean;
  dailyBudget: number;
}

/** "Can I Afford This?" — §7. potentialExpense in centavos. */
export function canAfford(
  remaining: number,
  potentialExpense: number,
  daysLeft: number,
  buffer = 0,
): AffordVerdict {
  const afterExpense = remaining - potentialExpense;
  return {
    remaining,
    afterExpense,
    safe: afterExpense >= buffer,
    dailyBudget: afterExpense / Math.max(1, daysLeft),
  };
}
