"use client";

import { contributeGoal, deleteGoal } from "@/lib/db/actions";
import type { Derived } from "@/hooks/useDerived";
import { card, mono, tnum } from "@/components/shared/ui";
import { ScreenHeader } from "@/components/shared/ui";
import AddGoalForm from "@/components/savings/AddGoalForm";

export default function Savings({ d }: { d: Derived }) {
  return (
    <div style={{ animation: "cfFade .25s ease" }}>
      <ScreenHeader eyebrow="Goals" title="Savings" />
      <div style={{ padding: "0 20px" }}>
        <div style={{ ...card, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: "1.2px", textTransform: "uppercase", color: "#9BA09B" }}>Total saved</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", marginTop: 5, color: "#8FC4A0", ...tnum }}>{d.totalSavedFmt}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, color: "#6B706B" }}>
            of {d.totalTargetFmt}
            <br />
            <span style={{ color: "#8FC4A0" }}>{d.savedThisMonthFmt}</span> this month
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {d.goalsView.map((g) => (
            <div key={g.id} style={{ ...card, borderRadius: 15, padding: "16px 17px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: "#6B706B", marginTop: 2 }}>{g.monthlyFmt} · {g.remainFmt}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#8FC4A0", ...mono }}>{g.pctLabel}</div>
                  <div
                    className="cf-tap"
                    onClick={() => deleteGoal(g.goal)}
                    style={{ color: "#5E635E", fontSize: 17, lineHeight: 0, cursor: "pointer", padding: 2 }}
                    aria-label="Delete goal"
                  >
                    ×
                  </div>
                </div>
              </div>
              <div style={{ height: 8, background: "#0E0F0E", borderRadius: 999, marginTop: 13, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${g.pct}%`, background: "linear-gradient(90deg,#6F9E7E,#8FC4A0)", borderRadius: 999 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
                <div style={{ fontSize: 13, ...tnum }}>
                  <span style={{ fontWeight: 700 }}>{g.currentFmt}</span>
                  <span style={{ color: "#6B706B" }}> / {g.targetFmt}</span>
                </div>
                {!g.done && (() => {
                  // The amount this tap would actually add (capped at target),
                  // and whether it fits within what's left to spend this month.
                  const increment = Math.min(
                    g.goal.monthly_contribution_centavos,
                    g.goal.target_centavos - g.goal.current_centavos,
                  );
                  const affordable = d.savingsRoom >= increment;
                  return affordable ? (
                    <div
                      className="cf-tap"
                      onClick={() => contributeGoal(g.goal)}
                      style={{ fontSize: 12.5, fontWeight: 600, color: "#8FC4A0", background: "rgba(111,158,126,0.13)", border: "1px solid rgba(111,158,126,0.3)", borderRadius: 9, padding: "6px 12px", cursor: "pointer" }}
                    >
                      + Add {g.monthlyFmt}
                    </div>
                  ) : (
                    <div
                      title="Not enough left to spend this month"
                      style={{ fontSize: 12.5, fontWeight: 600, color: "#9BA09B", background: "rgba(199,123,107,0.10)", border: "1px solid rgba(199,123,107,0.28)", borderRadius: 9, padding: "6px 12px", cursor: "not-allowed" }}
                    >
                      Not enough left
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <AddGoalForm />
      </div>
    </div>
  );
}
