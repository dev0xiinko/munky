import { create } from "zustand";

interface SyncState {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  failures: number;
  set: (partial: Partial<Omit<SyncState, "set">>) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  online: true,
  pending: 0,
  syncing: false,
  lastSyncedAt: null,
  failures: 0,
  set: (partial) => set(partial),
}));
