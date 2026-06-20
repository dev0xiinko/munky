import { create } from "zustand";
import { LOCAL_USER_ID } from "@/lib/constants";

export type AuthStatus = "loading" | "authed" | "anon";

interface SessionState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  setSession: (s: { userId: string; email: string | null }) => void;
  clearSession: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useSession = create<SessionState>((set) => ({
  status: "loading",
  userId: null,
  email: null,
  setSession: ({ userId, email }) => set({ status: "authed", userId, email }),
  clearSession: () => set({ status: "anon", userId: null, email: null }),
  setStatus: (status) => set({ status }),
}));

/**
 * The user_id new rows are stamped with. Falls back to LOCAL_USER_ID in pure
 * local mode so the app is fully usable before any backend exists. Readable
 * outside React (used by the write path and seed).
 */
export function getUserId(): string {
  return useSession.getState().userId ?? LOCAL_USER_ID;
}
