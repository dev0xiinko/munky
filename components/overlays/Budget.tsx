"use client";

import { useState } from "react";
import { updateBudget } from "@/lib/db/actions";
import { useBudget } from "@/hooks/useData";
import { CATEGORIES } from "@/lib/constants";
import { fromCentavos } from "@/lib/money";
import { useUI } from "@/stores/ui";
import type { Derived } from "@/hooks/useDerived";
import { BackHeader, overlayShell } from "@/components/shared/Keypad";
import { card, mono, tnum, Eyebrow } from "@/components/shared/ui";

const MONTH = new Date().toLocaleString("en-US", { month: "long" });

export default function Budget({ d }: { d: Derived }) {
  const closeOverlay = useUI((s) => s.closeOverlay);
  const budget = useBudget();

  const [editing, setEditing] = useState(false);
  const [monthly, setMonthly] = useState("");
  const [cats, setCats] = useState<Record<string, string>>({});

  const limitOf = (key: string) =>
    budget?.category_limits.find((l) => l.key === key)?.limit_centavos ?? 0;

  const startEdit = () => {
    if (!budget) return;
    setMonthly(String(fromCentavos(budget.monthly_limit_centavos)));
    setCats(Object.fromEntries(CATEGORIES.map((c) => [c.key, String(fromCentavos(limitOf(c.key)))])));
    setEditing(true);
  };

  const save = async () => {
    if (!budget) return;
    await updateBudget(
      budget,
      parseFloat(monthly) || 0,
      CATEGORIES.map((c) => ({ key: c.key, peso: parseFloat(cats[c.key]) || 0 })),
    );
    setEditing(false);
  };

  return (
    <div style={overlayShell}>
      <BackHeader onClose={closeOverlay} />
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px" }}>Budget · {MONTH}</div>
          {budget && !editing && (
            <span className="cf-tap" onClick={startEdit} style={{ fontSize: 13, fontWeight: 600, color: "#8FC4A0", cursor: "pointer" }}>
              Edit
            </span>
          )}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B706B", margin: "0 2px 6px" }}>Monthly limit</div>
              <input className="cf-in" type="number" inputMode="decimal" placeholder="Monthly limit" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
            <Eyebrow style={{ margin: "4px 2px 0" }}>Per-category limits</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {CATEGORIES.map((c) => (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                  <input
                    className="cf-in"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={cats[c.key] ?? ""}
                    onChange={(e) => setCats((s) => ({ ...s, [c.key]: e.target.value }))}
                    style={{ width: 120, textAlign: "right" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div className="cf-tap" onClick={() => setEditing(false)} style={{ flex: "none", padding: "14px 18px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#9BA09B", background: "#1A1C1A", border: "1px solid #2E312E" }}>
                Cancel
              </div>
              <div className="cf-tap" onClick={save} style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 15, background: "#6F9E7E", color: "#0E0F0E" }}>
                Save budget
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ ...card, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                  <div style={{ ...mono, fontSize: 11, letterSpacing: "1.2px", textTransform: "uppercase", color: "#9BA09B" }}>Spent of {d.budgetLimitFmt}</div>
                  <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-1px", marginTop: 5, ...tnum }}>{d.budgetSpentFmt}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: "#8FC4A0", fontWeight: 700, ...tnum }}>{d.budgetRemainFmt}</div>
                  <div style={{ fontSize: 11, color: "#6B706B" }}>left</div>
                </div>
              </div>
              <div style={{ height: 8, background: "#0E0F0E", borderRadius: 999, marginTop: 14, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.budgetSpentPct}%`, background: "#6F9E7E", borderRadius: 999 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #232623", fontSize: 12.5, color: "#9BA09B" }}>
                <span style={{ ...mono, fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", color: "#6B706B" }}>Forecast</span>
                {d.projectedFmt} by month-end · <span style={{ color: d.projOverColor, fontWeight: 600 }}>{d.projOverFmt} {d.projOverLabel}</span>
              </div>
            </div>

            <Eyebrow style={{ margin: "20px 2px 12px" }}>By category</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {d.catView.map((c, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 12.5, color: c.leftColor, ...tnum }}>{c.leftFmt}</div>
                  </div>
                  <div style={{ height: 7, background: "#1A1C1A", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.pct}%`, borderRadius: 999, background: c.barColor }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6B706B", marginTop: 5, ...tnum }}>{c.spentFmt} of {c.limitFmt}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
