"use client";

import { useState } from "react";
import {
  addClient,
  deleteClient,
  deleteIncome,
  recordInstantIncome,
  updateClient,
} from "@/lib/db/actions";
import { useIncomeTransactions } from "@/hooks/useData";
import { shortDate, todayISODate } from "@/lib/dates";
import { fromCentavos, formatPHP } from "@/lib/money";
import { useUI } from "@/stores/ui";
import type { Client, IncomeTransaction, SalaryFrequency } from "@/types";
import type { Derived } from "@/hooks/useDerived";
import { BackHeader, overlayShell } from "@/components/shared/Keypad";
import { card, mono, tnum, Eyebrow } from "@/components/shared/ui";

const thisMonth = () => todayISODate().slice(0, 7);
const labelRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } as const;
const labelText = { fontSize: 13, color: "#9BA09B", fontWeight: 600 } as const;
const hint = { fontSize: 12, color: "#6B706B" } as const;
const freqStyle = (active: boolean) =>
  ({
    flex: 1,
    textAlign: "center" as const,
    padding: "10px 6px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
    background: active ? "#6F9E7E" : "#1A1C1A",
    color: active ? "#0E0F0E" : "#9BA09B",
    border: active ? "none" : "1px solid #2E312E",
  });

export default function Clients({ d }: { d: Derived }) {
  const {
    closeOverlay,
    showClientForm,
    toggleClientForm,
    cfName,
    cfAmount,
    cfFreq,
    cfPayDay,
    cfStartDate,
    setCfName,
    setCfAmount,
    setCfFreq,
    setCfPayDay,
    setCfStartDate,
    resetClientForm,
  } = useUI();

  const income = useIncomeTransactions();

  // instant ("got money now") income
  const [iiLabel, setIiLabel] = useState("");
  const [iiAmount, setIiAmount] = useState("");

  // edit form
  const [editFor, setEditFor] = useState<string | null>(null);
  const [efName, setEfName] = useState("");
  const [efAmount, setEfAmount] = useState("");
  const [efFreq, setEfFreq] = useState<SalaryFrequency>("monthly");
  const [efPayDay, setEfPayDay] = useState("30");
  const [efStartMonth, setEfStartMonth] = useState(thisMonth());

  const startEdit = (c: Client) => {
    setEditFor(c.id);
    setEfName(c.name);
    setEfAmount(String(fromCentavos(c.salary_centavos)));
    setEfFreq(c.salary_frequency);
    setEfPayDay(String(c.pay_day || 30));
    setEfStartMonth((c.start_date || "").slice(0, 7) || thisMonth());
  };
  const saveEdit = async (c: Client) => {
    await updateClient(c, efName, parseFloat(efAmount) || 0, efFreq, {
      payDay: parseInt(efPayDay) || 30,
      startDate: (efStartMonth || thisMonth()) + "-01",
    });
    setEditFor(null);
  };

  const save = async () => {
    await addClient(cfName, parseFloat(cfAmount) || 0, cfFreq, {
      payDay: parseInt(cfPayDay) || 30,
      startDate: (cfStartDate || thisMonth()) + "-01",
    });
    resetClientForm();
  };

  const addInstant = async () => {
    await recordInstantIncome(iiLabel, parseFloat(iiAmount) || 0);
    setIiLabel("");
    setIiAmount("");
  };

  const recent = [...income].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const labelOf = (t: IncomeTransaction) =>
    d.clientsView.find((c) => c.client.id === t.client_id)?.name || t.notes || "Income";

  const freqBtn = (label: string, freq: SalaryFrequency) => (
    <div className="cf-tap" onClick={() => setCfFreq(freq)} style={freqStyle(cfFreq === freq)}>
      {label}
    </div>
  );

  const scheduleHint = (freq: SalaryFrequency) =>
    freq === "semimonthly" ? (
      <div style={hint}>Pays the 15th &amp; end of month.</div>
    ) : freq === "biweekly" ? (
      <div style={hint}>Every 2 weeks from the start of the month.</div>
    ) : null;

  return (
    <div style={overlayShell}>
      <BackHeader onClose={closeOverlay} />
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 26px" }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px", marginBottom: 14 }}>Income sources</div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, ...card, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#9BA09B" }}>Received · {d.monthLong}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 5, color: "#8FC4A0", ...tnum }}>{d.incomeFmt}</div>
          </div>
          <div style={{ flex: 1, ...card, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#9BA09B" }}>Expected · {d.monthLong}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 5, ...tnum }}>{d.expectedFmt}</div>
          </div>
        </div>

        {/* instant income */}
        <div style={{ ...card, borderRadius: 14, padding: "12px 14px", marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Got money? Add it now</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="cf-in" style={{ flex: 1.5 }} placeholder="From (e.g. Mom)" value={iiLabel} onChange={(e) => setIiLabel(e.target.value)} />
            <input className="cf-in" style={{ flex: 1 }} type="number" inputMode="decimal" placeholder="Amount" value={iiAmount} onChange={(e) => setIiAmount(e.target.value)} />
            <div
              className="cf-tap"
              onClick={addInstant}
              style={{ flex: "none", display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 11, cursor: "pointer", fontWeight: 800, fontSize: 18, background: "#6F9E7E", color: "#0E0F0E" }}
              aria-label="Add income now"
            >
              +
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {d.clientsView.map((c) => (
            <div key={c.id} style={{ ...card, borderRadius: 13, padding: "14px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "#242724", border: "1px solid #2E312E", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#8FC4A0" }}>{c.mono}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#6B706B", marginTop: 1 }}>
                    {c.freqLabel}
                    {c.nextLabel !== "—" ? ` · next ${c.nextLabel}${c.inDays ? ` (${c.inDays})` : ""}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8FC4A0", marginTop: 2, ...tnum }}>
                    {c.receivedFmt} in · {c.expectedFmt} expected
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#8FC4A0", ...tnum }}>{c.amtFmt}</div>
                  <span
                    className="cf-tap"
                    onClick={() => (editFor === c.id ? setEditFor(null) : startEdit(c.client))}
                    style={{ fontSize: 11, fontWeight: 600, color: "#9BA09B", cursor: "pointer", display: "inline-block", marginTop: 6 }}
                  >
                    {editFor === c.id ? "Close" : "Edit"}
                  </span>
                </div>
              </div>

              {editFor === c.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <input className="cf-in" placeholder="Name" value={efName} onChange={(e) => setEfName(e.target.value)} />
                  <input className="cf-in" type="number" inputMode="decimal" placeholder="Amount per paycheck" value={efAmount} onChange={(e) => setEfAmount(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["monthly", "semimonthly", "biweekly"] as const).map((fr) => (
                      <div key={fr} className="cf-tap" onClick={() => setEfFreq(fr)} style={freqStyle(efFreq === fr)}>
                        {fr === "monthly" ? "Monthly" : fr === "semimonthly" ? "Twice a month" : "Every 2 weeks"}
                      </div>
                    ))}
                  </div>
                  {efFreq === "monthly" && (
                    <label style={labelRow}>
                      <span style={labelText}>Pay day</span>
                      <input className="cf-in" style={{ width: 90 }} type="number" inputMode="numeric" min={1} max={31} value={efPayDay} onChange={(e) => setEfPayDay(e.target.value)} />
                    </label>
                  )}
                  {scheduleHint(efFreq)}
                  <label style={labelRow}>
                    <span style={labelText}>Starts</span>
                    <input className="cf-in" style={{ width: 170 }} type="month" value={efStartMonth} onChange={(e) => setEfStartMonth(e.target.value)} />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      className="cf-tap"
                      onClick={() => { deleteClient(c.client); setEditFor(null); }}
                      style={{ flex: "none", padding: "12px 16px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#D08B7B", background: "rgba(199,123,107,0.1)", border: "1px solid rgba(199,123,107,0.3)" }}
                    >
                      Delete
                    </div>
                    <div className="cf-tap" onClick={() => saveEdit(c.client)} style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 15, background: "#6F9E7E", color: "#0E0F0E" }}>
                      Save changes
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {showClientForm && (
          <div style={{ ...card, borderRadius: 14, padding: 16, marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="cf-in" placeholder="Client / source name" value={cfName} onChange={(e) => setCfName(e.target.value)} />
            <input className="cf-in" type="number" inputMode="decimal" placeholder="Amount per paycheck" value={cfAmount} onChange={(e) => setCfAmount(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              {freqBtn("Monthly", "monthly")}
              {freqBtn("Twice a month", "semimonthly")}
              {freqBtn("Every 2 weeks", "biweekly")}
            </div>
            {cfFreq === "monthly" && (
              <label style={labelRow}>
                <span style={labelText}>Pay day</span>
                <input className="cf-in" style={{ width: 90 }} type="number" inputMode="numeric" min={1} max={31} placeholder="30" value={cfPayDay} onChange={(e) => setCfPayDay(e.target.value)} />
              </label>
            )}
            {scheduleHint(cfFreq)}
            <label style={labelRow}>
              <span style={labelText}>Starts</span>
              <input className="cf-in" style={{ width: 170 }} type="month" value={cfStartDate || thisMonth()} onChange={(e) => setCfStartDate(e.target.value)} />
            </label>
            <div className="cf-tap" onClick={save} style={{ textAlign: "center", padding: 14, borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 15, background: "#6F9E7E", color: "#0E0F0E" }}>
              Save income source
            </div>
          </div>
        )}

        <div className="cf-tap" onClick={toggleClientForm} style={{ textAlign: "center", padding: 14, borderRadius: 12, border: "1px dashed #3A3F3A", color: "#9BA09B", marginTop: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          {showClientForm ? "Close" : "+ Add income source"}
        </div>

        {recent.length > 0 && (
          <>
            <Eyebrow style={{ margin: "22px 2px 10px" }}>One-off income</Eyebrow>
            <div style={{ ...card, borderRadius: 14, overflow: "hidden" }}>
              {recent.map((t) => (
                <div key={t.id} className="cf-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderBottom: "1px solid #232623" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{labelOf(t)}</div>
                    <div style={{ fontSize: 12, color: "#6B706B", marginTop: 1 }}>{shortDate(t.received_date)}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#8FC4A0", ...tnum }}>+{formatPHP(t.amount_centavos)}</div>
                  <div className="cf-tap" onClick={() => deleteIncome(t)} style={{ flex: "none", color: "#6B706B", fontSize: 17, lineHeight: 0, cursor: "pointer", padding: 4 }}>×</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
