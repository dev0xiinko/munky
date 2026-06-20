import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline · CashflowOS",
};

// Shown only when a navigation fails before the shell is cached. Once installed,
// the precached shell + IndexedDB mean the real app loads offline anyway.
export default function Offline() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "#0E0F0E",
        color: "#E8EAE8",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "#6F9E7E",
        }}
      >
        CashflowOS
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px" }}>You&apos;re offline</div>
      <div style={{ fontSize: 14, color: "#9BA09B", maxWidth: 280 }}>
        Reopen the app from your home screen — your data is stored on-device and works without a connection.
      </div>
    </div>
  );
}
