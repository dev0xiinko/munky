"use client";

import { useUI, type Screen } from "@/stores/ui";

const ICONS: Record<Screen, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </>
  ),
  expenses: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  bills: (
    <>
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M4 9h16M8 2v4M16 2v4" />
    </>
  ),
  savings: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
  analytics: <path d="M5 20V11M12 20V4M19 20v-6" />,
};

const TABS: { screen: Screen; label: string }[] = [
  { screen: "home", label: "Home" },
  { screen: "expenses", label: "Spend" },
  { screen: "bills", label: "Bills" },
  { screen: "savings", label: "Goals" },
  { screen: "analytics", label: "Stats" },
];

export default function TabBar() {
  const { screen, go } = useUI();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "calc(90px + env(safe-area-inset-bottom))", background: "rgba(14,15,14,0.86)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", borderTop: "1px solid #232623", display: "flex", alignItems: "flex-start", padding: "11px 8px env(safe-area-inset-bottom)", zIndex: 30 }}>
      {TABS.map((t) => {
        const active = screen === t.screen;
        return (
          <div
            key={t.screen}
            className="cf-tap"
            onClick={() => go(t.screen)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", color: active ? "#8FC4A0" : "#5E635E" }}
          >
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[t.screen]}
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}
