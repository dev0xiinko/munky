"use client";

import {
  useBills,
  useBillPayments,
  useBudget,
  useClients,
  useExpenses,
  useGoals,
  useIncomeTransactions,
  useSavingsContributions,
} from "./useData";
import { billStarted, isPaidThisCycle } from "@/lib/bills";
import { CATEGORIES } from "@/lib/constants";
import {
  dayOfMonth,
  daysInMonth,
  daysLeftInMonth,
  lastNMonths,
  shortDate,
  shortMonthLabel,
  todayISODate,
} from "@/lib/dates";
import { formatPHP, formatSigned } from "@/lib/money";
import {
  canAfford,
  monthlyIncomeOf,
  monthlySavings,
  projectedMonthEnd,
  savingsRate,
  totalIncome,
  totalSpent,
} from "@/lib/finance";
import { useUI } from "@/stores/ui";

const f = formatPHP;

function diffDays(iso: string): number {
  const today = new Date(todayISODate() + "T00:00:00");
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function useDerived() {
  const expenses = useExpenses();
  const bills = useBills();
  const billPayments = useBillPayments();
  const clients = useClients();
  const goals = useGoals();
  const budget = useBudget();
  const contributions = useSavingsContributions();
  const incomeTx = useIncomeTransactions();
  const affordAmt = useUI((s) => s.affordAmt);

  const daysLeft = daysLeftInMonth();
  const daysElapsed = dayOfMonth();
  const dim = daysInMonth();
  const monthLong = new Date().toLocaleString("en-US", { month: "long", timeZone: "Asia/Manila" });

  // Actual amount set aside this month (not the planned monthly figure), so the
  // dashboard deducts savings as they're really made.
  const monthPrefix = todayISODate().slice(0, 7);
  const savedThisMonth = contributions
    .filter((c) => c.contributed_date.startsWith(monthPrefix))
    .reduce((s, c) => s + c.amount_centavos, 0);

  // All spending figures are scoped to the CURRENT month — a monthly budget
  // app must not carry prior months' expenses into this month's totals.
  const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(monthPrefix));

  // Bills: total = monthly obligation (display); paid = what's actually been
  // paid this cycle (this is what reduces "remaining"). "Paid" is per-cycle
  // (this month for recurring/loan, ever for one-time).
  const today = todayISODate();
  // Only bills whose billing has begun count toward this month's obligation.
  // Bills scheduled to start in a future month are forecast-only (see Upcoming).
  const activeBills = bills.filter((b) => billStarted(b, today));
  const billsTotalC = activeBills.reduce((s, b) => s + b.amount_centavos, 0);
  const billUnpaid = (b: (typeof bills)[number]) => !isPaidThisCycle(b, billPayments, today);
  const billsRemainingC = activeBills.filter(billUnpaid).reduce((s, b) => s + b.amount_centavos, 0);
  const billsPaidC = billsTotalC - billsRemainingC;

  const income = totalIncome(clients);
  const spent = totalSpent(monthExpenses);
  const billsTotal = billsTotalC;

  // No manual monthly budget. Safe-to-spend is whatever income is left after the
  // money that's ALLOCATED away — bills and savings — even if it hasn't actually
  // been paid or set aside yet. We reserve the full bills obligation (paid +
  // still-to-pay) and the full planned monthly savings, then subtract what's
  // already been spent. (Month-rollover — releasing planned savings that go
  // un-committed by month end back into safe-to-spend — is not yet modelled.)
  const plannedSavingsC = monthlySavings(goals);
  const reservedC = billsTotalC + plannedSavingsC;
  const remaining = income - reservedC - spent; // "safe to spend"
  const committedC = spent + reservedC;
  const committedPct = income > 0 ? Math.max(0, Math.min(100, (committedC / income) * 100)) : 0;
  const dailyBudget = remaining / Math.max(1, daysLeft);

  // Headroom for ANOTHER savings contribution = income after bills, expenses,
  // and savings already set aside this month (planned savings not double-counted).
  const savingsRoomC = income - billsTotalC - spent - savedThisMonth;

  // Dashboard "Savings" + analytics reflect the allocated (planned) monthly figure.
  const savings = plannedSavingsC;

  // category spend map (this month)
  const catMap: Record<string, number> = {};
  for (const e of monthExpenses) catMap[e.category_key] = (catMap[e.category_key] ?? 0) + e.amount_centavos;
  const catList = CATEGORIES.map((c) => ({ ...c, amount: catMap[c.key] ?? 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // expenses list (this month, newest first)
  const expensesView = [...monthExpenses]
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.expense_date.localeCompare(a.expense_date))
    .map((e) => {
      const meta = CATEGORIES.find((c) => c.key === e.category_key) ?? CATEGORIES[0];
      return {
        id: e.id,
        exp: e,
        code: meta.code,
        catLabel: meta.name,
        desc: e.description,
        date: shortDate(e.expense_date),
        amtFmt: "−" + f(e.amount_centavos),
      };
    });
  const spentToday = monthExpenses
    .filter((e) => e.expense_date === today)
    .reduce((s, e) => s + e.amount_centavos, 0);

  // clients
  const clientsView = clients.map((c) => {
    const inDays = diffDays(c.next_pay_date);
    return {
      id: c.id,
      client: c,
      name: c.name,
      amtFmt: f(c.salary_centavos) + (c.salary_frequency === "biweekly" ? "/cycle" : "/mo"),
      freqLabel: c.salary_frequency === "biweekly" ? "Every 2 weeks" : "Monthly",
      nextLabel: shortDate(c.next_pay_date),
      inDays: inDays <= 0 ? "today" : "in " + inDays + "d",
      mono: (c.name.match(/[A-Za-z]/) ?? ["?"])[0].toUpperCase(),
    };
  });
  const clientTotal = totalIncome(clients);

  // goals
  const goalsView = goals.map((g) => {
    const pct = Math.min(100, (g.current_centavos / g.target_centavos) * 100);
    const done = g.current_centavos >= g.target_centavos;
    return {
      id: g.id,
      goal: g,
      name: g.name,
      currentFmt: f(g.current_centavos),
      targetFmt: f(g.target_centavos),
      monthlyFmt: f(g.monthly_contribution_centavos),
      pct,
      pctLabel: Math.round(pct) + "%",
      remainFmt: done ? "Goal reached" : f(g.target_centavos - g.current_centavos) + " to go",
      done,
    };
  });
  const totalSaved = goals.reduce((s, g) => s + g.current_centavos, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_centavos, 0);

  // budget by category
  const limits = budget?.category_limits ?? [];
  const limitOf = (key: string) => limits.find((l) => l.key === key)?.limit_centavos ?? 0;
  const catView = CATEGORIES.map((c) => {
    const sp = catMap[c.key] ?? 0;
    const lim = limitOf(c.key) || 1;
    const over = sp > lim;
    const pct = Math.min(100, (sp / lim) * 100);
    return {
      label: c.name,
      pct,
      barColor: over ? "#C77B6B" : "#6F9E7E",
      spentFmt: f(sp),
      limitFmt: f(lim),
      leftFmt: over ? "+" + f(sp - lim) + " over" : f(lim - sp) + " left",
      leftColor: over ? "#D08B7B" : "#9BA09B",
    };
  }).sort((a, b) => b.pct - a.pct);
  const budgetLimit = budget?.monthly_limit_centavos ?? 0;
  const budgetSpentPct = budgetLimit ? Math.min(100, (spent / budgetLimit) * 100) : 0;
  const projected = projectedMonthEnd(spent, daysElapsed, dim);
  const projOver = projected - budgetLimit;

  // Dashboard headline = "safe to spend" = the income left after allocations
  // (bills + planned savings) and what's already spent, computed above.
  const safeC = remaining;
  const safeDailyC = dailyBudget;
  const safeUsedPct = committedPct;
  const overAllocated = remaining < 0;

  // upcoming feed (derived from bills + clients)
  const kindMeta = {
    in: { c: "#8FC4A0", dot: "#6F9E7E" },
    due: { c: "#E8EAE8", dot: "#E8EAE8" },
    overdue: { c: "#D08B7B", dot: "#C77B6B" },
    upcoming: { c: "#9BA09B", dot: "#5E635E" },
  } as const;
  type Kind = keyof typeof kindMeta;
  const billItems = bills
    .filter(billUnpaid)
    .map((b) => {
      const started = billStarted(b, today);
      const d = b.due_day - daysElapsed;
      const kind: Kind = !started
        ? "upcoming"
        : b.due_day < daysElapsed
          ? "overdue"
          : b.due_day === daysElapsed
            ? "due"
            : "upcoming";
      const sub = !started
        ? `Starts ${shortMonthLabel(b.start_date)}`
        : kind === "overdue"
          ? `${Math.max(1, daysElapsed - b.due_day)} days overdue`
          : kind === "due"
            ? "Due today"
            : `Due in ${Math.max(1, d)} days`;
      // Scheduled (future) bills sort after everything due this month.
      const sort = !started ? 900 + b.due_day : kind === "overdue" ? -1 : Math.max(0, d);
      return { label: b.name, sub, amt: -b.amount_centavos, kind, sort };
    });
  const clientItems = clients.map((c) => {
    const d = diffDays(c.next_pay_date);
    return {
      label: c.name,
      sub: d <= 0 ? "Salary today" : `Salary in ${d} days`,
      amt: monthlyIncomeOf(c),
      kind: "in" as Kind,
      sort: Math.max(0, d),
    };
  });
  const upcomingView = [...billItems, ...clientItems]
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 5)
    .map((u) => ({
      label: u.label,
      sub: u.sub,
      amtFmt: (u.amt < 0 ? "−" : "+") + f(u.amt),
      amtColor: kindMeta[u.kind].c,
      dot: kindMeta[u.kind].dot,
    }));

  // afford
  const afAmtPeso = parseFloat(affordAmt) || 0;
  const afAmtC = Math.round(afAmtPeso * 100);
  const verdictCalc = canAfford(remaining, afAmtC, daysLeft);
  const afAfter = verdictCalc.afterExpense;
  const afDaily = verdictCalc.dailyBudget;
  let verdict: string, vColor: string, vBg: string, vSub: string;
  if (afAmtC <= 0) {
    verdict = "Enter an amount";
    vColor = "#9BA09B";
    vBg = "#1A1C1A";
    vSub = "See how it fits the rest of " + monthLong;
  } else if (afAfter < 0) {
    verdict = "Not this month";
    vColor = "#D08B7B";
    vBg = "rgba(199,123,107,0.13)";
    vSub = "Puts you " + f(afAfter) + " past your safe-to-spend";
  } else if (afDaily < 70000) {
    verdict = "Doable, but tight";
    vColor = "#D08B7B";
    vBg = "rgba(199,123,107,0.10)";
    vSub = "Leaves only " + f(afDaily) + "/day for " + daysLeft + " days";
  } else {
    verdict = "Yes — you can";
    vColor = "#8FC4A0";
    vBg = "rgba(111,158,126,0.13)";
    vSub = "Still " + f(afDaily) + "/day left for the month";
  }

  // analytics history — real last-6-months series (income vs expenses + savings
  // growth), replacing the old hardcoded demo arrays. Income uses the actual
  // income_transactions ledger; if none has ever been logged we fall back to
  // projected monthly income (sum of clients) so the chart isn't a flat zero.
  const months = lastNMonths(6);
  const hasIncomeLedger = incomeTx.length > 0;
  const trendSeries = months.map(({ key, label }) => ({
    m: label,
    inc: hasIncomeLedger
      ? incomeTx.filter((t) => t.received_date.startsWith(key)).reduce((s, t) => s + t.amount_centavos, 0)
      : income,
    exp: expenses.filter((e) => e.expense_date.startsWith(key)).reduce((s, e) => s + e.amount_centavos, 0),
  }));
  // Cumulative saved at each month-end = current total minus contributions made
  // after that month. Ends exactly at totalSaved; pre-app baseline stays flat.
  const savSeries = months.map(({ key }) =>
    totalSaved -
    contributions
      .filter((c) => c.contributed_date.slice(0, 7) > key)
      .reduce((s, c) => s + c.amount_centavos, 0),
  );
  const avgIncomeC = hasIncomeLedger
    ? Math.round(trendSeries.reduce((s, t) => s + t.inc, 0) / Math.max(1, trendSeries.length))
    : income;

  // analytics summary numbers
  const net = income - spent - billsTotal;
  const savRate = savingsRate(savings, income);

  return {
    daysLeft,
    daysElapsed,
    dim,
    income,
    spent,
    billsTotal,
    savings,
    remaining,
    committedPct,
    dailyBudget,
    savingsRoom: savingsRoomC,
    plannedSavings: plannedSavingsC,

    // Headline "safe to spend" = income left after bills + savings allocations.
    safeFmt: formatSigned(safeC),
    safeDailyFmt: formatSigned(safeDailyC),
    safeUsedPct,
    safeLabel: "Safe to spend",
    safeUsedLabel: "allocated",
    safeOfFmt: f(income) + " income",
    // Flag when allocations (bills + savings + spend) exceed income.
    safeNote: overAllocated ? "Allocations exceed your income this month" : "",

    fmt: f,
    incomeFmt: f(income),
    spentFmt: f(spent),
    billsFmt: f(billsTotal),
    savingsFmt: f(savings),
    remainingFmt: formatSigned(remaining),
    dailyBudgetFmt: formatSigned(dailyBudget),
    spentTodayFmt: f(spentToday),
    expenseCount: monthExpenses.length + " transactions",

    catList,
    catMap,
    expensesView,
    clientsView,
    goalsView,
    catView,
    upcomingView,

    billsPaid: billsPaidC,
    billsRemainingFmt: f(billsRemainingC),
    billsPaidFmt: f(billsPaidC),
    billsTotalFmt: f(billsTotal),

    clientTotalFmt: f(clientTotal),

    totalSaved,
    totalSavedFmt: f(totalSaved),
    totalTargetFmt: f(totalTarget),
    savedThisMonthFmt: f(savedThisMonth),

    budgetLimitFmt: f(budgetLimit),
    budgetSpentFmt: f(spent),
    budgetRemainFmt: formatSigned(budgetLimit - spent),
    budgetSpentPct,
    projectedFmt: f(projected),
    projOverFmt: (projOver >= 0 ? "+" : "−") + f(projOver),
    projOverColor: projOver >= 0 ? "#D08B7B" : "#8FC4A0",
    projOverLabel: projOver >= 0 ? "over budget" : "under budget",

    netFmt: formatSigned(net),
    savingsRatePct: savRate + "%",
    monthShort: months[months.length - 1].label,
    monthLong,
    avgIncomeFmt: f(avgIncomeC),
    trendSeries,
    savSeries,

    // afford
    afAfter,
    afterFmt: (afAfter < 0 ? "−" : "") + f(afAfter),
    afterColor: afAfter < 0 ? "#D08B7B" : "#E8EAE8",
    afDailyFmt: formatSigned(afDaily),
    verdict,
    vColor,
    vBg,
    vSub,
  };
}

export type Derived = ReturnType<typeof useDerived>;
