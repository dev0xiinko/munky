import { db } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSyncStore } from "@/stores/sync";
import { pullFromSupabase } from "./pull";
import { syncToSupabase } from "./push";

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

async function tick() {
  await syncToSupabase();
  await pullFromSupabase();
}

async function refreshPending() {
  const pending = await db.sync_queue.where("synced").equals(0).count();
  useSyncStore.getState().set({ pending });
}

/**
 * Start the background sync loop (§6): every 30s, on reconnect, and on focus.
 * No-op in pure local mode. Returns a cleanup function.
 */
export function startSyncWorker(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  useSyncStore.getState().set({ online: navigator.onLine });
  void refreshPending();

  if (!isSupabaseConfigured) return () => {};

  const onOnline = () => {
    useSyncStore.getState().set({ online: true });
    void tick();
  };
  const onOffline = () => useSyncStore.getState().set({ online: false });
  const onFocus = () => void tick();
  const onVisible = () => {
    if (document.visibilityState === "visible") void tick();
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);
  intervalId = setInterval(() => void tick(), 30_000);

  void tick();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisible);
    if (intervalId) clearInterval(intervalId);
    started = false;
  };
}

/** Trigger an immediate sync (e.g. right after a mutation). */
export const syncNow = () => void tick();
