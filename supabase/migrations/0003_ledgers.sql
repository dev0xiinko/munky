-- Income + bill payment ledgers. Additive — safe to run on an existing DB.
-- Same conventions as 0001: client-generated uuid PKs, *_centavos integers,
-- RLS auth.uid() = user_id, soft deletes via deleted_at.

-- ---------- income_transactions ----------
create table if not exists public.income_transactions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  amount_centavos integer not null default 0,
  received_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- bill_payments ----------
create table if not exists public.bill_payments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  bill_id uuid not null,
  amount_centavos integer not null default 0,
  paid_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists income_user_updated on public.income_transactions (user_id, updated_at);
create index if not exists income_client on public.income_transactions (client_id);
create index if not exists payments_user_updated on public.bill_payments (user_id, updated_at);
create index if not exists payments_bill on public.bill_payments (bill_id);

alter table public.income_transactions enable row level security;
alter table public.bill_payments       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['income_transactions','bill_payments'] loop
    execute format('drop policy if exists "owner_all" on public.%I;', t);
    execute format(
      'create policy "owner_all" on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
