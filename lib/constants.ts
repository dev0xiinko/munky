// Static reference data shared across the app.

export const LOCAL_USER_ID = "local-user";

// Category metadata — `code` is the 2-letter mono badge from the design.
export const CATEGORIES = [
  { key: "food", name: "Food & Dining", code: "Fd", icon: "utensils" },
  { key: "transport", name: "Transport", code: "Tr", icon: "car" },
  { key: "coffee", name: "Coffee", code: "Cf", icon: "coffee" },
  { key: "software", name: "Software", code: "Sw", icon: "code" },
  { key: "shopping", name: "Shopping", code: "Sh", icon: "shopping-bag" },
  { key: "health", name: "Health", code: "Hl", icon: "heart-pulse" },
  { key: "ent", name: "Fun", code: "Fn", icon: "film" },
  { key: "other", name: "Other", code: "Ot", icon: "ellipsis" },
] as const;

// Per-category monthly budget limits, in PESOS (converted to centavos on seed).
export const CATEGORY_BUDGETS: Record<string, number> = {
  food: 12000,
  shopping: 6000,
  transport: 4000,
  software: 4000,
  health: 4000,
  coffee: 1500,
  ent: 2000,
  other: 1500,
};

// single-hue green ramp for the donut / charts
export const HUES = ["#8FC4A0", "#6F9E7E", "#588568", "#476B53", "#3a5644", "#314a3a", "#26352a"];

// Status display metadata for bills.
export const BILL_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  paid: { label: "Paid", color: "#7FB793", bg: "rgba(111,158,126,0.14)" },
  due: { label: "Due today", color: "#E8EAE8", bg: "rgba(232,234,232,0.10)" },
  upcoming: { label: "Upcoming", color: "#9BA09B", bg: "rgba(155,160,155,0.09)" },
  overdue: { label: "Overdue", color: "#D08B7B", bg: "rgba(199,123,107,0.15)" },
};
