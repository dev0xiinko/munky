-- Income sources gain a pay schedule so income can ACCRUE on paydays instead of
-- being projected in full immediately. `pay_day` = day-of-month for monthly
-- sources; `start_date` = the month the source becomes active (also the anchor
-- for every-2-weeks). Additive & idempotent.

alter table public.clients
  add column if not exists pay_day integer not null default 30;

alter table public.clients
  add column if not exists start_date date;

-- Existing sources: treat as active from the start of their creation month so
-- this month's paydays accrue normally.
update public.clients
  set start_date = date_trunc('month', coalesce(next_pay_date, created_at))::date
  where start_date is null;
