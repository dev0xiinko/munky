"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { active } from "@/lib/db/actions";
import type {
  Bill,
  BillPayment,
  Budget,
  Client,
  Expense,
  IncomeTransaction,
  SavingsContribution,
  SavingsGoal,
} from "@/types";

// Live reads straight from Dexie (the UI's source of truth). useLiveQuery
// re-renders automatically on any local mutation, so we don't need TanStack
// invalidation for the local-first read path.

export const useExpenses = (): Expense[] =>
  active<Expense>(useLiveQuery(() => db.expenses.toArray()));

export const useBills = (): Bill[] =>
  active<Bill>(useLiveQuery(() => db.bills.toArray()));

export const useClients = (): Client[] =>
  active<Client>(useLiveQuery(() => db.clients.toArray()));

export const useGoals = (): SavingsGoal[] =>
  active<SavingsGoal>(useLiveQuery(() => db.savings_goals.toArray()));

export const useBudget = (): Budget | undefined =>
  useLiveQuery(() => db.budgets.toArray().then((b) => b[0]));

export const useIncomeTransactions = (): IncomeTransaction[] =>
  active<IncomeTransaction>(useLiveQuery(() => db.income_transactions.toArray()));

export const useBillPayments = (): BillPayment[] =>
  active<BillPayment>(useLiveQuery(() => db.bill_payments.toArray()));

export const useSavingsContributions = (): SavingsContribution[] =>
  active<SavingsContribution>(useLiveQuery(() => db.savings_contributions.toArray()));
