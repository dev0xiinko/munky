-- Dated savings contribution ledger. Lets the dashboard deduct what was
-- actually set aside this month (not just the planned monthly amount).
-- Additive & idempotent; same conventions as the other ledgers.

create table if not exists public.savings_contributions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  amount_centavos integer not null default 0,
  contributed_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists contrib_user_updated on public.savings_contributions (user_id, updated_at);
create index if not exists contrib_goal on public.savings_contributions (goal_id);

alter table public.savings_contributions enable row level security;

drop policy if exists "owner_all" on public.savings_contributions;
create policy "owner_all" on public.savings_contributions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
