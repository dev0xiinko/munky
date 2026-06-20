"use client";

import { deleteBill, toggleBill } from "@/lib/db/actions";
import { useBillPayments, useBills } from "@/hooks/useData";
import {
  billGroup,
  billStarted,
  isPaidThisCycle,
  lastPaidDate,
  paymentsForBill,
  unpaidStatus,
  type BillGroup,
} from "@/lib/bills";
import { BILL_STATUS_META } from "@/lib/constants";
import { dayOfMonth, shortDate, shortMonthLabel, todayISODate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import type { Bill, BillPayment } from "@/types";
import type { Derived } from "@/hooks/useDerived";
import { card, mono, tnum } from "@/components/shared/ui";
import { ScreenHeader, Eyebrow } from "@/components/shared/ui";
import RemindersToggle from "@/components/bills/RemindersToggle";
import AddBillForm from "@/components/bills/AddBillForm";

const ORDER: Record<string, number> = { overdue: 0, due: 1, upcoming: 2, paid: 3 };
const MONTH = new Date().toLocaleString("en-US", { month: "long" });

interface Row {
  bill: Bill;
  paid: boolean;
  statusKey: string;
  subLine: string;
  amtFmt: string;
}

function buildRow(bill: Bill, payments: BillPayment[], today: string, elapsed: number): Row {
  const group = billGroup(bill);
  const paid = isPaidThisCycle(bill, payments, today);
  const started = billStarted(bill, today);
  const statusKey = paid ? "paid" : !started ? "upcoming" : unpaidStatus(bill, elapsed);
  const lastPaid = lastPaidDate(bill, payments, today);
  const dueOrPaid =
    paid && lastPaid
      ? `Paid ${shortDate(lastPaid)}`
      : !started
        ? `Starts ${shortMonthLabel(bill.start_date)}`
        : `Due day ${bill.due_day}`;

  let subLine = dueOrPaid;
  if (group === "loan" && bill.term_months) {
    const n = paymentsForBill(bill, payments).length;
    subLine = n >= bill.term_months ? `Paid off (${n}/${bill.term_months})` : `${n}/${bill.term_months} paid · ${dueOrPaid}`;
  }
  return { bill, paid, statusKey, subLine, amtFmt: formatPHP(bill.amount_centavos) };
}

function Section({
  title,
  rows,
  payments,
}: {
  title: string;
  rows: Row[];
  payments: BillPayment[];
}) {
  if (!rows.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <Eyebrow style={{ margin: "0 2px 10px" }}>{title}</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => {
          const m = BILL_STATUS_META[r.statusKey];
          return (
            <div
              key={r.bill.id}
              className="cf-tap cf-row"
              onClick={() => toggleBill(r.bill, payments)}
              style={{ display: "flex", alignItems: "center", gap: 13, ...card, borderRadius: 13, padding: "14px 15px", cursor: "pointer" }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 8, flex: "none", border: `1.5px solid ${r.paid ? "#6F9E7E" : "#3A3F3A"}`, background: r.paid ? "#6F9E7E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E0F0E", fontSize: 14, fontWeight: 800 }}>
                {r.paid ? "✓" : ""}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.bill.name}</div>
                <div style={{ fontSize: 12, color: "#6B706B", marginTop: 1 }}>{r.subLine}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, ...tnum }}>{r.amtFmt}</div>
                <div style={{ ...mono, fontSize: 10, letterSpacing: "0.5px", textTransform: "uppercase", marginTop: 3, padding: "2px 7px", borderRadius: 999, display: "inline-block", color: m.color, background: m.bg }}>
                  {m.label}
                </div>
              </div>
              <div
                className="cf-tap"
                onClick={(e) => { e.stopPropagation(); deleteBill(r.bill); }}
                style={{ flex: "none", color: "#5E635E", fontSize: 17, lineHeight: 0, cursor: "pointer", padding: "4px 2px 4px 6px" }}
                aria-label="Delete bill"
              >
                ×
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Bills({ d }: { d: Derived }) {
  const bills = useBills();
  const payments = useBillPayments();
  const today = todayISODate();
  const elapsed = dayOfMonth();

  const rows = bills.map((b) => buildRow(b, payments, today, elapsed));
  const byGroup = (g: BillGroup) =>
    rows
      .filter((r) => billGroup(r.bill) === g)
      .sort((a, b) => (ORDER[a.statusKey] - ORDER[b.statusKey]) || (a.bill.due_day - b.bill.due_day));

  return (
    <div style={{ animation: "cfFade .25s ease" }}>
      <ScreenHeader eyebrow={`Recurring · ${MONTH}`} title="Bills" />
      <div style={{ padding: "0 20px" }}>
        <RemindersToggle />
        <div style={{ ...card, borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: "1.2px", textTransform: "uppercase", color: "#9BA09B" }}>Left to pay · {MONTH}</div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-1px", marginTop: 5, ...tnum }}>{d.billsRemainingFmt}</div>
          <div style={{ fontSize: 12.5, color: "#9BA09B", marginTop: 5 }}>
            <span style={{ color: "#8FC4A0" }}>{d.billsPaidFmt} paid</span> · {d.billsTotalFmt} total this month
          </div>
        </div>

        <Section title={`Monthly · ${MONTH}`} rows={byGroup("monthly")} payments={payments} />
        <Section title="Loans" rows={byGroup("loan")} payments={payments} />
        <Section title="One-time" rows={byGroup("onetime")} payments={payments} />

        <AddBillForm />
      </div>
    </div>
  );
}
