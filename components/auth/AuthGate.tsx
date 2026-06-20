"use client";

import { useEffect, type ReactNode } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/stores/session";
import { startSyncWorker, syncNow } from "@/lib/sync/worker";
import PhoneFrame from "@/components/PhoneFrame";
import Login from "./Login";

/**
 * Gates the app on auth when Supabase is configured. In pure local mode there's
 * no auth wall — the app is fully usable offline-first without an account.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { status, setSession, clearSession, setStatus } = useSession();

  useEffect(() => {
    const stop = startSyncWorker();

    if (!isSupabaseConfigured) {
      setStatus("anon"); // local mode — render the app directly
      return stop;
    }

    const supabase = getSupabase()!;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession({ userId: data.session.user.id, email: data.session.user.email ?? null });
      } else {
        clearSession();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession({ userId: session.user.id, email: session.user.email ?? null });
        syncNow();
      } else {
        clearSession();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <PhoneFrame>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B706B", fontSize: 13 }}>
          Loading…
        </div>
      </PhoneFrame>
    );
  }

  // Configured but signed out → show login inside the device frame.
  if (isSupabaseConfigured && status !== "authed") {
    return (
      <PhoneFrame>
        <Login />
      </PhoneFrame>
    );
  }

  return <>{children}</>;
}
