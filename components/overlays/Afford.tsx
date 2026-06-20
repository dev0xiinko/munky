"use client";

import { formatDraft } from "@/lib/money";
import { useUI } from "@/stores/ui";
import type { Derived } from "@/hooks/useDerived";
import { Keypad, OverlayHeader, overlayShell } from "@/components/shared/Keypad";
import { mono, tnum } from "@/components/shared/ui";

export default function Afford({ d }: { d: Derived }) {
  const { affordAmt, closeOverlay } = useUI();

  const stat = (label: string, value: string, color?: string) => (
    <div style={{ flex: 1, background: "#1A1C1A", border: "1px solid #2E312E", borderRadius: 13, padding: 13 }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#6B706B" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color, ...tnum }}>{value}</div>
    </div>
  );

  return (
    <div style={overlayShell}>
      <OverlayHeader title="Can I afford this?" onClose={closeOverlay} />
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ textAlign: "center", padding: "14px 20px 4px" }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>The expense</div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-2px", marginTop: 4, ...tnum }}>{formatDraft(affordAmt)}</div>
        </div>

        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ borderRadius: 15, padding: 18, textAlign: "center", background: d.vBg }}>
            <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.4px", color: d.vColor }}>{d.verdict}</div>
            <div style={{ fontSize: 13, color: "#9BA09B", marginTop: 5 }}>{d.vSub}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {stat("Now", d.remainingFmt)}
            {stat("After", d.afterFmt, d.afterColor)}
            {stat("Per day", d.afDailyFmt)}
          </div>
        </div>

        <Keypad field="affordAmt" />
        <div style={{ height: 18 }} />
      </div>
    </div>
  );
}
