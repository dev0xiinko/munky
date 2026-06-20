"use client";

import { useState } from "react";
import { addBill } from "@/lib/db/actions";
import { todayISODate } from "@/lib/dates";
import type { BillType } from "@/types";
import { card } from "@/components/shared/ui";

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="cf-tap"
      onClick={onClick}
      style={{ flex: 1, textAlign: "center", padding: 11, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? "#6F9E7E" : "#1A1C1A", color: active ? "#0E0F0E" : "#9BA09B", border: active ? "none" : "1px solid #2E312E" }}
    >
      {children}
    </div>
  );
}

export default function AddBillForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [startMonth, setStartMonth] = useState(todayISODate().slice(0, 7));
  const [reminder, setReminder] = useState("3");
  const [recurring, setRecurring] = useState(true);
  const [type, setType] = useState<BillType>("regular");
  const [term, setTerm] = useState("");

  const isLoan = type === "loan";
  const valid =
    name.trim() &&
    (parseFloat(amount) || 0) > 0 &&
    Number(dueDay) >= 1 &&
    /^\d{4}-\d{2}$/.test(startMonth) &&
    (!isLoan || Number(term) >= 1);

  const reset = () => {
    setName(""); setAmount(""); setDueDay(""); setReminder("3");
    setStartMonth(todayISODate().slice(0, 7));
    setRecurring(true); setType("regular"); setTerm("");
  };

  const save = async () => {
    if (!valid) return;
    await addBill(name, parseFloat(amount) || 0, Number(dueDay), {
      reminderDaysBefore: Number(reminder) || 0,
      isRecurring: recurring,
      billType: type,
      termMonths: isLoan ? Number(term) : null,
      startDate: `${startMonth}-01`,
    });
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <div
        className="cf-tap"
        onClick={() => setOpen(true)}
        style={{ textAlign: "center", padding: 14, borderRadius: 12, border: "1px dashed #3A3F3A", color: "#9BA09B", marginTop: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
      >
        + Add bill
      </div>
    );
  }

  const label = (text: string) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#6B706B", margin: "2px 2px -2px" }}>{text}</div>
  );

  return (
    <div style={{ ...card, borderRadius: 14, padding: 16, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="cf-in" placeholder={isLoan ? "Loan name (e.g. Car loan)" : "Bill name (e.g. Rent)"} value={name} onChange={(e) => setName(e.target.value)} autoFocus />

      {/* type */}
      {label("Type")}
      <div style={{ display: "flex", gap: 8 }}>
        <Seg active={type === "regular"} onClick={() => setType("regular")}>Regular</Seg>
        <Seg active={type === "loan"} onClick={() => setType("loan")}>Loan</Seg>
      </div>

      <input className="cf-in" type="number" inputMode="decimal" placeholder={isLoan ? "Monthly installment" : "Amount"} value={amount} onChange={(e) => setAmount(e.target.value)} />

      <div style={{ display: "flex", gap: 10 }}>
        <input className="cf-in" type="number" inputMode="numeric" placeholder="Due day (1–31)" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        {isLoan ? (
          <input className="cf-in" type="number" inputMode="numeric" placeholder="Months to pay" value={term} onChange={(e) => setTerm(e.target.value)} />
        ) : (
          <input className="cf-in" type="number" inputMode="numeric" placeholder="Remind days before" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        )}
      </div>

      {/* starting month — billing begins this month, not necessarily the current one */}
      {label("Starts")}
      <input className="cf-in" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
      <div style={{ fontSize: 11.5, color: "#6B706B", margin: "-4px 2px 0" }}>
        First month this bill is billed (due day {Number(dueDay) >= 1 ? Number(dueDay) : "—"} of each month from then).
      </div>

      {/* recurrence — loans are always monthly until paid off */}
      {!isLoan && (
        <>
          {label("Repeats")}
          <div style={{ display: "flex", gap: 8 }}>
            <Seg active={recurring} onClick={() => setRecurring(true)}>Every month</Seg>
            <Seg active={!recurring} onClick={() => setRecurring(false)}>One-time</Seg>
          </div>
        </>
      )}

      {isLoan && Number(term) >= 1 && (parseFloat(amount) || 0) > 0 && (
        <div style={{ fontSize: 11.5, color: "#6B706B", margin: "0 2px" }}>
          Total over {Number(term)} months: ₱{(Math.round(parseFloat(amount)) * Number(term)).toLocaleString("en-US")}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <div className="cf-tap" onClick={() => { reset(); setOpen(false); }} style={{ flex: "none", textAlign: "center", padding: "14px 18px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#9BA09B", background: "#1A1C1A", border: "1px solid #2E312E" }}>
          Cancel
        </div>
        <div className="cf-tap" onClick={save} style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 15, background: valid ? "#6F9E7E" : "#242724", color: valid ? "#0E0F0E" : "#5E635E" }}>
          {isLoan ? "Save loan" : "Save bill"}
        </div>
      </div>
    </div>
  );
}
