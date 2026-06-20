-- Add bill type (regular | loan) and loan term to bills. Additive & idempotent.
-- is_recurring already exists (0001) and now means "monthly recurring vs one-time".

alter table public.bills
  add column if not exists bill_type text not null default 'regular';

alter table public.bills
  add column if not exists term_months integer;
