"use client";

import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { resetAllData } from "@/lib/db/reset";
import { useSession } from "@/stores/session";
import { useUI } from "@/stores/ui";
import { BackHeader, overlayShell } from "@/components/shared/Keypad";
import { card, mono, Eyebrow } from "@/components/shared/ui";

export default function Settings() {
  const closeOverlay = useUI((s) => s.closeOverlay);
  const { status, email } = useSession();
  const authed = isSupabaseConfigured && status === "authed";

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    closeOverlay();
  };

  const reset = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    await resetAllData();
    // Reload so the app re-seeds a clean slate.
    window.location.reload();
  };

  return (
    <div style={overlayShell}>
      <BackHeader onClose={closeOverlay} />
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 26px" }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px", marginBottom: 16 }}>Settings</div>

        <Eyebrow style={{ margin: "0 2px 10px" }}>Account</Eyebrow>
        <div style={{ ...card, borderRadius: 14, padding: "16px 17px" }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>
            {authed ? "Signed in" : "Local mode"}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>
            {authed ? email ?? "—" : "Data stays on this device"}
          </div>
          {authed && (
            <div
              className="cf-tap"
              onClick={signOut}
              style={{ marginTop: 14, textAlign: "center", padding: 12, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#9BA09B", background: "#1A1C1A", border: "1px solid #2E312E" }}
            >
              Sign out
            </div>
          )}
        </div>

        <Eyebrow style={{ margin: "22px 2px 10px" }}>Danger zone</Eyebrow>
        <div style={{ background: "rgba(199,123,107,0.07)", border: "1px solid rgba(199,123,107,0.3)", borderRadius: 14, padding: "16px 17px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Reset all data</div>
          <div style={{ fontSize: 12.5, color: "#9BA09B", marginTop: 3 }}>
            Permanently wipes every expense, bill, client, goal and budget
            {authed ? " — on this device and in the cloud." : " on this device."} Demo data is re-seeded afterward.
          </div>
          <div
            className="cf-tap"
            onClick={reset}
            style={{ marginTop: 14, textAlign: "center", padding: 13, borderRadius: 11, cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: "#0E0F0E", background: confirming ? "#C77B6B" : "rgba(199,123,107,0.85)" }}
          >
            {busy ? "Wiping…" : confirming ? "Tap again to confirm — this can't be undone" : "Reset all data"}
          </div>
          {confirming && !busy && (
            <div
              className="cf-tap"
              onClick={() => setConfirming(false)}
              style={{ marginTop: 8, textAlign: "center", padding: 10, fontSize: 13, color: "#9BA09B", cursor: "pointer" }}
            >
              Cancel
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
