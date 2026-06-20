import { db } from "@/lib/db";
import { getSupabase } from "@/lib/supabase/client";
import { useSyncStore } from "@/stores/sync";
import type { SyncQueueEntry } from "@/types";
import type { SyncTable } from "./queue";

const MAX_ATTEMPTS = 8;

async function refreshPending() {
  const pending = await db.sync_queue.where("synced").equals(0).count();
  useSyncStore.getState().set({ pending });
}

/**
 * Drain the sync queue to Supabase (§6 push). Idempotent: every payload upserts
 * on its client-generated id, so re-running never duplicates. Soft deletes
 * travel as ordinary updates (deleted_at is already set on the payload).
 */
export async function syncToSupabase(): Promise<void> {
  const supabase = getSupabase();
  const sync = useSyncStore.getState();

  // Bail if offline, unconfigured, or unauthenticated.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    sync.set({ online: false });
    return;
  }
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return;
  if (sync.syncing) return;

  sync.set({ syncing: true, online: true });
  try {
    // Oldest first. Dexie stores booleans as 0/1 in indexes.
    const queued = (await db.sync_queue
      .where("synced")
      .equals(0)
      .sortBy("created_at")) as SyncQueueEntry[];

    let failures = 0;
    for (const entry of queued) {
      if (entry.attempts >= MAX_ATTEMPTS) continue; // park poison entries
      const { error } = await supabase
        .from(entry.table as SyncTable)
        .upsert(entry.payload as never, { onConflict: "id" });

      if (error) {
        failures++;
        await db.sync_queue.update(entry.id, { attempts: entry.attempts + 1 });
      } else {
        await db.sync_queue.update(entry.id, { synced: 1 });
      }
    }

    // Garbage-collect successfully synced entries.
    await db.sync_queue.where("synced").equals(1).delete();
    await refreshPending();
    useSyncStore.getState().set({
      syncing: false,
      failures,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch {
    useSyncStore.getState().set({ syncing: false });
    await refreshPending();
  }
}
