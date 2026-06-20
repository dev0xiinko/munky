"use client";

import { useState } from "react";
import {
  addClient,
  deleteClient,
  deleteIncome,
  recordIncome,
  updateClient,
} from "@/lib/db/actions";
import { useIncomeTransactions } from "@/hooks/useData";
import { shortDate, todayISODate } from "@/lib/dates";
import { fromCentavos, formatPHP } from "@/lib/money";
import { useUI } from "@/stores/ui";
import type { Client, SalaryFrequency } from "@/types";
import type { Derived } from "@/hooks/useDerived";
import { BackHeader, overlayShell } from "@/components/shared/Keypad";
import { card, mono, tnum, Eyebrow } from "@/components/shared/ui";

export default function Clients({ d }: { d: Derived }) {
  const {
    closeOverlay,
    showClientForm,
    toggleClientForm,
    cfName,
    cfAmount,
    cfFreq,
    setCfName,
    setCfAmount,
    setCfFreq,
    resetClientForm,
  } = useUI();

  const income = useIncomeTransactions();
  const [logFor, setLogFor] = useState<string | null>(null);
  const [logAmt, setLogAmt] = useState("");
  const [editFor, setEditFor] = useState<string | null>(null);
  const [efName, setEfName] = useState("");
  const [efAmount, setEfAmount] = useState("");
  const [efFreq, setEfFreq] = useState<SalaryFrequency>("monthly");

  const startEdit = (client: Client) => {
    setLogFor(null);
    setEditFor(client.id);
    setEfName(client.name);
    setEfAmount(String(fromCentavos(client.salary_centavos)));
    setEfFreq(client.salary_frequency);
  };
  const saveEdit = async (client: Client) => {
    await updateClient(client, efName, parseFloat(efAmount) || 0, efFreq);
    setEditFor(null);
  };

  const monthPrefix = todayISODate().slice(0, 7);
  const receivedThisMonth = income
    .filter((t) => t.received_date.startsWith(monthPrefix))
    .reduce((s, t) => s + t.amount_centavos, 0);
  const nameOf = (id: string) => d.clientsView.find((c) => c.id === id)?.name ?? "Income";
  const recent = [...income]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  const save = async () => {
    await addClient(cfName, parseFloat(cfAmount) || 0, cfFreq);
    resetClientForm();
  };

  const saveLog = async (client: Parameters<typeof recordIncome>[0]) => {
    await recordIncome(client, parseFloat(logAmt) || 0);
    setLogFor(null);
    setLogAmt("");
  };

  const freqBtn = (label: string, freq: "monthly" | "biweekly") => {
    const active = cfFreq === freq;
    return (
      <div
        className="cf-tap"
        onClick={() => setCfFreq(freq)}
        style={{ flex: 1, textAlign: "center", padding: 11, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? "#6F9E7E" : "#1A1C1A", color: active ? "#0E0F0E" : "#9BA09B" }}
      >
        {label}
      </div>
    );
  };

  return (
    <div style={overlayShell}>
      <BackHeader onClose={closeOverlay} />
      <div className="cf-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 26px" }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px", marginBottom: 14 }}>Income sources</div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, ...card, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#9BA09B" }}>Expected /mo</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 5, ...tnum }}>{d.clientTotalFmt}</div>
          </div>
          <div style={{ flex: 1, ...card, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#9BA09B" }}>Received · June</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 5, color: "#8FC4A0", ...tnum }}>{formatPHP(receivedThisMonth)}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {d.clientsView.map((c) => (
            <div key={c.id} style={{ ...card, borderRadius: 13, padding: "14px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "#242724", border: "1px solid #2E312E", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#8FC4A0" }}>{c.mono}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#6B706B", marginTop: 1 }}>{c.freqLabel} · next {c.nextLabel} ({c.inDays})</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#8FC4A0", ...tnum }}>{c.amtFmt}</div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 5 }}>
                    <span
                      className="cf-tap"
                      onClick={() => (editFor === c.id ? setEditFor(null) : startEdit(c.client))}
                      style={{ fontSize: 11, fontWeight: 600, color: "#9BA09B", cursor: "pointer" }}
                    >
                      {editFor === c.id ? "Close" : "Edit"}
                    </span>
                    <span
                      className="cf-tap"
                      onClick={() => { setEditFor(null); setLogFor(logFor === c.id ? null : c.id); setLogAmt(""); }}
                      style={{ fontSize: 11, fontWeight: 600, color: "#8FC4A0", cursor: "pointer" }}
                    >
                      {logFor === c.id ? "Cancel" : "+ Log"}
                    </span>
                  </div>
                </div>
              </div>

              {editFor === c.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <input className="cf-in" placeholder="Name" value={efName} onChange={(e) => setEfName(e.target.value)} />
                  <input className="cf-in" type="number" inputMode="decimal" placeholder="Amount" value={efAmount} onChange={(e) => setEfAmount(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["monthly", "biweekly"] as const).map((fr) => (
                      <div
                        key={fr}
                        className="cf-tap"
                        onClick={() => setEfFreq(fr)}
                        style={{ flex: 1, textAlign: "center", padding: 10, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: efFreq === fr ? "#6F9E7E" : "#1A1C1A", color: efFreq === fr ? "#0E0F0E" : "#9BA09B", border: efFreq === fr ? "none" : "1px solid #2E312E" }}
                      >
                        {fr === "monthly" ? "Monthly" : "Every 2 weeks"}
                      </div>
                    ))}
                  </div>
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

              {logFor === c.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    className="cf-in"
                    type="number"
                    inputMode="decimal"
                    placeholder={`Amount received (${c.amtFmt})`}
                    value={logAmt}
                    onChange={(e) => setLogAmt(e.target.value)}
                    autoFocus
                  />
                  <div className="cf-tap" onClick={() => saveLog(c.client)} style={{ flex: "none", display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 14, background: "#6F9E7E", color: "#0E0F0E" }}>
                    Save
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {showClientForm && (
          <div style={{ ...card, borderRadius: 14, padding: 16, marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="cf-in" placeholder="Client / source name" value={cfName} onChange={(e) => setCfName(e.target.value)} />
            <input className="cf-in" type="number" placeholder="Amount" value={cfAmount} onChange={(e) => setCfAmount(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              {freqBtn("Monthly", "monthly")}
              {freqBtn("Every 2 weeks", "biweekly")}
            </div>
            <div className="cf-tap" onClick={save} style={{ textAlign: "center", padding: 14, borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 15, background: "#6F9E7E", color: "#0E0F0E" }}>
              Save income source
            </div>
          </div>
        )}

        <div className="cf-tap" onClick={toggleClientForm} style={{ textAlign: "center", padding: 14, borderRadius: 12, border: "1px dashed #3A3F3A", color: "#9BA09B", marginTop: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          + Add income source
        </div>

        {recent.length > 0 && (
          <>
            <Eyebrow style={{ margin: "22px 2px 10px" }}>Recent income</Eyebrow>
            <div style={{ ...card, borderRadius: 14, overflow: "hidden" }}>
              {recent.map((t) => (
                <div key={t.id} className="cf-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderBottom: "1px solid #232623" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{nameOf(t.client_id)}</div>
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
