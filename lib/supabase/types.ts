// Hand-authored Supabase schema types mirroring supabase/migrations/0001_init.sql.
// Regenerate later with:
//   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
import type {
  Bill,
  BillPayment,
  Budget,
  Client,
  Expense,
  ExpenseCategory,
  IncomeTransaction,
  SavingsContribution,
  SavingsGoal,
} from "@/types";

type Table<Row> = {
  Row: Row;
  Insert: Row;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      clients: Table<Client>;
      expenses: Table<Expense>;
      expense_categories: Table<ExpenseCategory>;
      bills: Table<Bill>;
      bill_payments: Table<BillPayment>;
      income_transactions: Table<IncomeTransaction>;
      savings_contributions: Table<SavingsContribution>;
      savings_goals: Table<SavingsGoal>;
      budgets: Table<Budget>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
