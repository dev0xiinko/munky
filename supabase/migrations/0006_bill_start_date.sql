-- Add start_date to bills (the month a bill's billing begins). The local Dexie
-- store (v6) and the Bill TS type already carry this field, and addBill/seed
-- write it — but the Postgres column was never created. Without it every bill
-- upsert fails with PostgREST "column not found" (PGRST204), so bills never
-- sync. Additive & idempotent — safe to run on an existing DB.

alter table public.bills
  add column if not exists start_date date;

-- Backfill existing rows to their creation date so they stay active from when
-- they were created (mirrors the Dexie v6 upgrade).
update public.bills
  set start_date = created_at::date
  where start_date is null;
