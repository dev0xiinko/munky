"use client";

import { useEffect, useState } from "react";
import { seedDefaultsIfEmpty, seedIfEmpty } from "@/lib/db/seed";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { pullFromSupabase } from "@/lib/sync/pull";
import { syncNow } from "@/lib/sync/worker";
import { useDerived } from "@/hooks/useDerived";
import { useBills } from "@/hooks/useData";
import { useBillReminders } from "@/hooks/useBillReminders";
import { useSession } from "@/stores/session";
import { useUI } from "@/stores/ui";
import PhoneFrame from "./PhoneFrame";
import TabBar from "./TabBar";
import Dashboard from "./screens/Dashboard";
import Expenses from "./screens/Expenses";
import Bills from "./screens/Bills";
import Savings from "./screens/Savings";
import Analytics from "./screens/Analytics";
import AddExpense from "./overlays/AddExpense";
import Afford from "./overlays/Afford";
import Clients from "./overlays/Clients";
import Budget from "./overlays/Budget";
import Settings from "./overlays/Settings";
import SyncIndicator from "./shared/SyncIndicator";
import SettingsButton from "./shared/SettingsButton";
import InstallHint from "./shared/InstallHint";

export default function CashflowApp() {
  const [ready, setReady] = useState(false);
  const { screen, overlay } = useUI();
  const status = useSession((s) => s.status);
  const d = useDerived();
  const bills = useBills();
  useBillReminders(bills);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isSupabaseConfigured && status === "authed") {
        // Reconcile from the cloud first, then seed defaults only if still empty.
        await pullFromSupabase().catch(() => {});
        await seedDefaultsIfEmpty();
        syncNow();
      } else {
        // Local / preview mode: rich demo data.
        await seedIfEmpty();
      }
    })().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <PhoneFrame>
      {!overlay && (
        <>
          <SyncIndicator />
          <SettingsButton />
          <InstallHint />
        </>
      )}
      {/* scroll area */}
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "calc(54px + env(safe-area-inset-top)) 0 calc(100px + env(safe-area-inset-bottom))" }}>
        {ready && (
          <>
            {screen === "home" && <Dashboard d={d} />}
            {screen === "expenses" && <Expenses d={d} />}
            {screen === "bills" && <Bills d={d} />}
            {screen === "savings" && <Savings d={d} />}
            {screen === "analytics" && <Analytics d={d} />}
          </>
        )}
      </div>

      {!overlay && <TabBar />}

      {overlay === "addExpense" && <AddExpense />}
      {overlay === "afford" && <Afford d={d} />}
      {overlay === "clients" && <Clients d={d} />}
      {overlay === "budget" && <Budget d={d} />}
      {overlay === "settings" && <Settings />}
    </PhoneFrame>
  );
}
