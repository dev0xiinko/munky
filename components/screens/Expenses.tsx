"use client";

import { useUI } from "@/stores/ui";
import { deleteExpense } from "@/lib/db/actions";
import type { Derived } from "@/hooks/useDerived";
import { card, mono, tnum } from "@/components/shared/ui";
import { ScreenHeader, Eyebrow } from "@/components/shared/ui";

export default function Expenses({ d }: { d: Derived }) {
  const openOverlay = useUI((s) => s.openOverlay);

  return (
    <div style={{ animation: "cfFade .25s ease" }}>
      <ScreenHeader eyebrow="Spending · June" title="Expenses" />
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, ...card, borderRadius: 14, padding: 15 }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>Total spent</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", marginTop: 5, ...tnum }}>{d.spentFmt}</div>
          </div>
          <div style={{ flex: 1, ...card, borderRadius: 14, padding: 15 }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>Spent today</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", marginTop: 5, color: "#8FC4A0", ...tnum }}>{d.spentTodayFmt}</div>
          </div>
        </div>

        <div
          className="cf-tap"
          onClick={() => openOverlay("addExpense")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#6F9E7E", borderRadius: 13, padding: 14, marginTop: 12, cursor: "pointer", color: "#0E0F0E", fontWeight: 700, fontSize: 15 }}
        >
          <span style={{ fontSize: 19, lineHeight: 0 }}>+</span>Quick add expense
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
          <Eyebrow>Recent</Eyebrow>
          <div style={{ fontSize: 11.5, color: "#6B706B" }}>{d.expenseCount}</div>
        </div>

        <div style={{ ...card, borderRadius: 14, overflow: "hidden" }}>
          {d.expensesView.map((e) => (
            <div key={e.id} className="cf-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", borderBottom: "1px solid #232623" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#242724", border: "1px solid #2E312E", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 13, fontWeight: 600, color: "#9BA09B" }}>
                {e.code}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.desc}</div>
                <div style={{ fontSize: 12, color: "#6B706B", marginTop: 1 }}>{e.catLabel} · {e.date}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, ...tnum }}>{e.amtFmt}</div>
                <div
                  className="cf-tap"
                  onClick={() => deleteExpense(e.exp)}
                  style={{ color: "#5E635E", fontSize: 17, lineHeight: 0, cursor: "pointer", padding: 2 }}
                  aria-label="Delete expense"
                >
                  ×
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
