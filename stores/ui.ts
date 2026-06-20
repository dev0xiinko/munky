import { create } from "zustand";
import type { SalaryFrequency } from "@/types";

export type Screen = "home" | "expenses" | "bills" | "savings" | "analytics";
export type Overlay = "addExpense" | "afford" | "clients" | "budget" | "settings" | null;
export type DashLayout = "focus" | "grid";
export type ChartStyle = "area" | "bars";

interface UIState {
  screen: Screen;
  overlay: Overlay;
  dashLayout: DashLayout;
  chartStyle: ChartStyle;

  // keypad drafts (entered in pesos as a decimal string)
  draftAmt: string;
  draftCat: string;
  draftDesc: string;
  affordAmt: string;

  // client form
  showClientForm: boolean;
  cfName: string;
  cfAmount: string;
  cfFreq: SalaryFrequency;

  go: (screen: Screen) => void;
  openOverlay: (overlay: Exclude<Overlay, null>) => void;
  closeOverlay: () => void;
  setDashLayout: (l: DashLayout) => void;
  setChartStyle: (c: ChartStyle) => void;

  selectCat: (key: string) => void;
  setDraftDesc: (v: string) => void;
  pressKey: (field: "draftAmt" | "affordAmt", key: string) => void;
  resetDraft: () => void;

  toggleClientForm: () => void;
  setCfName: (v: string) => void;
  setCfAmount: (v: string) => void;
  setCfFreq: (f: SalaryFrequency) => void;
  resetClientForm: () => void;
}

function applyKey(value: string, key: string): string {
  let v = String(value);
  if (key === "del") return v.length <= 1 ? "0" : v.slice(0, -1);
  if (key === ".") return v.includes(".") ? v : v + ".";
  if (v.includes(".")) {
    const [, dec] = v.split(".");
    if (dec.length >= 2) return v; // max 2 decimals
  }
  return v === "0" ? key : v + key;
}

export const useUI = create<UIState>((set) => ({
  screen: "home",
  overlay: null,
  dashLayout: "focus",
  chartStyle: "area",

  draftAmt: "0",
  draftCat: "food",
  draftDesc: "",
  affordAmt: "0",

  showClientForm: false,
  cfName: "",
  cfAmount: "",
  cfFreq: "monthly",

  go: (screen) => set({ screen, overlay: null }),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null, showClientForm: false }),
  setDashLayout: (dashLayout) => set({ dashLayout }),
  setChartStyle: (chartStyle) => set({ chartStyle }),

  selectCat: (draftCat) => set({ draftCat }),
  setDraftDesc: (draftDesc) => set({ draftDesc }),
  pressKey: (field, key) => set((s) => ({ [field]: applyKey(s[field], key) }) as Partial<UIState>),
  resetDraft: () => set({ draftAmt: "0", draftDesc: "", draftCat: "food" }),

  toggleClientForm: () => set((s) => ({ showClientForm: !s.showClientForm })),
  setCfName: (cfName) => set({ cfName }),
  setCfAmount: (cfAmount) => set({ cfAmount }),
  setCfFreq: (cfFreq) => set({ cfFreq }),
  resetClientForm: () => set({ cfName: "", cfAmount: "", cfFreq: "monthly", showClientForm: false }),
}));
