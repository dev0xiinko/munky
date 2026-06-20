import type { CSSProperties, ReactNode } from "react";

// Reusable style fragments matching the CashflowOS design language.

export const card: CSSProperties = {
  background: "#1A1C1A",
  border: "1px solid #2E312E",
};

export const mono: CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
};

export const tnum: CSSProperties = { fontFeatureSettings: "'tnum' 1" };

/** Small uppercase mono eyebrow label. */
export function Eyebrow({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        ...mono,
        fontSize: 11,
        letterSpacing: "1.4px",
        textTransform: "uppercase",
        color: "#6B706B",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Screen header: mono eyebrow + large title. */
export function ScreenHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ padding: "0 20px 14px" }}>
      <Eyebrow style={{ letterSpacing: "1.6px" }}>{eyebrow}</Eyebrow>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 3 }}>
        {title}
      </div>
    </div>
  );
}

/** Tabular-figures money string. */
export function Money({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <span style={{ ...tnum, ...style }}>{children}</span>;
}
