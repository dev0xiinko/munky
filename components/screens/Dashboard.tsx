"use client";

import { monthLabel } from "@/lib/dates";
import { useUI } from "@/stores/ui";
import type { Derived } from "@/hooks/useDerived";
import { card, mono, tnum } from "@/components/shared/ui";

const eyebrow = (extra = {}) =>
  ({
    ...mono,
    fontSize: 11,
    letterSpacing: "1.4px",
    textTransform: "uppercase" as const,
    color: "#6B706B",
    ...extra,
  });

function BreakdownRow({
  label,
  value,
  color,
  strong,
  top,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
  top?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderTop: top ? "1px solid #2E312E" : "none",
      }}
    >
      <span style={{ fontSize: 13.5, color: strong ? "#E8EAE8" : "#9BA09B", fontWeight: strong ? 700 : 500 }}>
        {label}
      </span>
      <span style={{ fontSize: strong ? 16 : 14.5, fontWeight: 700, color, ...tnum }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, borderRadius: 14, padding: 15 }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>
        {label}
      </div>
      <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.5px", marginTop: 5, color, ...tnum }}>
        {value}
      </div>
    </div>
  );
}

export default function Dashboard({ d }: { d: Derived }) {
  const { dashLayout, setDashLayout, openOverlay, go } = useUI();
  const focus = dashLayout === "focus";
  // Deduction formatter: leading minus for any non-zero amount taken out.
  const ded = (c: number) => (c > 0 ? "−" : "") + d.fmt(c);

  return (
    <div style={{ animation: "cfFade .25s ease" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 20px 14px" }}>
        <div>
          <div style={{ ...mono, fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase", color: "#6B706B" }}>
            {monthLabel()}
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 3 }}>Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "#15171580", border: "1px solid #2E312E", borderRadius: 9, padding: 3 }}>
          {(["focus", "grid"] as const).map((k) => (
            <div
              key={k}
              className="cf-tap"
              onClick={() => setDashLayout(k)}
              style={{
                ...mono,
                fontSize: 10,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                padding: "5px 9px",
                borderRadius: 6,
                cursor: "pointer",
                background: dashLayout === k ? "#242724" : "transparent",
                color: dashLayout === k ? "#E8EAE8" : "#6B706B",
              }}
            >
              {k}
            </div>
          ))}
        </div>
      </div>

      {focus ? (
        <div style={{ padding: "0 20px" }}>
          <div style={{ background: "#1A1C1A", border: "1px solid #2E312E", borderRadius: 16, padding: "22px 20px" }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: "1.4px", textTransform: "uppercase", color: "#9BA09B" }}>
              {d.safeLabel}
            </div>
            <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-1.6px", marginTop: 6, lineHeight: 1, ...tnum }}>
              {d.safeFmt}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, color: "#9BA09B", fontSize: 13 }}>
              <span style={{ color: "#8FC4A0", fontWeight: 600 }}>{d.safeDailyFmt}/day</span>
              <span>safe to spend · {d.daysLeft} days left</span>
            </div>
            {d.safeNote && (
              <div style={{ fontSize: 12, color: "#D08B7B", marginTop: 6 }}>{d.safeNote}</div>
            )}
            <div style={{ height: 7, background: "#0E0F0E", borderRadius: 999, marginTop: 16, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${d.safeUsedPct}%`, background: "#6F9E7E", borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: "#6B706B" }}>
              <span>{Math.round(d.safeUsedPct)}% {d.safeUsedLabel}</span>
              <span>of {d.safeOfFmt}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <MiniStat label="Income" value={d.incomeFmt} color="#8FC4A0" />
            <MiniStat label="Expenses" value={d.spentFmt} />
            <MiniStat label="Bills" value={d.billsFmt} />
            <MiniStat label="Savings" value={d.savingsFmt} color="#8FC4A0" />
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 12 }}>
            <div style={{ background: "linear-gradient(160deg,#23302a,#1A1C1A)", border: "1px solid #3a4a40", borderRadius: 16, padding: 18 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "1.2px", textTransform: "uppercase", color: "#8FC4A0" }}>Safe to spend</div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px", marginTop: 6, lineHeight: 1, ...tnum }}>{d.safeFmt}</div>
              <div style={{ fontSize: 12, color: "#9BA09B", marginTop: 6 }}>{d.safeDailyFmt}/day left</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, borderRadius: 14, padding: "13px 14px", flex: 1 }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>Income</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3, color: "#8FC4A0", ...tnum }}>{d.incomeFmt}</div>
              </div>
              <div style={{ ...card, borderRadius: 14, padding: "13px 14px", flex: 1 }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>Spent</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3, ...tnum }}>{d.spentFmt}</div>
              </div>
            </div>
          </div>
          <div style={{ height: 7, background: "#1A1C1A", border: "1px solid #2E312E", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${d.safeUsedPct}%`, background: "#6F9E7E" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <MiniStat label="Bills" value={d.billsFmt} />
            <MiniStat label="Savings" value={d.savingsFmt} color="#8FC4A0" />
          </div>
        </div>
      )}

      {/* allocation breakdown — total income, then what's reserved/spent */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ ...eyebrow(), marginBottom: 10 }}>Breakdown</div>
        <div style={{ ...card, borderRadius: 14, padding: "2px 16px" }}>
          <BreakdownRow label="Total income" value={d.incomeFmt} color="#8FC4A0" strong />
          <BreakdownRow label="Bills (allocated)" value={ded(d.billsTotal)} top />
          <BreakdownRow label="Savings (allocated)" value={ded(d.plannedSavings)} top />
          <BreakdownRow label="Daily expenses" value={ded(d.spent)} top />
          <BreakdownRow
            label="Safe to spend"
            value={d.remainingFmt}
            color={d.remaining < 0 ? "#D08B7B" : "#E8EAE8"}
            strong
            top
          />
        </div>
      </div>

      {/* quick actions */}
      <div className="cf-scroll" style={{ display: "flex", gap: 9, overflowX: "auto", padding: "18px 20px 4px" }}>
        {[
          { label: "Expense", on: () => openOverlay("addExpense"), accent: true },
          { label: "Bill", on: () => go("bills"), accent: true },
          { label: "Client", on: () => openOverlay("clients"), accent: true },
          { label: "Savings", on: () => go("savings"), accent: true },
          { label: "Budget", on: () => openOverlay("budget"), accent: false },
        ].map((a) => (
          <div
            key={a.label}
            className="cf-tap"
            onClick={a.on}
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 7,
              ...card,
              borderRadius: 11,
              padding: "11px 15px",
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: 600,
              color: a.accent ? undefined : "#9BA09B",
            }}
          >
            {a.accent && <span style={{ color: "#8FC4A0", fontSize: 17, lineHeight: 0 }}>+</span>}
            {a.label}
          </div>
        ))}
      </div>

      {/* afford button */}
      <div style={{ padding: "12px 20px 4px" }}>
        <div
          className="cf-tap"
          onClick={() => openOverlay("afford")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg,#6F9E7E,#5C8569)",
            borderRadius: 14,
            padding: "16px 18px",
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0E0F0E" }}>Can I afford this?</div>
            <div style={{ fontSize: 12, color: "#13241a", opacity: 0.75, marginTop: 1 }}>Check before you spend</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(14,15,14,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E0F0E", fontSize: 18, fontWeight: 700 }}>
            →
          </div>
        </div>
      </div>

      {/* upcoming */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ ...eyebrow(), marginBottom: 10 }}>Upcoming</div>
        <div style={{ ...card, borderRadius: 14, overflow: "hidden" }}>
          {d.upcomingView.map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #232623" }}>
              <div style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: u.dot }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{u.label}</div>
                <div style={{ fontSize: 12, color: "#9BA09B", marginTop: 1 }}>{u.sub}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, ...tnum, color: u.amtColor }}>{u.amtFmt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
