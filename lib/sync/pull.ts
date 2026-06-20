import { db, getMeta, setMeta } from "@/lib/db";
import { getSupabase } from "@/lib/supabase/client";
import { useSyncStore } from "@/stores/sync";
import type { SyncTable } from "./queue";

const TABLES: SyncTable[] = [
  "expense_categories",
  "clients",
  "expenses",
  "bills",
  "bill_payments",
  "income_transactions",
  "savings_contributions",
  "savings_goals",
  "budgets",
];

interface Row {
  id: string;
  updated_at: string;
}

const META_KEY = (t: string) => `lastPulledAt:${t}`;

/**
 * Reconciliation (§6 pull). Per table, fetch rows changed since we last pulled,
 * then merge into Dexie with last-write-wins on updated_at. Single user, so
 * conflicts are rare — usually the same data arriving on a new device.
 */
export async function pullFromSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return;

  for (const table of TABLES) {
    const since = (await getMeta<string>(META_KEY(table))) ?? "1970-01-01T00:00:00.000Z";
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .gt("updated_at", since)
      .order("updated_at", { ascending: true });
    if (error || !data) continue;

    let newest = since;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tbl = (db as any)[table];
    for (const remote of data as unknown as Row[]) {
      const local = (await tbl.get(remote.id)) as Row | undefined;
      if (!local || remote.updated_at > local.updated_at) {
        await tbl.put(remote);
      }
      if (remote.updated_at > newest) newest = remote.updated_at;
    }
    await setMeta(META_KEY(table), newest);
  }

  useSyncStore.getState().set({ lastSyncedAt: new Date().toISOString() });
}
