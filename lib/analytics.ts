// Pure SVG geometry for the analytics charts. Mirrors the math in
// CashflowOS.dc.html. Series are real centavo amounts computed in useDerived;
// absolute units cancel out (each chart is normalized to its own max).

import { HUES } from "./constants";

export function buildTrend(trend: { m: string; inc: number; exp: number }[]) {
  const TW = 300, TH = 104, tp = 10;
  const tx = (i: number) => tp + i * ((TW - 2 * tp) / Math.max(1, trend.length - 1));
  const tmax = Math.max(1, ...trend.flatMap((t) => [t.inc, t.exp])) * 1.12;
  const ty = (v: number) => TH - 2 - (v / tmax) * (TH - 14);

  const incPoly = trend.map((t, i) => `${tx(i).toFixed(1)},${ty(t.inc).toFixed(1)}`).join(" ");
  const expPoly = trend.map((t, i) => `${tx(i).toFixed(1)},${ty(t.exp).toFixed(1)}`).join(" ");
  const areaPath = (key: "inc" | "exp") =>
    `M${tx(0).toFixed(1)},${ty(trend[0][key]).toFixed(1)} ` +
    trend.map((t, i) => `L${tx(i).toFixed(1)},${ty(t[key]).toFixed(1)}`).join(" ") +
    ` L${tx(trend.length - 1).toFixed(1)},${TH - 2} L${tx(0).toFixed(1)},${TH - 2} Z`;

  const bw = 11;
  const bars = trend.map((t, i) => {
    const cx = tx(i);
    return {
      m: t.m,
      incX: +(cx - bw - 1).toFixed(1),
      incY: +ty(t.inc).toFixed(1),
      incH: +(TH - 2 - ty(t.inc)).toFixed(1),
      expX: +(cx + 1).toFixed(1),
      expY: +ty(t.exp).toFixed(1),
      expH: +(TH - 2 - ty(t.exp)).toFixed(1),
      bw,
    };
  });

  return { incPoly, expPoly, incArea: areaPath("inc"), expArea: areaPath("exp"), bars };
}

export function buildDonut(catList: { name: string; amount: number }[], spentCentavos: number) {
  const C = 2 * Math.PI * 54;
  let cum = 0;
  const spent = spentCentavos || 1;
  return catList.map((c, i) => {
    const frac = c.amount / spent;
    const dash = frac * C;
    const seg = {
      label: c.name,
      pctLabel: Math.round(frac * 100) + "%",
      dashStr: `${dash.toFixed(2)} ${(C - dash).toFixed(2)}`,
      offset: +(-cum).toFixed(2),
      color: HUES[i % HUES.length],
    };
    cum += dash;
    return seg;
  });
}

export function buildSavingsSpark(sav: number[]) {
  const smax = Math.max(1, ...sav) * 1.06;
  const SW = 300, SH = 56;
  const sx = (i: number) => 6 + i * ((SW - 12) / Math.max(1, sav.length - 1));
  const sy = (v: number) => SH - 4 - (v / smax) * (SH - 12);
  const poly = sav.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const area =
    `M${sx(0).toFixed(1)},${sy(sav[0]).toFixed(1)} ` +
    sav.map((v, i) => `L${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ") +
    ` L${sx(sav.length - 1).toFixed(1)},${SH - 4} L${sx(0).toFixed(1)},${SH - 4} Z`;
  return { poly, area, lastX: +sx(sav.length - 1).toFixed(1), lastY: +sy(sav[sav.length - 1]).toFixed(1) };
}
