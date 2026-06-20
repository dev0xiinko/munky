import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import { useSyncStore } from "@/stores/sync";
import type { SyncAction, SyncQueueEntry } from "@/types";

// Tables that participate in sync (everything except sync_queue itself).
export type SyncTable =
  | "clients"
  | "expenses"
  | "expense_categories"
  | "bills"
  | "bill_payments"
  | "income_transactions"
  | "savings_contributions"
  | "savings_goals"
  | "budgets";

interface Row {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * The single write path (§6). Writes to Dexie first (instant UI), then enqueues
 * a background sync action. Never write to a syncable table without going
 * through here.
 */
export async function mutate<T extends Row>(
  table: SyncTable,
  action: SyncAction,
  row: T,
): Promise<T> {
  const next = { ...row, updated_at: nowISO() };
  // @ts-expect-error indexed table access by name
  await db[table].put(next);
  await enqueue(action, table, next);
  return next;
}

/** Soft delete (§3): set deleted_at and enqueue a delete that travels as an update. */
export async function softDelete<T extends Row>(table: SyncTable, row: T): Promise<void> {
  const next = { ...row, deleted_at: nowISO(), updated_at: nowISO() };
  // @ts-expect-error indexed table access by name
  await db[table].put(next);
  await enqueue("delete", table, next);
}

async function enqueue(action: SyncAction, table: string, payload: unknown): Promise<void> {
  const entry: SyncQueueEntry = {
    id: crypto.randomUUID(),
    action,
    table,
    record_id: (payload as Row).id,
    payload,
    synced: 0,
    attempts: 0,
    created_at: nowISO(),
  };
  await db.sync_queue.add(entry);
  const pending = await db.sync_queue.where("synced").equals(0).count();
  useSyncStore.getState().set({ pending });
}
