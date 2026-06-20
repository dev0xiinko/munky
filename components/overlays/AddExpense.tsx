"use client";

import { CATEGORIES } from "@/lib/constants";
import { addExpense } from "@/lib/db/actions";
import { formatDraft } from "@/lib/money";
import { useUI } from "@/stores/ui";
import { Keypad, OverlayHeader, overlayShell } from "@/components/shared/Keypad";
import { mono, tnum } from "@/components/shared/ui";

export default function AddExpense() {
  const {
    draftAmt,
    draftCat,
    draftDesc,
    selectCat,
    setDraftDesc,
    closeOverlay,
    resetDraft,
    go,
  } = useUI();

  const valid = (parseFloat(draftAmt) || 0) > 0;
  const draftCatLabel = (CATEGORIES.find((c) => c.key === draftCat) ?? CATEGORIES[0]).name;

  const commit = async () => {
    if (!valid) return;
    await addExpense(parseFloat(draftAmt) || 0, draftCat, draftDesc);
    resetDraft();
    closeOverlay();
    go("expenses");
  };

  return (
    <div style={overlayShell}>
      <OverlayHeader title="New expense" onClose={() => { resetDraft(); closeOverlay(); }} />
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ textAlign: "center", padding: "18px 20px 6px" }}>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-2px", ...tnum }}>{formatDraft(draftAmt)}</div>
          <div style={{ ...mono, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B", marginTop: 4 }}>{draftCatLabel}</div>
        </div>

        <div className="cf-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 20px" }}>
          {CATEGORIES.map((c) => {
            const active = c.key === draftCat;
            return (
              <div
                key={c.key}
                className="cf-tap"
                onClick={() => selectCat(c.key)}
                style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, borderRadius: 11, padding: "9px 13px", cursor: "pointer", background: active ? "rgba(111,158,126,0.18)" : "#1A1C1A", border: active ? "1px solid rgba(143,196,160,0.55)" : "1px solid #2E312E" }}
              >
                <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: active ? "#8FC4A0" : "#6B706B" }}>{c.code}</span>
                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: active ? "#E8EAE8" : "#9BA09B" }}>{c.name}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "4px 20px 0" }}>
          <input className="cf-in" placeholder="Add a note (optional)" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
        </div>

        <Keypad field="draftAmt" />

        <div style={{ padding: "6px 20px 26px" }}>
          <div
            className="cf-tap"
            onClick={commit}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, padding: 16, cursor: "pointer", fontWeight: 700, fontSize: 16, background: valid ? "#6F9E7E" : "#242724", color: valid ? "#0E0F0E" : "#5E635E" }}
          >
            Add expense
          </div>
        </div>
      </div>
    </div>
  );
}
