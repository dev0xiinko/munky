import { db } from "./index";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/stores/session";
import { useSyncStore } from "@/stores/sync";

const TABLES = [
  "clients",
  "expenses",
  "expense_categories",
  "bills",
  "bill_payments",
  "income_transactions",
  "savings_contributions",
  "savings_goals",
  "budgets",
] as const;

/**
 * Wipe ALL data. When signed in, deletes the user's cloud rows first (RLS scopes
 * the delete to this user), then clears every local table including the sync
 * queue and pull cursors so nothing repopulates. The caller should reload the
 * app afterward to re-seed a clean slate.
 */
export async function resetAllData(): Promise<void> {
  const supabase = getSupabase();
  const userId = useSession.getState().userId;

  if (supabase && userId) {
    for (const t of TABLES) {
      // eslint-disable-next-line no-await-in-loop
      await supabase.from(t).delete().eq("user_id", userId);
    }
  }

  await Promise.all([
    db.clients.clear(),
    db.expenses.clear(),
    db.expense_categories.clear(),
    db.bills.clear(),
    db.bill_payments.clear(),
    db.income_transactions.clear(),
    db.savings_contributions.clear(),
    db.savings_goals.clear(),
    db.budgets.clear(),
    db.sync_queue.clear(),
    db.meta.clear(),
  ]);

  useSyncStore.getState().set({ pending: 0, lastSyncedAt: null, failures: 0 });
}
