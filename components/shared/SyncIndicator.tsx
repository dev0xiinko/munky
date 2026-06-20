"use client";

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSyncStore } from "@/stores/sync";
import { useSession } from "@/stores/session";
import { syncNow } from "@/lib/sync/worker";
import { mono } from "./ui";

export default function SyncIndicator() {
  const { online, pending, syncing, failures } = useSyncStore();
  const status = useSession((s) => s.status);

  // Hidden in pure local mode — there's nothing to sync.
  if (!isSupabaseConfigured || status !== "authed") return null;

  let color = "#6F9E7E"; // sage = synced
  let label = "Synced";
  if (!online) {
    color = "#9BA09B";
    label = "Offline";
  } else if (failures > 0 && pending > 0) {
    color = "#C77B6B"; // clay = repeated failure
    label = "Retrying";
  } else if (syncing) {
    color = "#8FC4A0";
    label = "Syncing";
  } else if (pending > 0) {
    color = "#9BA09B"; // muted = pending
    label = `${pending} pending`;
  }

  return (
    <div
      className="cf-tap"
      onClick={() => syncNow()}
      title="Sync now"
      style={{
        position: "absolute",
        top: "calc(20px + env(safe-area-inset-top))",
        right: "calc(18px + env(safe-area-inset-right))",
        zIndex: 40,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: "rgba(20,23,21,0.7)",
        border: "1px solid #2E312E",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: color,
          animation: syncing ? "cfFade 0.8s ease infinite alternate" : undefined,
        }}
      />
      <span style={{ ...mono, fontSize: 9.5, letterSpacing: "0.6px", textTransform: "uppercase", color: "#9BA09B" }}>
        {label}
      </span>
    </div>
  );
}
