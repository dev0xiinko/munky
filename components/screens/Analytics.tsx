"use client";

import { useUI } from "@/stores/ui";
import type { Derived } from "@/hooks/useDerived";
import { card, mono, tnum, Eyebrow, ScreenHeader } from "@/components/shared/ui";
import { buildDonut, buildSavingsSpark, buildTrend } from "@/lib/analytics";
import { formatPHP } from "@/lib/money";

export default function Analytics({ d }: { d: Derived }) {
  const { chartStyle, setChartStyle } = useUI();
  const trend = buildTrend(d.trendSeries);
  const donut = buildDonut(d.catList, d.spent);
  const spark = buildSavingsSpark(d.savSeries);
  const avgIncomeFmt = d.avgIncomeFmt;
  const maxCat = d.catList.length ? d.catList[0].amount : 1;
  const topCats = d.catList.slice(0, 5).map((c) => ({
    label: c.name,
    amtFmt: formatPHP(c.amount),
    pct: Math.round((c.amount / maxCat) * 100),
  }));

  const statCard = (label: string, value: string, color?: string) => (
    <div style={{ flex: 1, ...card, borderRadius: 13, padding: 13 }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#6B706B" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color, ...tnum }}>{value}</div>
    </div>
  );

  return (
    <div style={{ animation: "cfFade .25s ease" }}>
      <ScreenHeader eyebrow="Last 6 months" title="Analytics" />
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {statCard("Avg income", avgIncomeFmt)}
          {statCard(`Net (${d.monthShort})`, d.netFmt, "#8FC4A0")}
          {statCard("Save rate", d.savingsRatePct)}
        </div>

        {/* trend */}
        <div style={{ ...card, borderRadius: 15, padding: "16px 16px 12px", marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Income vs Expenses</div>
            <div style={{ display: "flex", gap: 3, background: "#0E0F0E", border: "1px solid #2E312E", borderRadius: 8, padding: 3 }}>
              {(["area", "bars"] as const).map((k) => (
                <div
                  key={k}
                  className="cf-tap"
                  onClick={() => setChartStyle(k)}
                  style={{ ...mono, fontSize: 10, padding: "4px 9px", borderRadius: 5, cursor: "pointer", textTransform: "capitalize", background: chartStyle === k ? "#242724" : "transparent", color: chartStyle === k ? "#E8EAE8" : "#6B706B" }}
                >
                  {k}
                </div>
              ))}
            </div>
          </div>

          {chartStyle === "area" ? (
            <svg viewBox="0 0 300 104" width="100%" height={104} preserveAspectRatio="none" style={{ display: "block" }}>
              <path d={trend.incArea} fill="rgba(111,158,126,0.16)" />
              <polyline points={trend.incPoly} fill="none" stroke="#8FC4A0" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={trend.expArea} fill="rgba(155,160,155,0.07)" />
              <polyline points={trend.expPoly} fill="none" stroke="#6B706B" strokeWidth={1.6} strokeDasharray="3 3" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 300 104" width="100%" height={104} preserveAspectRatio="none" style={{ display: "block" }}>
              {trend.bars.map((b, i) => (
                <g key={i}>
                  <rect x={b.incX} y={b.incY} width={b.bw} height={b.incH} rx={2} fill="#6F9E7E" />
                  <rect x={b.expX} y={b.expY} width={b.bw} height={b.expH} rx={2} fill="#3a4540" />
                </g>
              ))}
            </svg>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, ...mono, fontSize: 10, color: "#6B706B" }}>
            {d.trendSeries.map((t) => <span key={t.m}>{t.m}</span>)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11.5, color: "#9BA09B" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#8FC4A0" }} />Income</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#6B706B" }} />Expenses</span>
          </div>
        </div>

        {/* donut */}
        <div style={{ ...card, borderRadius: 15, padding: 16, marginTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Where it went · {d.monthLong}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative", width: 120, height: 120, flex: "none" }}>
              <svg viewBox="0 0 120 120" width={120} height={120}>
                <circle cx={60} cy={60} r={54} fill="none" stroke="#242724" strokeWidth={13} />
                {donut.map((seg, i) => (
                  <circle key={i} cx={60} cy={60} r={54} fill="none" stroke={seg.color} strokeWidth={13} strokeDasharray={seg.dashStr} strokeDashoffset={seg.offset} transform="rotate(-90 60 60)" />
                ))}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "#6B706B" }}>Spent</div>
                <div style={{ fontSize: 16, fontWeight: 700, ...tnum }}>{d.spentFmt}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {donut.map((seg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, flex: "none", background: seg.color }} />
                  <span style={{ flex: 1, fontSize: 13, color: "#C8CCC8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seg.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, ...tnum }}>{seg.pctLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* savings growth */}
        <div style={{ ...card, borderRadius: 15, padding: 16, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Savings growth</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#8FC4A0", ...tnum }}>{d.totalSavedFmt}</div>
          </div>
          <svg viewBox="0 0 300 56" width="100%" height={56} preserveAspectRatio="none" style={{ display: "block" }}>
            <path d={spark.area} fill="rgba(111,158,126,0.14)" />
            <polyline points={spark.poly} fill="none" stroke="#8FC4A0" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={spark.lastX} cy={spark.lastY} r={3} fill="#8FC4A0" />
          </svg>
        </div>

        {/* top categories */}
        <div style={{ marginTop: 14 }}>
          <Eyebrow style={{ marginBottom: 10 }}>Top categories</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {topCats.map((t, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#C8CCC8" }}>{t.label}</span>
                  <span style={{ fontWeight: 700, ...tnum }}>{t.amtFmt}</span>
                </div>
                <div style={{ height: 6, background: "#1A1C1A", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${t.pct}%`, background: "#6F9E7E", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
