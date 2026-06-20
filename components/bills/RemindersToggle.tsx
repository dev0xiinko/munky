"use client";

import { useEffect, useState } from "react";
import {
  permissionState,
  requestNotificationPermission,
  runBillReminders,
} from "@/lib/notifications";
import { useBills } from "@/hooks/useData";
import { mono } from "@/components/shared/ui";

type State = NotificationPermission | "unsupported";

export default function RemindersToggle() {
  const bills = useBills();
  const [state, setState] = useState<State>("default");

  useEffect(() => {
    setState(permissionState());
  }, []);

  if (state === "unsupported" || state === "granted") return null;

  const enable = async () => {
    const result = await requestNotificationPermission();
    setState(result);
    if (result === "granted") void runBillReminders(bills);
  };

  const denied = state === "denied";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#1A1C1A",
        border: "1px solid #2E312E",
        borderRadius: 13,
        padding: "13px 15px",
        marginBottom: 12,
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 9, flex: "none", background: "rgba(111,158,126,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8FC4A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Bill reminders</div>
        <div style={{ fontSize: 11.5, color: "#9BA09B", marginTop: 1 }}>
          {denied ? "Blocked — enable notifications in browser settings." : "Get notified before bills are due."}
        </div>
      </div>
      {!denied && (
        <div className="cf-tap" onClick={enable} style={{ flex: "none", ...mono, fontSize: 11, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600, color: "#0E0F0E", background: "#6F9E7E", borderRadius: 9, padding: "8px 12px", cursor: "pointer" }}>
          Enable
        </div>
      )}
    </div>
  );
}
