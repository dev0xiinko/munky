// Shared entity types. All `*_centavos` fields are integers.
// Timestamps are ISO 8601 strings; calendar dates are YYYY-MM-DD strings.

export interface Syncable {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type SalaryFrequency = "monthly" | "biweekly" | "weekly" | "custom";

export interface Client extends Syncable {
  name: string;
  salary_centavos: number;
  salary_frequency: SalaryFrequency;
  next_pay_date: string; // YYYY-MM-DD
  notes: string;
}

export interface IncomeTransaction extends Syncable {
  client_id: string;
  amount_centavos: number;
  received_date: string; // YYYY-MM-DD
  notes: string;
}

export interface BillPayment extends Syncable {
  bill_id: string;
  amount_centavos: number;
  paid_date: string; // YYYY-MM-DD
  notes: string;
}

export interface ExpenseCategory extends Syncable {
  name: string;
  key: string; // stable slug, e.g. "food"
  code: string; // 2-letter mono badge, e.g. "Fd"
  icon: string; // lucide icon name (for future use)
}

export interface Expense extends Syncable {
  category_key: string;
  amount_centavos: number;
  description: string;
  expense_date: string; // YYYY-MM-DD
}

export type BillStatus = "upcoming" | "due" | "overdue" | "paid";
export type BillType = "regular" | "loan";

export interface Bill extends Syncable {
  name: string;
  amount_centavos: number; // for loans this is the monthly installment
  due_day: number; // 1–31
  start_date: string; // YYYY-MM-DD; first month the bill is active (billing begins this month)
  is_recurring: boolean; // monthly recurring vs one-time
  bill_type: BillType;
  term_months: number | null; // loan term in months (null for non-loans)
  reminder_days_before: number;
  active: boolean;
  status: BillStatus; // derived/cached display status
  base_status: BillStatus; // status to revert to when un-paid
}

export interface SavingsGoal extends Syncable {
  name: string;
  target_centavos: number;
  monthly_contribution_centavos: number;
  current_centavos: number;
}

export interface SavingsContribution extends Syncable {
  goal_id: string;
  amount_centavos: number;
  contributed_date: string; // YYYY-MM-DD
  notes: string;
}

export interface CategoryBudget {
  key: string;
  limit_centavos: number;
}

export interface Budget extends Syncable {
  monthly_limit_centavos: number;
  category_limits: CategoryBudget[];
}

export type SyncAction = "create" | "update" | "delete";

export interface SyncQueueEntry {
  id: string;
  action: SyncAction;
  table: string;
  record_id: string;
  payload: unknown;
  created_at: string;
  /** 0 = unsynced, 1 = synced. Numeric because IndexedDB can't index booleans. */
  synced: 0 | 1;
  attempts: number;
}
