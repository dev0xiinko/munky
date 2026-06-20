"use client";

import { useUI } from "@/stores/ui";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

export function Keypad({ field }: { field: "draftAmt" | "affordAmt" }) {
  const pressKey = useUI((s) => s.pressKey);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, padding: "16px 20px 8px" }}>
      {KEYS.map((k) => (
        <div
          key={k}
          className="cf-tap"
          onClick={() => pressKey(field, k)}
          style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "center", background: "#1A1C1A", border: "1px solid #232623", borderRadius: 13, cursor: "pointer", fontSize: 23, fontWeight: 600 }}
        >
          {k === "del" ? "⌫" : k}
        </div>
      ))}
    </div>
  );
}

/** Overlay header with Cancel / title. */
export function OverlayHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(54px + env(safe-area-inset-top)) 20px 12px" }}>
      <div className="cf-tap" onClick={onClose} style={{ fontSize: 15, color: "#9BA09B", cursor: "pointer" }}>
        Cancel
      </div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      <div style={{ width: 44 }} />
    </div>
  );
}

/** Back-style overlay header (Clients/Budget). */
export function BackHeader({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "calc(54px + env(safe-area-inset-top)) 16px 12px" }}>
      <div className="cf-tap" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 15, color: "#9BA09B", cursor: "pointer" }}>
        <span style={{ fontSize: 20, lineHeight: 0 }}>‹</span>Back
      </div>
    </div>
  );
}

export const overlayShell = {
  position: "absolute" as const,
  inset: 0,
  zIndex: 50,
  background: "#0E0F0E",
  paddingBottom: "env(safe-area-inset-bottom)",
  display: "flex",
  flexDirection: "column" as const,
  animation: "cfSlide .26s cubic-bezier(.2,.8,.2,1)",
};
