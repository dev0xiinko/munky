# CashflowOS — Build Guide

Source of truth for building CashflowOS. Read this fully before writing code.
This file is meant to live at the repo root as `CLAUDE.md` (Claude Code loads it
automatically as project context).

---

## 1. What we're building

A single-user, offline-first personal finance PWA. Tracks income from multiple
clients, expenses, recurring bills, budgets, savings goals, and cashflow
forecasting. Installs to the iPhone home screen. Currency is **Philippine Peso (₱)**.

**The one rule that shapes everything: never wait for Supabase.**
Every mutation writes to the local database (Dexie/IndexedDB) first, updates the
UI instantly, and queues a background sync. The network is treated as an
eventually-consistent backup, never a dependency for the UI.

```
User action → write Dexie → UI updates → enqueue sync → (background) push to Supabase
```

Single user, no collaboration. Conflict resolution is last-write-wins on
`updated_at`.

---

## 2. Stack

This supersedes the original PRD, which assumed Vite. We are on Next.js.

| Layer        | Choice                                                        |
|--------------|---------------------------------------------------------------|
| Framework    | Next.js 15 (App Router), React 19, TypeScript                 |
| Styling      | Tailwind CSS v4 + shadcn/ui (tokens in `app/globals.css`)     |
| Server state | TanStack Query v5 (reads from **Dexie**, not the network)     |
| Client state | Zustand (UI state, session, sync status)                      |
| Local DB     | Dexie.js (IndexedDB) — the UI's source of truth               |
| Backend      | Supabase — Postgres, Auth, Edge Functions, Cron              |
| PWA          | Serwist (`@serwist/next`) — service worker + offline cache    |
| Deploy       | Vercel                                                        |
| Fonts        | Geist + Geist Mono via `next/font` (`geist` package)          |

Because the data layer is local-first, almost everything is a Client Component
(`"use client"`). Supabase is reached through the JS SDK from the client for
sync, and through Edge Functions only for scheduled work (email reminders).
There is effectively no SSR data fetching — Next.js here is the app shell + PWA
host, not a data server.

---

## 3. Conventions (non-negotiable)

These prevent the classic finance/offline bugs. Follow them everywhere.

### Money is stored as integer centavos
Never store money as a float. `₱1,699.50` is stored as `169950` (integer).
- All amount columns are named `*_centavos` and typed `number` (integer).
- Convert only at the display boundary. Use `lib/money.ts`:
  ```ts
  export const toCentavos = (peso: number) => Math.round(peso * 100);
  export const fromCentavos = (c: number) => c / 100;
  export const formatPHP = (c: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })
      .format(c / 100);
  ```
- All arithmetic (totals, budgets, forecasts) happens in centavos.

### IDs are generated on the client
Records must exist locally before they ever reach Supabase, so the client owns
the primary key. Use `crypto.randomUUID()` for every `id`. This also makes sync
idempotent: re-pushing a record is an upsert on the same `id`, never a duplicate.

### Every syncable row carries timestamps
`created_at`, `updated_at` (ISO 8601 strings). `updated_at` is bumped on every
local mutation and is the basis for last-write-wins.

### Deletes are soft, then synced
Set `deleted_at` and enqueue a `delete` action. The UI filters out
`deleted_at != null`. This lets deletions propagate to Supabase even if they
happened offline.

### Dates vs timestamps
Calendar dates (pay dates, due dates, expense dates) are `YYYY-MM-DD` strings.
Timestamps (`created_at`, `updated_at`, `deleted_at`) are full ISO datetimes.
Store and compare in the user's local timezone (Asia/Manila).

### Row-Level Security on every table
Every Supabase table has RLS enabled with a policy:
`auth.uid() = user_id`. No table is ever exposed without it.

---

## 4. Folder structure

```
app/
  (auth)/
    login/page.tsx
  (app)/
    layout.tsx              # app shell: nav, sync indicator
    dashboard/page.tsx
    expenses/page.tsx
    clients/page.tsx
    bills/page.tsx
    savings/page.tsx
    budget/page.tsx
    analytics/page.tsx
  layout.tsx                # root: fonts, <html className="dark">
  globals.css               # design tokens (already built)
  manifest.ts               # PWA manifest
  sw.ts                     # Serwist service worker source
components/
  ui/                       # shadcn components
  dashboard/                # SummaryCard, UpcomingList, QuickActions
  expenses/                 # QuickAddExpense, ExpenseList
  clients/                  # ClientCard, ClientForm
  bills/                    # BillCard, BillStatusPill
  savings/                  # GoalCard (progress)
  budget/                   # BudgetMeter
  analytics/                # charts
  shared/                   # MoneyValue, AffordCalculator, SyncIndicator
lib/
  db/                       # Dexie schema + table accessors
  supabase/                 # client, generated types
  sync/                     # queue, push, pull, worker
  money.ts
  finance.ts                # the intelligence-engine computations
  dates.ts
stores/                     # Zustand stores
hooks/                      # useExpenses, useBills, useSyncStatus, ...
types/                      # shared TS types (one per entity)
```

---

## 5. Data model

Every table below exists in **both** Supabase (Postgres) and Dexie (IndexedDB)
with the same shape, except `sync_queue` which is Dexie-only. All amounts are
`*_centavos` integers.

### profiles
```
id uuid (pk, = auth user id)
email text
created_at timestamptz
```

### clients (income sources)
```
id uuid pk
user_id uuid
name text
salary_centavos int
salary_frequency  'monthly' | 'biweekly' | 'weekly' | 'custom'
next_pay_date date          -- YYYY-MM-DD
notes text
created_at / updated_at / deleted_at
```

### income_transactions
```
id uuid pk
user_id uuid
client_id uuid
amount_centavos int
received_date date
notes text
created_at / updated_at / deleted_at
```

### expense_categories
```
id uuid pk
user_id uuid
name text
icon text                   -- lucide icon name
created_at / updated_at / deleted_at
```
Seed defaults on first login: Food, Transport, Rent, Utilities, Coffee,
Subscriptions, Entertainment, Health, Shopping.

### expenses
```
id uuid pk
user_id uuid
category_id uuid
amount_centavos int
description text
expense_date date
created_at / updated_at / deleted_at
```

### bills
```
id uuid pk
user_id uuid
name text
amount_centavos int
due_day int                 -- day of month, 1–31
is_recurring boolean
reminder_days_before int    -- e.g. 3
active boolean
created_at / updated_at / deleted_at
```

### bill_payments
```
id uuid pk
user_id uuid
bill_id uuid
amount_centavos int
paid_date date
notes text
created_at / updated_at / deleted_at
```

### budgets
```
id uuid pk
user_id uuid
monthly_limit_centavos int
created_at / updated_at
```

### savings_goals
```
id uuid pk
user_id uuid
name text
target_centavos int
monthly_contribution_centavos int
current_centavos int
created_at / updated_at / deleted_at
```

### sync_queue (Dexie only — never synced)
```
id string (uuid)
action 'create' | 'update' | 'delete'
table string
record_id string            -- the id of the affected row
payload any                 -- full row snapshot for create/update
created_at string
synced boolean
attempts int
```

---

## 6. Sync engine (`lib/sync`)

### Write path (every mutation)
```ts
async function mutate(table, action, row) {
  row.updated_at = new Date().toISOString();
  await db[table].put(row);                 // Dexie write = instant
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    action, table, record_id: row.id,
    payload: row, synced: false, attempts: 0,
    created_at: new Date().toISOString(),
  });
}
```
Wrap reads/writes so the UI only ever touches Dexie. TanStack Query's
`queryFn` reads from Dexie and invalidates on local mutation.

### Push (background worker)
Run on an interval and on `online` events:
```ts
setInterval(syncToSupabase, 30_000);
window.addEventListener("online", syncToSupabase);
```
`syncToSupabase`:
1. Bail if offline (`navigator.onLine === false`) or no session.
2. Pull unsynced queue entries, oldest first.
3. For `create`/`update`: `supabase.from(table).upsert(payload, { onConflict: "id" })`.
4. For `delete`: upsert with `deleted_at` set (soft delete travels as an update).
5. On success mark `synced = true`; on failure increment `attempts`, leave queued
   (retry next tick). Idempotent because PK is client-generated.

### Pull (reconciliation)
On reconnect / app focus: fetch rows per table where
`updated_at > lastPulledAt`, then merge into Dexie applying **last-write-wins**:
keep whichever row has the newer `updated_at`. Store `lastPulledAt` in Zustand +
Dexie meta. (Single user, so conflicts are rare — usually same data, new device.)

### Sync status
Expose `useSyncStatus()` → `{ online, pending: number, lastSyncedAt }`. Surface a
small indicator in the app shell (sage when synced, muted when pending, clay on
repeated failure).

---

## 7. Financial intelligence (`lib/finance.ts`)

Pure functions over centavos. No I/O.

```
monthlyBurnRate      = expensesThisMonth / daysElapsed
projectedMonthEnd    = avgDailySpend * daysInMonth
savingsRate          = savings / income            (guard income > 0)
netCashflow          = income - expenses - bills
```

**Can I Afford This?** (the calculator):
```
remaining       = netCashflow for the period
afterExpense    = remaining - potentialExpense
safe            = afterExpense >= 0  (or above a configurable buffer)
dailyBudget     = afterExpense / daysLeftInMonth
```
Return `{ remaining, afterExpense, safe, dailyBudget }`. UI shows a clear
yes/no verdict (sage = safe, clay = not) and the resulting daily budget.

---

## 8. Notifications & reminders

- **Browser notifications** (client): for bills due, fire at
  `reminder_days_before`, 1 day before, and on the due day. Requires Notification
  permission; request it contextually, not on load.
- **Email reminders** (server): a Supabase Edge Function on a daily Cron job
  queries active bills, computes the next due date, and sends reminders. This is
  the only piece that runs server-side.

---

## 9. PWA (`Serwist`)

```bash
npm i @serwist/next serwist
```
- `app/manifest.ts` → name "CashflowOS", `display: "standalone"`,
  `theme_color: "#0E0F0E"`, `background_color: "#0E0F0E"`, icons (192/512 + maskable).
- `app/sw.ts` → Serwist worker, precache app shell, `runtimeCaching: defaultCache`,
  `skipWaiting`, `clientsClaim`, `navigationPreload`, an `/offline` fallback.
- Wrap `next.config.ts` with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js" })`.
- Disable the SW in dev; test with a production build (`next build && next start`).
- Capabilities target: installable, fullscreen/standalone, offline, push.

---

## 10. Design system

Already built — do not redesign. Tokens live in `app/globals.css`
(Tailwind v4 `@theme inline`, dark-only, muted sage accent).

Use the semantic utilities, not raw colors:
- Surfaces: `bg-background`, `bg-card`, `bg-popover`.
- Money in/out: `text-income`, `text-expense`.
- Bill pills: `bg-status-{upcoming,due,overdue,paid}`.
- Hero numbers: `text-money` / `text-money-lg`, always with `font-mono nums`
  (tabular figures so columns align). Wrap amounts in a `<MoneyValue>` component.
- Charts (Recharts): `var(--color-chart-1..5)` — single-hue green ramp, no rainbow.

Fonts are wired in `app/layout.tsx` via `geist/font` (`GeistSans.variable` +
`GeistMono.variable` on `<html className="dark">`).

---

## 11. Build order

Build vertically: each phase ends with something usable end-to-end (Dexie →
UI → queued sync), not a half-wired layer.

### Phase 0 — Foundation
- Next.js + Tailwind v4 + shadcn init; drop in `globals.css`; wire fonts.
- Dexie schema + all table accessors; `lib/money.ts`, `lib/dates.ts`.
- Supabase project: create tables, **enable RLS** + policies, generate TS types.
- Auth (email + Google + Apple via Supabase). On first login, seed default
  expense categories and a default budget row.
- **Done when:** a logged-in user has an empty, RLS-protected backend and a
  working local DB.

### Phase 1 — Core loop (the MVP)
- Sync engine: write path, queue, push worker, sync indicator.
- Expenses: 3-second quick-add (amount → category → description), list.
- Budget: set monthly limit; show spent / remaining.
- Dashboard v1: summary card (income/expenses/bills/savings/remaining) + quick actions.
- **Done when:** add an expense offline, see it instantly, watch it sync when online.

### Phase 2 — Income
- Clients CRUD (salary, frequency, next pay date); list cards.
- Income transactions; feed real income into the dashboard summary.
- Savings goals with progress.

### Phase 3 — Bills
- Bills CRUD (due day, recurring, reminder days); status states
  (upcoming/due/overdue/paid); bill payments.
- Browser notifications; Edge Function + Cron for email reminders.
- Dashboard "Upcoming" section (salary in N days, rent due in N days).

### Phase 4 — Intelligence
- `lib/finance.ts` metrics; "Can I Afford This?" calculator.
- Analytics: income vs expenses trend, expense breakdown (donut), savings growth
  (line), top categories.
- Pull/reconciliation for multi-device.

### Phase 5 — PWA polish
- Serwist SW, manifest, icons, offline fallback.
- Install flow on iOS; verify offline cold-start works end-to-end.

---

## 12. Working agreement for Claude Code

- Confirm the current phase before starting; don't jump ahead.
- Touch one feature slice at a time, vertically.
- Never bypass the write path — UI mutations go through `lib/sync`, never
  straight to Supabase.
- Keep money in centavos until the display boundary.
- Generate ids with `crypto.randomUUID()`; never let the DB assign them.
- Prefer the semantic Tailwind tokens; don't introduce new colors.
- Surface assumptions inline rather than asking many questions.
