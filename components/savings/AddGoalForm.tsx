"use client";

import { useState } from "react";
import { addGoal } from "@/lib/db/actions";
import { card } from "@/components/shared/ui";

export default function AddGoalForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [current, setCurrent] = useState("");

  const valid = name.trim() && (parseFloat(target) || 0) > 0;

  const save = async () => {
    if (!valid) return;
    await addGoal(name, parseFloat(target) || 0, parseFloat(monthly) || 0, parseFloat(current) || 0);
    setName("");
    setTarget("");
    setMonthly("");
    setCurrent("");
    setOpen(false);
  };

  if (!open) {
    return (
      <div
        className="cf-tap"
        onClick={() => setOpen(true)}
        style={{ textAlign: "center", padding: 14, borderRadius: 12, border: "1px dashed #3A3F3A", color: "#9BA09B", marginTop: 14, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
      >
        + New goal
      </div>
    );
  }

  return (
    <div style={{ ...card, borderRadius: 14, padding: 16, marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="cf-in" placeholder="Goal name (e.g. Emergency Fund)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div style={{ display: "flex", gap: 10 }}>
        <input className="cf-in" type="number" inputMode="decimal" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} />
        <input className="cf-in" type="number" inputMode="decimal" placeholder="Monthly" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
      </div>
      <input className="cf-in" type="number" inputMode="decimal" placeholder="Already saved (optional)" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <div className="cf-tap" onClick={() => setOpen(false)} style={{ flex: "none", textAlign: "center", padding: 14, borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#9BA09B", background: "#1A1C1A", border: "1px solid #2E312E", paddingLeft: 18, paddingRight: 18 }}>
          Cancel
        </div>
        <div className="cf-tap" onClick={save} style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 15, background: valid ? "#6F9E7E" : "#242724", color: valid ? "#0E0F0E" : "#5E635E" }}>
          Save goal
        </div>
      </div>
    </div>
  );
}
