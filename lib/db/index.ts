import Dexie, { type EntityTable } from "dexie";
import type {
  Bill,
  BillPayment,
  Budget,
  Client,
  Expense,
  ExpenseCategory,
  IncomeTransaction,
  SavingsContribution,
  SavingsGoal,
  SyncQueueEntry,
} from "@/types";

// The local IndexedDB database. This is the UI's source of truth — every read
// and write goes here first; Supabase sync is a background concern.
export class CashflowDB extends Dexie {
  clients!: EntityTable<Client, "id">;
  expenses!: EntityTable<Expense, "id">;
  expense_categories!: EntityTable<ExpenseCategory, "id">;
  bills!: EntityTable<Bill, "id">;
  bill_payments!: EntityTable<BillPayment, "id">;
  income_transactions!: EntityTable<IncomeTransaction, "id">;
  savings_contributions!: EntityTable<SavingsContribution, "id">;
  savings_goals!: EntityTable<SavingsGoal, "id">;
  budgets!: EntityTable<Budget, "id">;
  sync_queue!: EntityTable<SyncQueueEntry, "id">;
  meta!: EntityTable<{ key: string; value: unknown }, "key">;

  constructor() {
    super("cashflowos");
    this.version(1).stores({
      clients: "id, deleted_at, updated_at",
      expenses: "id, category_key, expense_date, deleted_at, updated_at",
      expense_categories: "id, key, deleted_at",
      bills: "id, status, due_day, deleted_at, updated_at",
      savings_goals: "id, deleted_at, updated_at",
      budgets: "id, updated_at",
      sync_queue: "id, synced, created_at",
    });
    // v2: key/value meta store (e.g. lastPulledAt per table).
    this.version(2).stores({
      meta: "key",
    });
    // v3: income + bill payment ledgers.
    this.version(3).stores({
      income_transactions: "id, client_id, received_date, deleted_at, updated_at",
      bill_payments: "id, bill_id, paid_date, deleted_at, updated_at",
    });
    // v4: backfill bill_type/term_months on existing bills (no index change).
    this.version(4)
      .stores({ bills: "id, status, due_day, deleted_at, updated_at" })
      .upgrade(async (tx) => {
        await tx
          .table("bills")
          .toCollection()
          .modify((b: Partial<Bill>) => {
            if (b.bill_type == null) b.bill_type = "regular";
            if (b.term_months === undefined) b.term_months = null;
          });
      });
    // v5: savings contribution ledger.
    this.version(5).stores({
      savings_contributions: "id, goal_id, contributed_date, deleted_at, updated_at",
    });
    // v6: bills gain a start_date (the month billing begins). Backfill existing
    // bills to their creation month so they remain active from when they existed.
    this.version(6).upgrade(async (tx) => {
      await tx
        .table("bills")
        .toCollection()
        .modify((b: Partial<Bill>) => {
          if (!b.start_date) b.start_date = (b.created_at ?? "").slice(0, 10) || "2000-01-01";
        });
    });
    // v7: income sources gain a pay schedule (pay_day + start_date) so income
    // accrues on paydays. Backfill existing sources active from their creation
    // month; default the monthly pay day to 30 (end-of-month).
    this.version(7).upgrade(async (tx) => {
      await tx
        .table("clients")
        .toCollection()
        .modify((c: Partial<Client>) => {
          if (c.pay_day == null) c.pay_day = 30;
          if (!c.start_date) c.start_date = ((c.created_at ?? "").slice(0, 7) || "2000-01") + "-01";
        });
    });
  }
}

/** Read a meta value by key. */
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

/** Write a meta value. */
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export const db = new CashflowDB();
