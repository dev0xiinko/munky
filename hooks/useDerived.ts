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
  monthlySavings,
  projectedMonthEnd,
  savingsRate,
  totalSpent,
} from "@/lib/finance";
import {
  accruedThisMonth,
  expectedThisMonth,
  incomeForMonth,
  nextPayday,
} from "@/lib/income";
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

  const spent = totalSpent(monthExpenses);
  const billsTotal = billsTotalC;

  // INCOME IS ACTUALS. It starts at ₱0 each month and accrues as each source's
  // scheduled paydays pass, plus any one-off ("instant") income received this
  // month. Money you haven't been paid yet does NOT count.
  const instantThisMonthC = incomeTx
    .filter((t) => t.received_date.startsWith(monthPrefix))
    .reduce((s, t) => s + t.amount_centavos, 0);
  const accruedC = clients.reduce((s, c) => s + accruedThisMonth(c, today), 0);
  const income = accruedC + instantThisMonthC; // received so far this month
  // Expected by month-end = every scheduled payday this month + instant already in.
  const expectedMonthC = clients.reduce((s, c) => s + expectedThisMonth(c, today), 0);
  const expectedC = expectedMonthC + instantThisMonthC;

  // Cash-on-hand model: "safe to spend" is the money you've actually RECEIVED
  // minus what's actually left your hands — expenses, bills you've PAID, and
  // savings you've set aside. Unpaid bills / un-set-aside savings don't reduce
  // it (they show under Upcoming / Left to pay); paying them is what moves it.
  const plannedSavingsC = monthlySavings(goals);
  const outflowC = spent + billsPaidC + savedThisMonth;
  const remaining = income - outflowC; // safe to spend = cash on hand
  const committedPct = income > 0 ? Math.max(0, Math.min(100, (outflowC / income) * 100)) : 0;
  const dailyBudget = remaining / Math.max(1, daysLeft);

  // Headroom for ANOTHER savings contribution = cash on hand right now.
  const savingsRoomC = remaining;

  // Dashboard "Savings" mini-stat shows what's actually been set aside this month.
  const savings = savedThisMonth;

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

  // clients — what each source has paid SO FAR this month vs expected, plus the
  // next payday (computed from the schedule, not a stored date).
  const clientsView = clients.map((c) => {
    const np = nextPayday(c, today);
    const inDays = np ? diffDays(np) : null;
    return {
      id: c.id,
      client: c,
      name: c.name,
      amtFmt: f(c.salary_centavos) + (c.salary_frequency === "monthly" ? "/mo" : "/cycle"),
      freqLabel:
        c.salary_frequency === "biweekly"
          ? "Every 2 weeks"
          : c.salary_frequency === "semimonthly"
            ? "Twice a month"
            : "Monthly",
      receivedFmt: f(accruedThisMonth(c, today)),
      expectedFmt: f(expectedThisMonth(c, today)),
      nextLabel: np ? shortDate(np) : "—",
      inDays: inDays == null ? "" : inDays <= 0 ? "today" : "in " + inDays + "d",
      mono: (c.name.match(/[A-Za-z]/) ?? ["?"])[0].toUpperCase(),
    };
  });

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

  // Dashboard headline = "safe to spend" = cash on hand (received − actual outflow).
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
  const clientItems = clients.flatMap((c) => {
    const np = nextPayday(c, today);
    if (!np) return [];
    const d = diffDays(np);
    return [{
      label: c.name,
      sub: d <= 0 ? "Payday today" : `Payday in ${d} days`,
      amt: c.salary_centavos, // one paycheck
      kind: "in" as Kind,
      sort: Math.max(0, d),
    }];
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

  // analytics history — real last-6-months series. Income per month = scheduled
  // pay that landed that month (full for past months, accrued-to-date for the
  // current one) + any instant income logged that month.
  const months = lastNMonths(6);
  const trendSeries = months.map(({ key, label }) => {
    const [yy, mm] = key.split("-").map(Number);
    const sched = clients.reduce((s, c) => s + incomeForMonth(c, yy, mm, today), 0);
    const instant = incomeTx
      .filter((t) => t.received_date.startsWith(key))
      .reduce((s, t) => s + t.amount_centavos, 0);
    return {
      m: label,
      inc: sched + instant,
      exp: expenses.filter((e) => e.expense_date.startsWith(key)).reduce((s, e) => s + e.amount_centavos, 0),
    };
  });
  // Cumulative saved at each month-end = current total minus contributions made
  // after that month. Ends exactly at totalSaved; pre-app baseline stays flat.
  const savSeries = months.map(({ key }) =>
    totalSaved -
    contributions
      .filter((c) => c.contributed_date.slice(0, 7) > key)
      .reduce((s, c) => s + c.amount_centavos, 0),
  );
  const monthsWithIncome = trendSeries.filter((t) => t.inc > 0).length;
  const avgIncomeC = monthsWithIncome
    ? Math.round(trendSeries.reduce((s, t) => s + t.inc, 0) / monthsWithIncome)
    : 0;

  // analytics summary numbers
  const net = income - spent - billsPaidC - savedThisMonth; // received − actual outflow
  const savRate = savingsRate(plannedSavingsC, expectedMonthC);

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
    safeUsedLabel: "spent",
    safeOfFmt: f(income) + " received",
    expectedFmt: f(expectedC),
    expectedMonthFmt: f(expectedMonthC),
    // Flag when you've spent/paid more than you've actually received.
    safeNote: overAllocated ? "You've spent more than you've received this month" : "",

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

    clientTotalFmt: f(expectedMonthC),
    clientReceivedFmt: f(accruedC),
    instantThisMonthFmt: f(instantThisMonthC),

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
