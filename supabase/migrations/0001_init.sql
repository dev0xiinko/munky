-- CashflowOS schema. Single-user, last-write-wins on updated_at.
-- Column shapes mirror the local Dexie/TS entities so sync payloads upsert 1:1.
-- Every table has RLS: auth.uid() = user_id (profiles keyed on id).

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- clients (income sources) ----------
create table if not exists public.clients (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  salary_centavos integer not null default 0,
  salary_frequency text not null default 'monthly',
  next_pay_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- expense_categories ----------
create table if not exists public.expense_categories (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key text not null,
  code text not null,
  icon text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- expenses ----------
create table if not exists public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_key text not null,
  amount_centavos integer not null default 0,
  description text not null default '',
  expense_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- bills ----------
create table if not exists public.bills (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount_centavos integer not null default 0,
  due_day integer not null,
  is_recurring boolean not null default true,
  reminder_days_before integer not null default 3,
  active boolean not null default true,
  status text not null default 'upcoming',
  base_status text not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- savings_goals ----------
create table if not exists public.savings_goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_centavos integer not null default 0,
  monthly_contribution_centavos integer not null default 0,
  current_centavos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- budgets ----------
create table if not exists public.budgets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  monthly_limit_centavos integer not null default 0,
  category_limits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- indexes for incremental pull (updated_at > lastPulledAt) ----------
create index if not exists clients_user_updated on public.clients (user_id, updated_at);
create index if not exists expenses_user_updated on public.expenses (user_id, updated_at);
create index if not exists categories_user_updated on public.expense_categories (user_id, updated_at);
create index if not exists bills_user_updated on public.bills (user_id, updated_at);
create index if not exists goals_user_updated on public.savings_goals (user_id, updated_at);
create index if not exists budgets_user_updated on public.budgets (user_id, updated_at);

-- ---------- Row-Level Security ----------
alter table public.profiles            enable row level security;
alter table public.clients             enable row level security;
alter table public.expense_categories  enable row level security;
alter table public.expenses            enable row level security;
alter table public.bills               enable row level security;
alter table public.savings_goals       enable row level security;
alter table public.budgets             enable row level security;

-- profiles: owner is the row id
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  using (auth.uid() = id) with check (auth.uid() = id);

-- generic owner policy on every user-scoped table
do $$
declare t text;
begin
  foreach t in array array[
    'clients','expense_categories','expenses','bills','savings_goals','budgets'
  ] loop
    execute format('drop policy if exists "owner_all" on public.%I;', t);
    execute format(
      'create policy "owner_all" on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------- auto-create a profile row on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
